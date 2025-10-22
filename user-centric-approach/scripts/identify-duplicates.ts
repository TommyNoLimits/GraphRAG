#!/usr/bin/env ts-node
/**
 * Identify Specific Duplicate Relationships
 * 
 * This script shows exactly which nodes have duplicate relationships
 * so you can investigate why they're occurring.
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function identifyDuplicates() {
  console.log('🔍 Identifying Specific Duplicate Relationships...');
  const neo4jConnection = new Neo4jConnection();

  try {
    await neo4jConnection.connect();
    const session = neo4jConnection['driver']!.session({ database: 'neo4j' });

    try {
      // 1. Find specific Fund -> Subscription duplicates
      console.log('\n💰 Fund -> Subscription Duplicates:');
      const fundSubDupQuery = `
        MATCH (uf:UserFund)-[r:HAS_SUBSCRIPTION]->(s:Subscription)
        WITH uf, s, collect(r) as relationships
        WHERE size(relationships) > 1
        RETURN uf.fund_name, uf.tenant_id, s.fund_name, s.investment_entity, s.tenant_id, size(relationships) as duplicate_count
        ORDER BY duplicate_count DESC, uf.fund_name
        LIMIT 10
      `;
      
      const fundSubDupResult = await session.run(fundSubDupQuery);
      fundSubDupResult.records.forEach((record: any) => {
        console.log(`   Fund: "${record.get('uf.fund_name')}" (${record.get('uf.tenant_id')})`);
        console.log(`   -> Subscription: "${record.get('s.fund_name')}" | Entity: "${record.get('s.investment_entity')}" (${record.get('s.tenant_id')})`);
        console.log(`   Duplicates: ${record.get('duplicate_count')}`);
        console.log('   ---');
      });

      // 2. Find specific Entity -> Subscription duplicates
      console.log('\n🏛️ Entity -> Subscription Duplicates:');
      const entitySubDupQuery = `
        MATCH (ue:UserEntity)-[r:HAS_SUBSCRIPTION]->(s:Subscription)
        WITH ue, s, collect(r) as relationships
        WHERE size(relationships) > 1
        RETURN ue.investment_entity, ue.tenant_id, s.fund_name, s.investment_entity, s.tenant_id, size(relationships) as duplicate_count
        ORDER BY duplicate_count DESC, ue.investment_entity
        LIMIT 10
      `;
      
      const entitySubDupResult = await session.run(entitySubDupQuery);
      entitySubDupResult.records.forEach((record: any) => {
        console.log(`   Entity: "${record.get('ue.investment_entity')}" (${record.get('ue.tenant_id')})`);
        console.log(`   -> Subscription: "${record.get('s.fund_name')}" | Entity: "${record.get('s.investment_entity')}" (${record.get('s.tenant_id')})`);
        console.log(`   Duplicates: ${record.get('duplicate_count')}`);
        console.log('   ---');
      });

      // 3. Find specific Entity -> Fund duplicates
      console.log('\n🏛️ Entity -> Fund Duplicates:');
      const entityFundDupQuery = `
        MATCH (ue:UserEntity)-[r:INVESTED_IN]->(uf:UserFund)
        WITH ue, uf, collect(r) as relationships
        WHERE size(relationships) > 1
        RETURN ue.investment_entity, ue.tenant_id, uf.fund_name, uf.tenant_id, size(relationships) as duplicate_count
        ORDER BY duplicate_count DESC, ue.investment_entity
        LIMIT 10
      `;
      
      const entityFundDupResult = await session.run(entityFundDupQuery);
      entityFundDupResult.records.forEach((record: any) => {
        console.log(`   Entity: "${record.get('ue.investment_entity')}" (${record.get('ue.tenant_id')})`);
        console.log(`   -> Fund: "${record.get('uf.fund_name')}" (${record.get('uf.tenant_id')})`);
        console.log(`   Duplicates: ${record.get('duplicate_count')}`);
        console.log('   ---');
      });

      // 4. Find specific Tenant -> Fund INTEREST duplicates
      console.log('\n💡 Tenant -> Fund INTEREST Duplicates:');
      const interestDupQuery = `
        MATCH (t:Tenant)-[r:INTEREST]->(uf:UserFund)
        WITH t, uf, collect(r) as relationships
        WHERE size(relationships) > 1
        RETURN t.id, t.name, uf.fund_name, uf.tenant_id, size(relationships) as duplicate_count
        ORDER BY duplicate_count DESC, t.id
        LIMIT 10
      `;
      
      const interestDupResult = await session.run(interestDupQuery);
      interestDupResult.records.forEach((record: any) => {
        console.log(`   Tenant: "${record.get('t.name') || 'Unnamed'}" (${record.get('t.id')})`);
        console.log(`   -> Fund: "${record.get('uf.fund_name')}" (${record.get('uf.tenant_id')})`);
        console.log(`   Duplicates: ${record.get('duplicate_count')}`);
        console.log('   ---');
      });

      // 5. Check for potential data issues
      console.log('\n🔍 Potential Data Issues:');
      
      // Check for subscriptions with same fund_name but different entities
      const subscriptionIssueQuery = `
        MATCH (s:Subscription)
        WITH s.fund_name as fund_name, s.tenant_id as tenant_id, collect(DISTINCT s.investment_entity) as entities
        WHERE size(entities) > 1
        RETURN fund_name, tenant_id, entities
        LIMIT 5
      `;
      
      const subscriptionIssueResult = await session.run(subscriptionIssueQuery);
      if (subscriptionIssueResult.records.length > 0) {
        console.log('   📋 Subscriptions with same fund_name but different entities:');
        subscriptionIssueResult.records.forEach((record: any) => {
          console.log(`   Fund: "${record.get('fund_name')}" (${record.get('tenant_id')})`);
          console.log(`   Entities: ${JSON.stringify(record.get('entities'))}`);
          console.log('   ---');
        });
      }

      // Check for entities with same name but different IDs
      const entityIssueQuery = `
        MATCH (ue:UserEntity)
        WITH ue.investment_entity as entity_name, ue.tenant_id as tenant_id, collect(DISTINCT ue.id) as entity_ids
        WHERE size(entity_ids) > 1
        RETURN entity_name, tenant_id, entity_ids
        LIMIT 5
      `;
      
      const entityIssueResult = await session.run(entityIssueQuery);
      if (entityIssueResult.records.length > 0) {
        console.log('   🏛️ Entities with same name but different IDs:');
        entityIssueResult.records.forEach((record: any) => {
          console.log(`   Entity: "${record.get('entity_name')}" (${record.get('tenant_id')})`);
          console.log(`   IDs: ${JSON.stringify(record.get('entity_ids'))}`);
          console.log('   ---');
        });
      }

    } finally {
      await session.close();
    }
  } catch (error: any) {
    console.error('❌ Error identifying duplicates:', error.message);
  } finally {
    await neo4jConnection.close();
  }
}

if (require.main === module) {
  identifyDuplicates();
}
