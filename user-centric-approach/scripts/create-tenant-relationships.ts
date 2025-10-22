#!/usr/bin/env ts-node

/**
 * Create Tenant-Centric Relationships
 * 
 * This script creates the proper tenant-centric relationships:
 * - Users BELONGS_TO Tenant
 * - Entities BELONGS_TO Tenant  
 * - Funds BELONGS_TO Tenant
 * - Subscriptions BELONGS_TO Tenant
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function createTenantRelationships() {
  console.log('🔗 Creating Tenant-Centric Relationships...\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // 1. Create User -> Tenant relationships
      console.log('👥 Creating User -> Tenant relationships...');
      const userTenantQuery = `
        MATCH (u:User), (t:Tenant)
        WHERE u.tenant_id = t.id
        MERGE (u)-[:BELONGS_TO {created_at: datetime()}]->(t)
        RETURN count(*) as created
      `;
      
      const userTenantResult = await session.run(userTenantQuery);
      const userTenantCount = userTenantResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${userTenantCount} User->Tenant relationships`);
      
      // 2. Create Entity -> Tenant relationships
      console.log('🏛️ Creating Entity -> Tenant relationships...');
      const entityTenantQuery = `
        MATCH (ue:UserEntity), (t:Tenant)
        WHERE ue.tenant_id = t.id
        MERGE (ue)-[:BELONGS_TO {created_at: datetime()}]->(t)
        RETURN count(*) as created
      `;
      
      const entityTenantResult = await session.run(entityTenantQuery);
      const entityTenantCount = entityTenantResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityTenantCount} Entity->Tenant relationships`);
      
      // 3. Create Fund -> Tenant relationships
      console.log('💰 Creating Fund -> Tenant relationships...');
      const fundTenantQuery = `
        MATCH (uf:UserFund), (t:Tenant)
        WHERE uf.tenant_id = t.id
        MERGE (uf)-[:BELONGS_TO {created_at: datetime()}]->(t)
        RETURN count(*) as created
      `;
      
      const fundTenantResult = await session.run(fundTenantQuery);
      const fundTenantCount = fundTenantResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${fundTenantCount} Fund->Tenant relationships`);
      
      // 4. Create Subscription -> Tenant relationships
      console.log('📋 Creating Subscription -> Tenant relationships...');
      const subscriptionTenantQuery = `
        MATCH (s:Subscription), (t:Tenant)
        WHERE s.tenant_id = t.id
        MERGE (s)-[:BELONGS_TO {created_at: datetime()}]->(t)
        RETURN count(*) as created
      `;
      
      const subscriptionTenantResult = await session.run(subscriptionTenantQuery);
      const subscriptionTenantCount = subscriptionTenantResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${subscriptionTenantCount} Subscription->Tenant relationships`);
      
      // Summary
      const totalRelationships = userTenantCount + entityTenantCount + fundTenantCount + subscriptionTenantCount;
      console.log(`\n📊 Total tenant relationships created: ${totalRelationships}`);
      
      // Show current graph structure
      console.log('\n🔍 Current Graph Structure:');
      const structureQuery = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN labels(n)[0] as node_type, 
               type(r) as relationship_type,
               labels(m)[0] as target_type,
               count(*) as count
        ORDER BY node_type, relationship_type
      `;
      
      const structureResult = await session.run(structureQuery);
      structureResult.records.forEach((record: any) => {
        const nodeType = record.get('node_type');
        const relType = record.get('relationship_type') || 'no relationships';
        const targetType = record.get('target_type') || '';
        const count = record.get('count');
        console.log(`   ${nodeType} -> ${relType} -> ${targetType}: ${count}`);
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error creating relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the relationship creation
createTenantRelationships().catch(console.error);
