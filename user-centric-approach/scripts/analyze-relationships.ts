#!/usr/bin/env ts-node

/**
 * Analyze Entity-Fund Relationships
 * 
 * This script analyzes how entities and funds should be connected
 * based on the subscription data
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeEntityFundRelationships() {
  console.log('🔍 Analyzing Entity-Fund Relationships...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Check subscription data to understand entity-fund relationships
      console.log('📋 Subscription Data Analysis:');
      const subscriptionQuery = `
        MATCH (s:Subscription)
        RETURN s.fund_name, s.investment_entity, s.tenant_id, count(*) as count
        ORDER BY count DESC
        LIMIT 20
      `;
      
      const subscriptionResult = await session.run(subscriptionQuery);
      console.log('   Top subscription combinations:');
      subscriptionResult.records.forEach((record: any) => {
        const fundName = record.get('s.fund_name');
        const entityName = record.get('s.investment_entity');
        const tenantId = record.get('s.tenant_id');
        const count = record.get('count');
        console.log(`   ${entityName} -> ${fundName} (${tenantId}): ${count} subscriptions`);
      });
      
      // 2. Check current entity-fund relationships
      console.log('\n🔗 Current Entity-Fund Relationships:');
      const currentRelationsQuery = `
        MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
        RETURN ue.investment_entity, uf.fund_name, ue.tenant_id, count(*) as count
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const currentRelationsResult = await session.run(currentRelationsQuery);
      console.log('   Current relationships:');
      currentRelationsResult.records.forEach((record: any) => {
        const entityName = record.get('ue.investment_entity');
        const fundName = record.get('uf.fund_name');
        const tenantId = record.get('ue.tenant_id');
        const count = record.get('count');
        console.log(`   ${entityName} -> ${fundName} (${tenantId}): ${count}`);
      });
      
      // 3. Check if subscription data matches entity-fund relationships
      console.log('\n🔍 Subscription vs Entity-Fund Matching:');
      const matchingQuery = `
        MATCH (ue:UserEntity), (uf:UserFund), (s:Subscription)
        WHERE ue.tenant_id = s.tenant_id 
          AND uf.tenant_id = s.tenant_id
          AND ue.investment_entity = s.investment_entity
          AND uf.fund_name = s.fund_name
        RETURN ue.investment_entity, uf.fund_name, s.tenant_id, count(*) as matches
        ORDER BY matches DESC
        LIMIT 10
      `;
      
      const matchingResult = await session.run(matchingQuery);
      console.log('   Subscription-based matches:');
      matchingResult.records.forEach((record: any) => {
        const entityName = record.get('ue.investment_entity');
        const fundName = record.get('uf.fund_name');
        const tenantId = record.get('s.tenant_id');
        const matches = record.get('matches');
        console.log(`   ${entityName} -> ${fundName} (${tenantId}): ${matches} matches`);
      });
      
      // 4. Check for orphaned subscriptions (no matching entity-fund relationship)
      console.log('\n⚠️  Orphaned Subscriptions:');
      const orphanedQuery = `
        MATCH (s:Subscription)
        WHERE NOT EXISTS {
          MATCH (ue:UserEntity), (uf:UserFund)
          WHERE ue.tenant_id = s.tenant_id 
            AND uf.tenant_id = s.tenant_id
            AND ue.investment_entity = s.investment_entity
            AND uf.fund_name = s.fund_name
            AND (ue)-[:INVESTED_IN]->(uf)
        }
        RETURN s.investment_entity, s.fund_name, s.tenant_id, count(*) as orphaned
        ORDER BY orphaned DESC
        LIMIT 10
      `;
      
      const orphanedResult = await session.run(orphanedQuery);
      console.log('   Subscriptions without entity-fund relationships:');
      orphanedResult.records.forEach((record: any) => {
        const entityName = record.get('s.investment_entity');
        const fundName = record.get('s.fund_name');
        const tenantId = record.get('s.tenant_id');
        const orphaned = record.get('orphaned');
        console.log(`   ${entityName} -> ${fundName} (${tenantId}): ${orphaned} orphaned`);
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error analyzing relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the analysis
analyzeEntityFundRelationships().catch(console.error);
