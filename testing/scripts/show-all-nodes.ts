import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function showAllNodesAndRelationships() {
  console.log('🔍 Showing All Nodes and Relationships in Your Neo4j Database...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();
    if (!connected) {
      throw new Error('Failed to connect to Neo4j');
    }
    
    console.log('✅ Connected to Neo4j successfully!');
    
    // Show all node types
    console.log('\n📊 Node Types in Database:');
    const nodeTypes = await neo4j.executeQuery(`
      MATCH (n)
      RETURN labels(n) as node_labels, count(n) as count
      ORDER BY count DESC
    `);
    
    nodeTypes.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.node_labels.join(':')} - ${row.count} nodes`);
    });
    
    // Show all relationship types
    console.log('\n🔗 Relationship Types in Database:');
    const relationshipTypes = await neo4j.executeQuery(`
      MATCH ()-[r]->()
      RETURN type(r) as relationship_type, count(r) as count
      ORDER BY count DESC
    `);
    
    relationshipTypes.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.relationship_type} - ${row.count} relationships`);
    });
    
    // Show all users with their relationships
    console.log('\n👥 All Users and Their Relationships:');
    const usersWithRelationships = await neo4j.executeQuery(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[r]->(target)
      RETURN u.id as user_id, 
             u.first_name as first_name, 
             u.last_name as last_name,
             u.email as email,
             type(r) as relationship_type,
             labels(target) as target_labels,
             target.id as target_id
      ORDER BY u.id, relationship_type
    `);
    
    let currentUser = '';
    usersWithRelationships.forEach((row) => {
      if (row.user_id !== currentUser) {
        currentUser = row.user_id;
        console.log(`\n   👤 ${row.first_name} ${row.last_name} (${row.email})`);
        console.log(`      ID: ${row.user_id}`);
      }
      
      if (row.relationship_type) {
        console.log(`      └─ ${row.relationship_type} → ${row.target_labels.join(':')} (${row.target_id})`);
      }
    });
    
    // Show all tenants
    console.log('\n🏢 All Tenants:');
    const tenants = await neo4j.executeQuery(`
      MATCH (t:Tenant)
      RETURN t.id as tenant_id
      ORDER BY t.id
    `);
    
    tenants.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tenant_id}`);
    });
    
    // Show complete graph structure
    console.log('\n🕸️ Complete Graph Structure:');
    const graphStructure = await neo4j.executeQuery(`
      MATCH (u:User)-[r:BELONGS_TO]->(t:Tenant)
      RETURN u.first_name as first_name, 
             u.last_name as last_name, 
             u.email as email,
             t.id as tenant_id
      ORDER BY t.id, u.last_name
    `);
    
    let currentTenant = '';
    graphStructure.forEach((row) => {
      if (row.tenant_id !== currentTenant) {
        currentTenant = row.tenant_id;
        console.log(`\n   🏢 Tenant: ${row.tenant_id}`);
      }
      console.log(`      👤 ${row.first_name} ${row.last_name} (${row.email})`);
    });
    
    console.log('\n💡 Useful Queries to Try in Neo4j Browser:');
    console.log('');
    console.log('1. Visual Graph View:');
    console.log('   MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50');
    console.log('');
    console.log('2. All Users and Relationships:');
    console.log('   MATCH (u:User)-[r]->(target) RETURN u, r, target');
    console.log('');
    console.log('3. Complete Schema:');
    console.log('   CALL db.schema.visualization()');
    console.log('');
    console.log('4. All Nodes:');
    console.log('   MATCH (n) RETURN n LIMIT 20');
    console.log('');
    console.log('5. All Relationships:');
    console.log('   MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 20');
    
    console.log('\n🎉 Database overview completed!');
    
  } catch (error) {
    console.error('❌ Failed to show database overview:', error);
  } finally {
    await neo4j.close();
  }
}

// Run the overview
showAllNodesAndRelationships().catch(console.error);
