#!/usr/bin/env ts-node

/**
 * Verify User-Centric Graph
 * 
 * This script shows the current state of the user-centric graph
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function verifyGraph() {
  console.log('🔍 User-Centric Graph Verification\n');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // Show node counts
      console.log('📊 Node Counts:');
      const nodeCountsQuery = `
        MATCH (n)
        RETURN labels(n)[0] as node_type, count(n) as count
        ORDER BY count DESC
      `;
      
      const nodeCountsResult = await session.run(nodeCountsQuery);
      nodeCountsResult.records.forEach((record: any) => {
        const nodeType = record.get('node_type');
        const count = record.get('count');
        console.log(`   ${nodeType}: ${count}`);
      });
      
      // Show relationship counts
      console.log('\n🔗 Relationship Counts:');
      const relCountsQuery = `
        MATCH ()-[r]->()
        RETURN type(r) as relationship_type, count(r) as count
        ORDER BY count DESC
      `;
      
      const relCountsResult = await session.run(relCountsQuery);
      relCountsResult.records.forEach((record: any) => {
        const relType = record.get('relationship_type');
        const count = record.get('count');
        console.log(`   ${relType}: ${count}`);
      });
      
      // Show tenant-centric structure
      console.log('\n🏢 Tenant-Centric Structure:');
      const tenantStructureQuery = `
        MATCH (t:Tenant)
        OPTIONAL MATCH (t)<-[:BELONGS_TO]-(resource)
        RETURN t.id as tenant_id, 
               t.name as tenant_name,
               labels(resource)[0] as resource_type,
               count(resource) as resource_count
        ORDER BY tenant_id
      `;
      
      const tenantStructureResult = await session.run(tenantStructureQuery);
      tenantStructureResult.records.forEach((record: any) => {
        const tenantId = record.get('tenant_id');
        const tenantName = record.get('tenant_name') || 'Unnamed';
        const resourceType = record.get('resource_type') || 'no resources';
        const resourceCount = record.get('resource_count');
        console.log(`   ${tenantId} (${tenantName}): ${resourceCount} ${resourceType}`);
      });
      
      // Show sample data
      console.log('\n📋 Sample Data:');
      const sampleQuery = `
        MATCH (t:Tenant)<-[:BELONGS_TO]-(resource)
        RETURN t.id as tenant_id,
               labels(resource)[0] as resource_type,
               resource.id as resource_id,
               CASE 
                 WHEN labels(resource)[0] = 'User' THEN resource.email
                 WHEN labels(resource)[0] = 'UserEntity' THEN resource.investment_entity
                 WHEN labels(resource)[0] = 'UserFund' THEN resource.fund_name
                 WHEN labels(resource)[0] = 'Subscription' THEN resource.fund_name
                 ELSE 'N/A'
               END as resource_name
        ORDER BY tenant_id, resource_type
        LIMIT 10
      `;
      
      const sampleResult = await session.run(sampleQuery);
      sampleResult.records.forEach((record: any) => {
        const tenantId = record.get('tenant_id');
        const resourceType = record.get('resource_type');
        const resourceName = record.get('resource_name');
        console.log(`   ${tenantId} -> ${resourceType}: ${resourceName}`);
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error verifying graph:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the verification
verifyGraph().catch(console.error);
