#!/usr/bin/env ts-node

/**
 * Fix Relationship Directions and Types
 * 
 * This script creates the correct relationship flow:
 * - User -> Tenant (BELONGS_TO)
 * - Tenant -> Entity (MANAGES)
 * - Entity -> Fund (INVESTED_IN)
 * - Fund -> Subscription (HAS_SUBSCRIPTION)
 * - Entity -> Subscription (HAS_SUBSCRIPTION)
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function fixRelationships() {
  console.log('🔧 Fixing Relationship Directions and Types...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Clear all existing relationships
      console.log('🗑️ Clearing existing relationships...');
      await session.run('MATCH ()-[r]->() DELETE r');
      console.log('✅ Existing relationships cleared\n');
      
      // 2. Create User -> Tenant (BELONGS_TO)
      console.log('👥 Creating User -> Tenant relationships...');
      const userTenantQuery = `
        MATCH (u:User), (t:Tenant)
        WHERE u.tenant_id = t.id
        MERGE (u)-[:BELONGS_TO {created_at: datetime()}]->(t)
        RETURN count(*) as created
      `;
      
      const userTenantResult = await session.run(userTenantQuery);
      const userTenantCount = userTenantResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${userTenantCount} User->Tenant relationships\n`);
      
      // 3. Create Tenant -> Entity (MANAGES)
      console.log('🏢 Creating Tenant -> Entity relationships...');
      const tenantEntityQuery = `
        MATCH (t:Tenant), (ue:UserEntity)
        WHERE t.id = ue.tenant_id
        MERGE (t)-[:MANAGES {created_at: datetime()}]->(ue)
        RETURN count(*) as created
      `;
      
      const tenantEntityResult = await session.run(tenantEntityQuery);
      const tenantEntityCount = tenantEntityResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${tenantEntityCount} Tenant->Entity relationships\n`);
      
      // 4. Create Entity -> Fund (INVESTED_IN) based on tenant matching
      console.log('🏛️ Creating Entity -> Fund relationships...');
      const entityFundQuery = `
        MATCH (ue:UserEntity), (uf:UserFund), (t:Tenant)
        WHERE ue.tenant_id = t.id AND uf.tenant_id = t.id
        MERGE (ue)-[:INVESTED_IN {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const entityFundResult = await session.run(entityFundQuery);
      const entityFundCount = entityFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityFundCount} Entity->Fund relationships\n`);
      
      // 5. Create Fund -> Subscription (HAS_SUBSCRIPTION) based on fund_name matching
      console.log('💰 Creating Fund -> Subscription relationships...');
      const fundSubscriptionQuery = `
        MATCH (uf:UserFund), (s:Subscription), (t:Tenant)
        WHERE uf.tenant_id = t.id AND s.tenant_id = t.id AND uf.fund_name = s.fund_name
        MERGE (uf)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const fundSubscriptionResult = await session.run(fundSubscriptionQuery);
      const fundSubscriptionCount = fundSubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${fundSubscriptionCount} Fund->Subscription relationships\n`);
      
      // 6. Create Entity -> Subscription (HAS_SUBSCRIPTION) based on investment_entity matching
      console.log('🏛️ Creating Entity -> Subscription relationships...');
      const entitySubscriptionQuery = `
        MATCH (ue:UserEntity), (s:Subscription), (t:Tenant)
        WHERE ue.tenant_id = t.id AND s.tenant_id = t.id AND ue.investment_entity = s.investment_entity
        MERGE (ue)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const entitySubscriptionResult = await session.run(entitySubscriptionQuery);
      const entitySubscriptionCount = entitySubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entitySubscriptionCount} Entity->Subscription relationships\n`);
      
      // Summary
      const totalRelationships = userTenantCount + tenantEntityCount + entityFundCount + fundSubscriptionCount + entitySubscriptionCount;
      console.log(`📊 Total relationships created: ${totalRelationships}`);
      
      // Show the new relationship structure
      console.log('\n🔍 New Relationship Structure:');
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
      
      // Show sample flow
      console.log('\n📋 Sample Flow:');
      const sampleFlowQuery = `
        MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
        RETURN u.email as user_email, 
               t.id as tenant_id, 
               ue.investment_entity as entity_name,
               uf.fund_name as fund_name
        LIMIT 5
      `;
      
      const sampleFlowResult = await session.run(sampleFlowQuery);
      if (sampleFlowResult.records.length > 0) {
        console.log('   Complete flow examples:');
        sampleFlowResult.records.forEach((record: any) => {
          const userEmail = record.get('user_email');
          const tenantId = record.get('tenant_id');
          const entityName = record.get('entity_name');
          const fundName = record.get('fund_name');
          console.log(`   ${userEmail} -> ${tenantId} -> ${entityName} -> ${fundName}`);
        });
      } else {
        console.log('   No complete flows found (this is expected if entities and funds are in different tenants)');
      }
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error fixing relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the relationship fix
fixRelationships().catch(console.error);
