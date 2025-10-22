#!/usr/bin/env ts-node

/**
 * Analyze Funds Without Subscriptions
 * 
 * This script analyzes funds that don't have subscriptions and suggests solutions
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeFundsWithoutSubscriptions() {
  console.log('🔍 Analyzing Funds Without Subscriptions...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Find funds without subscriptions
      console.log('💰 Funds Without Subscriptions:');
      const fundsWithoutSubsQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        RETURN uf.fund_name, uf.tenant_id, uf.stage, uf.investment_type, uf.fund_type
        ORDER BY uf.fund_name
        LIMIT 20
      `;
      
      const fundsWithoutSubsResult = await session.run(fundsWithoutSubsQuery);
      console.log(`   Found ${fundsWithoutSubsResult.records.length} funds without subscriptions:`);
      fundsWithoutSubsResult.records.forEach((record: any) => {
        const fundName = record.get('uf.fund_name');
        const tenantId = record.get('uf.tenant_id');
        const stage = record.get('uf.stage');
        const investmentType = record.get('uf.investment_type');
        const fundType = record.get('uf.fund_type');
        console.log(`   ${fundName} (${tenantId}) - Stage: ${stage}, Type: ${investmentType}, Fund Type: ${fundType}`);
      });
      
      // 2. Count total funds vs funds with subscriptions
      console.log('\n📊 Fund Statistics:');
      const fundStatsQuery = `
        MATCH (uf:UserFund)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        WITH uf, count(s) as subscription_count
        RETURN 
          count(uf) as total_funds,
          count(CASE WHEN subscription_count > 0 THEN uf END) as funds_with_subscriptions,
          count(CASE WHEN subscription_count = 0 THEN uf END) as funds_without_subscriptions
      `;
      
      const fundStatsResult = await session.run(fundStatsQuery);
      const totalFunds = fundStatsResult.records[0].get('total_funds');
      const fundsWithSubs = fundStatsResult.records[0].get('funds_with_subscriptions');
      const fundsWithoutSubs = fundStatsResult.records[0].get('funds_without_subscriptions');
      
      console.log(`   Total funds: ${totalFunds}`);
      console.log(`   Funds with subscriptions: ${fundsWithSubs}`);
      console.log(`   Funds without subscriptions: ${fundsWithoutSubs}`);
      console.log(`   Coverage: ${((Number(fundsWithSubs) / Number(totalFunds)) * 100).toFixed(1)}%`);
      
      // 3. Check if funds without subscriptions have entity relationships
      console.log('\n🔗 Funds Without Subscriptions - Entity Relationships:');
      const fundsWithoutSubsEntityQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        OPTIONAL MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf)
        RETURN uf.fund_name, uf.tenant_id, count(ue) as entity_relationships
        ORDER BY entity_relationships DESC
        LIMIT 15
      `;
      
      const fundsWithoutSubsEntityResult = await session.run(fundsWithoutSubsEntityQuery);
      fundsWithoutSubsEntityResult.records.forEach((record: any) => {
        const fundName = record.get('uf.fund_name');
        const tenantId = record.get('uf.tenant_id');
        const entityRels = record.get('entity_relationships');
        console.log(`   ${fundName} (${tenantId}): ${entityRels} entity relationships`);
      });
      
      // 4. Check fund stages for funds without subscriptions
      console.log('\n📈 Fund Stages for Funds Without Subscriptions:');
      const fundStagesQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        RETURN uf.stage, count(*) as count
        ORDER BY count DESC
      `;
      
      const fundStagesResult = await session.run(fundStagesQuery);
      fundStagesResult.records.forEach((record: any) => {
        const stage = record.get('uf.stage') || 'No Stage';
        const count = record.get('count');
        console.log(`   ${stage}: ${count} funds`);
      });
      
      // 5. Show sample funds that are completely isolated
      console.log('\n⚠️  Completely Isolated Funds (no subscriptions, no entity relationships):');
      const isolatedFundsQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        AND NOT EXISTS {
          MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf)
        }
        RETURN uf.fund_name, uf.tenant_id, uf.stage
        ORDER BY uf.fund_name
        LIMIT 10
      `;
      
      const isolatedFundsResult = await session.run(isolatedFundsQuery);
      if (isolatedFundsResult.records.length > 0) {
        console.log(`   Found ${isolatedFundsResult.records.length} completely isolated funds:`);
        isolatedFundsResult.records.forEach((record: any) => {
          const fundName = record.get('uf.fund_name');
          const tenantId = record.get('uf.tenant_id');
          const stage = record.get('uf.stage');
          console.log(`   ${fundName} (${tenantId}) - Stage: ${stage}`);
        });
      } else {
        console.log('   No completely isolated funds found!');
      }
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error analyzing funds:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the analysis
analyzeFundsWithoutSubscriptions().catch(console.error);
