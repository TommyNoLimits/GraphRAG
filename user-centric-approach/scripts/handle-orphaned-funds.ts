#!/usr/bin/env ts-node

/**
 * Handle Funds Without Subscriptions
 * 
 * This script creates proper relationships for funds without subscriptions
 * by connecting them to their tenants as available opportunities
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function handleFundsWithoutSubscriptions() {
  console.log('🔧 Handling Funds Without Subscriptions...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Ensure all funds are connected to their tenants
      console.log('🏢 Ensuring all funds are connected to tenants...');
      const tenantFundQuery = `
        MATCH (uf:UserFund), (t:Tenant)
        WHERE uf.tenant_id = t.id
        AND NOT EXISTS {
          MATCH (t)-[:MANAGES]->(uf)
        }
        MERGE (t)-[:MANAGES {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const tenantFundResult = await session.run(tenantFundQuery);
      const tenantFundCount = tenantFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${tenantFundCount} Tenant->Fund relationships\n`);
      
      // 2. Show funds by stage and their relationship status
      console.log('📊 Funds Without Subscriptions by Stage:');
      const fundsByStageQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        OPTIONAL MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf)
        RETURN uf.stage, 
               count(uf) as total_funds,
               count(ue) as funds_with_entity_relationships,
               count(uf) - count(ue) as funds_without_entity_relationships
        ORDER BY total_funds DESC
      `;
      
      const fundsByStageResult = await session.run(fundsByStageQuery);
      fundsByStageResult.records.forEach((record: any) => {
        const stage = record.get('uf.stage') || 'No Stage';
        const totalFunds = record.get('total_funds');
        const withEntityRels = record.get('funds_with_entity_relationships');
        const withoutEntityRels = record.get('funds_without_entity_relationships');
        console.log(`   ${stage}: ${totalFunds} funds (${withEntityRels} with entity rels, ${withoutEntityRels} without)`);
      });
      
      // 3. Show sample funds without subscriptions by stage
      console.log('\n📋 Sample Funds Without Subscriptions:');
      const sampleFundsQuery = `
        MATCH (uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        OPTIONAL MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf)
        RETURN uf.fund_name, uf.stage, uf.tenant_id, count(ue) as entity_relationships
        ORDER BY uf.stage, uf.fund_name
        LIMIT 15
      `;
      
      const sampleFundsResult = await session.run(sampleFundsQuery);
      sampleFundsResult.records.forEach((record: any) => {
        const fundName = record.get('uf.fund_name');
        const stage = record.get('uf.stage') || 'No Stage';
        const tenantId = record.get('uf.tenant_id');
        const entityRels = record.get('entity_relationships');
        console.log(`   ${fundName} (${stage}) - ${entityRels} entity relationships`);
      });
      
      // 4. Show the complete relationship structure
      console.log('\n🔗 Complete Relationship Structure:');
      const structureQuery = `
        MATCH (n)-[r]->(m)
        RETURN labels(n)[0] as from_type, 
               type(r) as relationship_type,
               labels(m)[0] as to_type,
               count(*) as count
        ORDER BY from_type, relationship_type
      `;
      
      const structureResult = await session.run(structureQuery);
      structureResult.records.forEach((record: any) => {
        const fromType = record.get('from_type');
        const relType = record.get('relationship_type');
        const toType = record.get('to_type');
        const count = record.get('count');
        console.log(`   ${fromType} -[:${relType}]-> ${toType}: ${count}`);
      });
      
      // 5. Show investment opportunities (funds without subscriptions)
      console.log('\n💡 Investment Opportunities (Funds Without Subscriptions):');
      const opportunitiesQuery = `
        MATCH (t:Tenant)-[:MANAGES]->(uf:UserFund)
        WHERE NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        RETURN t.id as tenant_id, 
               count(uf) as available_funds,
               collect(uf.fund_name)[0..3] as sample_funds
        ORDER BY available_funds DESC
        LIMIT 10
      `;
      
      const opportunitiesResult = await session.run(opportunitiesQuery);
      opportunitiesResult.records.forEach((record: any) => {
        const tenantId = record.get('tenant_id');
        const availableFunds = record.get('available_funds');
        const sampleFunds = record.get('sample_funds');
        console.log(`   ${tenantId}: ${availableFunds} available funds (e.g., ${sampleFunds.join(', ')})`);
      });
      
      console.log('\n✅ Funds without subscriptions are now properly connected as investment opportunities!');
      console.log('   - All funds are connected to their tenants via MANAGES relationships');
      console.log('   - Funds without subscriptions represent available investment opportunities');
      console.log('   - Funds with subscriptions represent actual investments');
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error handling funds:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the handler
handleFundsWithoutSubscriptions().catch(console.error);
