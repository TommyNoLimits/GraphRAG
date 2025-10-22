#!/usr/bin/env ts-node

/**
 * Create Tenant -> Fund INTEREST Relationships
 * 
 * This script creates INTEREST relationships from tenants to funds
 * that don't have subscriptions (representing investment opportunities)
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function createTenantFundInterestRelationships() {
  console.log('🔧 Creating Tenant -> Fund INTEREST Relationships...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Create INTEREST relationships for funds without subscriptions
      console.log('💡 Creating INTEREST relationships for funds without subscriptions...');
      const interestQuery = `
        MATCH (t:Tenant), (uf:UserFund)
        WHERE t.id = uf.tenant_id
        AND NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        MERGE (t)-[:INTEREST {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const interestResult = await session.run(interestQuery);
      const interestCount = interestResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${interestCount} Tenant->Fund INTEREST relationships\n`);
      
      // 2. Show funds by stage with their relationship types
      console.log('📊 Funds by Stage and Relationship Type:');
      const fundsByStageQuery = `
        MATCH (uf:UserFund)
        OPTIONAL MATCH (t:Tenant)-[:INTEREST]->(uf)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        RETURN uf.stage,
               count(uf) as total_funds,
               count(t) as funds_with_interest,
               count(s) as funds_with_subscriptions
        ORDER BY total_funds DESC
      `;
      
      const fundsByStageResult = await session.run(fundsByStageQuery);
      fundsByStageResult.records.forEach((record: any) => {
        const stage = record.get('uf.stage') || 'No Stage';
        const totalFunds = record.get('total_funds');
        const withInterest = record.get('funds_with_interest');
        const withSubscriptions = record.get('funds_with_subscriptions');
        console.log(`   ${stage}: ${totalFunds} funds (${withInterest} interest, ${withSubscriptions} subscriptions)`);
      });
      
      // 3. Show sample funds with INTEREST relationships
      console.log('\n💡 Sample Funds with INTEREST Relationships:');
      const sampleInterestQuery = `
        MATCH (t:Tenant)-[:INTEREST]->(uf:UserFund)
        RETURN t.id as tenant_id, 
               uf.fund_name, 
               uf.stage,
               count(*) as count
        ORDER BY uf.stage, uf.fund_name
        LIMIT 15
      `;
      
      const sampleInterestResult = await session.run(sampleInterestQuery);
      sampleInterestResult.records.forEach((record: any) => {
        const tenantId = record.get('tenant_id');
        const fundName = record.get('uf.fund_name');
        const stage = record.get('uf.stage') || 'No Stage';
        console.log(`   ${tenantId} -[:INTEREST]-> ${fundName} (${stage})`);
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
      
      // 5. Show investment pipeline by tenant
      console.log('\n📈 Investment Pipeline by Tenant:');
      const pipelineQuery = `
        MATCH (t:Tenant)
        OPTIONAL MATCH (t)-[:INTEREST]->(uf_interest:UserFund)
        OPTIONAL MATCH (t)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf_invested:UserFund)
        RETURN t.id as tenant_id,
               count(DISTINCT uf_interest) as funds_of_interest,
               count(DISTINCT uf_invested) as funds_invested_in,
               count(DISTINCT ue) as entities_managed
        ORDER BY funds_of_interest DESC
        LIMIT 10
      `;
      
      const pipelineResult = await session.run(pipelineQuery);
      pipelineResult.records.forEach((record: any) => {
        const tenantId = record.get('tenant_id');
        const fundsOfInterest = record.get('funds_of_interest');
        const fundsInvestedIn = record.get('funds_invested_in');
        const entitiesManaged = record.get('entities_managed');
        console.log(`   ${tenantId}: ${fundsOfInterest} funds of interest, ${fundsInvestedIn} funds invested in, ${entitiesManaged} entities`);
      });
      
      // 6. Show sample complete flows
      console.log('\n📋 Sample Complete Investment Flows:');
      const flowQuery = `
        MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        RETURN u.email, t.id, ue.investment_entity, uf.fund_name, count(s) as subscriptions
        ORDER BY subscriptions DESC
        LIMIT 5
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
      
      console.log('\n🎉 INTEREST relationships created successfully!');
      console.log('   - Tenants now have INTEREST in funds they\'re tracking');
      console.log('   - Funds with subscriptions represent actual investments');
      console.log('   - Funds with INTEREST represent investment opportunities');
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error creating INTEREST relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the script
createTenantFundInterestRelationships().catch(console.error);
