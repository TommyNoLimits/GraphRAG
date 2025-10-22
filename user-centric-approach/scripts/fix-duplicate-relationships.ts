#!/usr/bin/env ts-node
/**
 * Fix Duplicate Relationships
 * 
 * This script removes duplicate relationships and ensures each relationship
 * exists only once between any two nodes.
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function fixDuplicateRelationships() {
  console.log('🔧 Fixing Duplicate Relationships...');
  const neo4jConnection = new Neo4jConnection();

  try {
    await neo4jConnection.connect();
    const session = neo4jConnection['driver']!.session({ database: 'neo4j' });

    try {
      // 1. Remove duplicate Fund -> Subscription relationships
      console.log('💰 Removing duplicate Fund->Subscription relationships...');
      const fundSubDupQuery = `
        MATCH (uf:UserFund)-[r:HAS_SUBSCRIPTION]->(s:Subscription)
        WITH uf, s, collect(r) as relationships
        WHERE size(relationships) > 1
        WITH uf, s, relationships[1..] as duplicates
        UNWIND duplicates as dup_rel
        DELETE dup_rel
        RETURN count(dup_rel) as removed_count
      `;
      
      const fundSubDupResult = await session.run(fundSubDupQuery);
      const fundSubRemoved = fundSubDupResult.records[0]?.get('removed_count').toNumber() || 0;
      console.log(`✅ Removed ${fundSubRemoved} duplicate Fund->Subscription relationships`);

      // 2. Remove duplicate Entity -> Subscription relationships
      console.log('🏛️ Removing duplicate Entity->Subscription relationships...');
      const entitySubDupQuery = `
        MATCH (ue:UserEntity)-[r:HAS_SUBSCRIPTION]->(s:Subscription)
        WITH ue, s, collect(r) as relationships
        WHERE size(relationships) > 1
        WITH ue, s, relationships[1..] as duplicates
        UNWIND duplicates as dup_rel
        DELETE dup_rel
        RETURN count(dup_rel) as removed_count
      `;
      
      const entitySubDupResult = await session.run(entitySubDupQuery);
      const entitySubRemoved = entitySubDupResult.records[0]?.get('removed_count').toNumber() || 0;
      console.log(`✅ Removed ${entitySubRemoved} duplicate Entity->Subscription relationships`);

      // 3. Remove duplicate Entity -> Fund relationships
      console.log('🏛️ Removing duplicate Entity->Fund relationships...');
      const entityFundDupQuery = `
        MATCH (ue:UserEntity)-[r:INVESTED_IN]->(uf:UserFund)
        WITH ue, uf, collect(r) as relationships
        WHERE size(relationships) > 1
        WITH ue, uf, relationships[1..] as duplicates
        UNWIND duplicates as dup_rel
        DELETE dup_rel
        RETURN count(dup_rel) as removed_count
      `;
      
      const entityFundDupResult = await session.run(entityFundDupQuery);
      const entityFundRemoved = entityFundDupResult.records[0]?.get('removed_count').toNumber() || 0;
      console.log(`✅ Removed ${entityFundRemoved} duplicate Entity->Fund relationships`);

      // 4. Remove duplicate Tenant -> Fund INTEREST relationships
      console.log('💡 Removing duplicate Tenant->Fund INTEREST relationships...');
      const interestDupQuery = `
        MATCH (t:Tenant)-[r:INTEREST]->(uf:UserFund)
        WITH t, uf, collect(r) as relationships
        WHERE size(relationships) > 1
        WITH t, uf, relationships[1..] as duplicates
        UNWIND duplicates as dup_rel
        DELETE dup_rel
        RETURN count(dup_rel) as removed_count
      `;
      
      const interestDupResult = await session.run(interestDupQuery);
      const interestRemoved = interestDupResult.records[0]?.get('removed_count').toNumber() || 0;
      console.log(`✅ Removed ${interestRemoved} duplicate Tenant->Fund INTEREST relationships`);

      const totalRemoved = fundSubRemoved + entitySubRemoved + entityFundRemoved + interestRemoved;
      console.log(`\n📊 Total duplicate relationships removed: ${totalRemoved}`);

      // 5. Verify no more duplicates exist
      console.log('\n🔍 Verifying no duplicates remain...');
      const verifyQuery = `
        MATCH (n)-[r]->(m)
        WITH n, m, type(r) as rel_type, count(r) as rel_count
        WHERE rel_count > 1
        RETURN labels(n)[0] as from_type, rel_type, labels(m)[0] as to_type, rel_count
        ORDER BY rel_count DESC
        LIMIT 10
      `;
      
      const verifyResult = await session.run(verifyQuery);
      if (verifyResult.records.length === 0) {
        console.log('✅ No duplicate relationships found!');
      } else {
        console.log('⚠️  Still found duplicates:');
        verifyResult.records.forEach((record: any) => {
          const fromType = record.get('from_type');
          const relType = record.get('rel_type');
          const toType = record.get('to_type');
          const count = record.get('rel_count').toNumber();
          console.log(`   ${fromType} -[:${relType}]-> ${toType}: ${count} relationships`);
        });
      }

      // 6. Show final relationship counts
      console.log('\n📊 Final Relationship Counts:');
      const finalCountsQuery = `
        MATCH ()-[r]->()
        RETURN type(r) as relationship_type, count(r) as count
        ORDER BY count DESC
      `;
      
      const finalCountsResult = await session.run(finalCountsQuery);
      finalCountsResult.records.forEach((record: any) => {
        const relType = record.get('relationship_type');
        const count = record.get('count').toNumber();
        console.log(`   ${relType}: ${count}`);
      });

    } finally {
      await session.close();
    }
  } catch (error: any) {
    console.error('❌ Error fixing duplicate relationships:', error.message);
  } finally {
    await neo4jConnection.close();
  }
}

if (require.main === module) {
  fixDuplicateRelationships();
}
