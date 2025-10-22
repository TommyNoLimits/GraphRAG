#!/usr/bin/env ts-node

/**
 * Fix Entity-Fund Relationships Based on Subscriptions
 * 
 * This script creates entity-fund relationships based on actual subscription data
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function fixEntityFundRelationships() {
  console.log('🔧 Fixing Entity-Fund Relationships Based on Subscriptions...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Remove all existing INVESTED_IN relationships
      console.log('🗑️ Removing existing INVESTED_IN relationships...');
      await session.run('MATCH ()-[r:INVESTED_IN]->() DELETE r');
      console.log('✅ Existing INVESTED_IN relationships removed\n');
      
      // 2. Create Entity -> Fund relationships based on subscription data
      console.log('🏛️ Creating Entity -> Fund relationships based on subscriptions...');
      const entityFundQuery = `
        MATCH (ue:UserEntity), (uf:UserFund), (s:Subscription)
        WHERE ue.tenant_id = s.tenant_id 
          AND uf.tenant_id = s.tenant_id
          AND ue.investment_entity = s.investment_entity
          AND uf.fund_name = s.fund_name
        MERGE (ue)-[:INVESTED_IN {created_at: datetime()}]->(uf)
        RETURN count(DISTINCT ue.id + '-' + uf.id) as created
      `;
      
      const entityFundResult = await session.run(entityFundQuery);
      const entityFundCount = entityFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityFundCount} Entity->Fund relationships based on subscriptions\n`);
      
      // 3. Show the corrected relationships
      console.log('🔍 Corrected Entity-Fund Relationships:');
      const correctedQuery = `
        MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
        RETURN ue.investment_entity, uf.fund_name, ue.tenant_id, count(*) as count
        ORDER BY count DESC
        LIMIT 15
      `;
      
      const correctedResult = await session.run(correctedQuery);
      correctedResult.records.forEach((record: any) => {
        const entityName = record.get('ue.investment_entity');
        const fundName = record.get('uf.fund_name');
        const tenantId = record.get('ue.tenant_id');
        const count = record.get('count');
        console.log(`   ${entityName} -> ${fundName} (${tenantId}): ${count}`);
      });
      
      // 4. Show subscription coverage
      console.log('\n📊 Subscription Coverage:');
      const coverageQuery = `
        MATCH (s:Subscription)
        OPTIONAL MATCH (ue:UserEntity), (uf:UserFund)
        WHERE ue.tenant_id = s.tenant_id 
          AND uf.tenant_id = s.tenant_id
          AND ue.investment_entity = s.investment_entity
          AND uf.fund_name = s.fund_name
          AND (ue)-[:INVESTED_IN]->(uf)
        WITH s, count(ue) as entity_fund_exists
        RETURN 
          count(s) as total_subscriptions,
          count(CASE WHEN entity_fund_exists > 0 THEN s END) as covered_subscriptions,
          count(CASE WHEN entity_fund_exists = 0 THEN s END) as orphaned_subscriptions
      `;
      
      const coverageResult = await session.run(coverageQuery);
      const totalSubs = coverageResult.records[0].get('total_subscriptions');
      const coveredSubs = coverageResult.records[0].get('covered_subscriptions');
      const orphanedSubs = coverageResult.records[0].get('orphaned_subscriptions');
      
      console.log(`   Total subscriptions: ${totalSubs}`);
      console.log(`   Covered by entity-fund relationships: ${coveredSubs}`);
      console.log(`   Orphaned subscriptions: ${orphanedSubs}`);
      console.log(`   Coverage: ${((Number(coveredSubs) / Number(totalSubs)) * 100).toFixed(1)}%`);
      
      // 5. Show sample complete flows
      console.log('\n📋 Sample Complete Flows:');
      const flowQuery = `
        MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        RETURN u.email, t.id, ue.investment_entity, uf.fund_name, count(s) as subscriptions
        ORDER BY subscriptions DESC
        LIMIT 10
      `;
      
      const flowResult = await session.run(flowQuery);
      flowResult.records.forEach((record: any) => {
        const userEmail = record.get('u.email');
        const tenantId = record.get('t.id');
        const entityName = record.get('ue.investment_entity');
        const fundName = record.get('uf.fund_name');
        const subscriptions = record.get('subscriptions');
        console.log(`   ${userEmail} -> ${tenantId} -> ${entityName} -> ${fundName} (${subscriptions} subs)`);
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error fixing relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the fix
fixEntityFundRelationships().catch(console.error);
