import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function visualizeGraphRAG() {
  console.log('🎨 GraphRAG Data Visualization');
  console.log('==============================');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j successfully!\n');
    
    // Query 1: Complete Graph Overview
    console.log('📊 1. Complete Graph Overview');
    console.log('-----------------------------');
    
    const graphQuery = `
      MATCH (n)-[r]->(m) 
      RETURN labels(n)[0] as source_type, type(r) as relationship, labels(m)[0] as target_type, count(*) as count
      ORDER BY count DESC
    `;
    
    const graphResults = await neo4j.executeQuery(graphQuery);
    graphResults.forEach((result: any) => {
      console.log(`   ${result.source_type} --[${result.relationship}]--> ${result.target_type}: ${result.count}`);
    });
    
    // Query 2: All Users with Details
    console.log('\n👥 2. All Users with Details');
    console.log('-----------------------------');
    
    const usersQuery = `
      MATCH (u:User)
      RETURN u.id, u.username, u.email, u.first_name, u.last_name, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 10
    `;
    
    const users = await neo4j.executeQuery(usersQuery);
    users.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`);
      console.log(`      Email: ${user.email || 'N/A'}`);
      console.log(`      Username: ${user.username || 'N/A'}`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Created: ${user.created_at || 'N/A'}`);
      console.log('');
    });
    
    // Query 3: Users by Tenant
    console.log('🏢 3. Users by Tenant');
    console.log('---------------------');
    
    const tenantQuery = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN t.id as tenant_id, count(u) as user_count, collect(u.first_name + ' ' + u.last_name) as users
      ORDER BY user_count DESC
    `;
    
    const tenants = await neo4j.executeQuery(tenantQuery);
    tenants.forEach((tenant: any, index: number) => {
      console.log(`   ${index + 1}. Tenant: ${tenant.tenant_id}`);
      console.log(`      Users: ${tenant.user_count}`);
      console.log(`      Names: ${tenant.users.join(', ')}`);
      console.log('');
    });
    
    // Query 4: Visual Graph Structure
    console.log('🕸️ 4. Visual Graph Structure');
    console.log('-----------------------------');
    
    const structureQuery = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN u.first_name + ' ' + u.last_name as user_name, u.email, t.id as tenant_id
      ORDER BY tenant_id, user_name
    `;
    
    const structure = await neo4j.executeQuery(structureQuery);
    let currentTenant = '';
    structure.forEach((item: any) => {
      if (item.tenant_id !== currentTenant) {
        currentTenant = item.tenant_id;
        console.log(`\n   🏢 Tenant: ${currentTenant}`);
      }
      console.log(`      👤 ${item.user_name} (${item.email})`);
    });
    
    // Query 5: Data Statistics
    console.log('\n📈 5. Data Statistics');
    console.log('----------------------');
    
    const statsQuery = `
      MATCH (n)
      RETURN labels(n)[0] as node_type, count(n) as count
      ORDER BY count DESC
    `;
    
    const stats = await neo4j.executeQuery(statsQuery);
    stats.forEach((stat: any) => {
      console.log(`   ${stat.node_type}: ${stat.count} nodes`);
    });
    
    const relStatsQuery = `
      MATCH ()-[r]->()
      RETURN type(r) as relationship_type, count(r) as count
      ORDER BY count DESC
    `;
    
    const relStats = await neo4j.executeQuery(relStatsQuery);
    relStats.forEach((stat: any) => {
      console.log(`   ${stat.relationship_type}: ${stat.count} relationships`);
    });
    
    console.log('\n🎨 Visualization Options:');
    console.log('========================');
    console.log('1. Neo4j Browser: http://localhost:7474');
    console.log('   - Username: neo4j');
    console.log('   - Password: password');
    console.log('');
    console.log('2. Try these queries in Neo4j Browser:');
    console.log('   MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50');
    console.log('   MATCH (u:User)-[r:BELONGS_TO]->(t:Tenant) RETURN u, r, t');
    console.log('   CALL db.schema.visualization()');
    console.log('');
    console.log('3. For more queries, see NEO4J_QUERIES.md');
    
  } catch (error) {
    console.error('❌ Visualization failed:', error);
  } finally {
    await neo4j.close();
  }
}

visualizeGraphRAG();
