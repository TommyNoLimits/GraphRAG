import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSampleQueries() {
  console.log('🔍 Running Sample Queries on Your Neo4j Database...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();
    if (!connected) {
      throw new Error('Failed to connect to Neo4j');
    }
    
    console.log('✅ Connected to Neo4j successfully!');
    
    // Query 1: Count all users
    console.log('\n📊 Query 1: Total User Count');
    const userCount = await neo4j.executeQuery('MATCH (u:User) RETURN count(u) as user_count');
    console.log(`   Total Users: ${userCount[0].user_count}`);
    
    // Query 2: Count all tenants
    console.log('\n🏢 Query 2: Total Tenant Count');
    const tenantCount = await neo4j.executeQuery('MATCH (t:Tenant) RETURN count(t) as tenant_count');
    console.log(`   Total Tenants: ${tenantCount[0].tenant_count}`);
    
    // Query 3: Users per tenant
    console.log('\n📈 Query 3: Users per Tenant');
    const usersPerTenant = await neo4j.executeQuery(`
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN t.id as tenant_id, count(u) as user_count
      ORDER BY user_count DESC
    `);
    
    usersPerTenant.forEach((row, index) => {
      console.log(`   ${index + 1}. Tenant ${row.tenant_id}: ${row.user_count} users`);
    });
    
    // Query 4: All users with details
    console.log('\n👥 Query 4: All Users');
    const allUsers = await neo4j.executeQuery(`
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN u.first_name, u.last_name, u.email, u.username, u.email_confirmed, t.id as tenant_id
      ORDER BY u.created_at DESC
    `);
    
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Tenant: ${user.tenant_id}`);
      console.log(`      Email Confirmed: ${user.email_confirmed}`);
      console.log('');
    });
    
    // Query 5: Users with unconfirmed emails
    console.log('⚠️ Query 5: Users with Unconfirmed Emails');
    const unconfirmedUsers = await neo4j.executeQuery(`
      MATCH (u:User) 
      WHERE u.email_confirmed = false
      RETURN u.username, u.email, u.first_name, u.last_name
    `);
    
    if (unconfirmedUsers.length > 0) {
      unconfirmedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      });
    } else {
      console.log('   ✅ All users have confirmed emails!');
    }
    
    // Query 6: Recent users (if any)
    console.log('\n🕒 Query 6: Recent Users (Last 7 Days)');
    const recentUsers = await neo4j.executeQuery(`
      MATCH (u:User)
      WHERE u.created_at > datetime() - duration("P7D")
      RETURN u.first_name, u.last_name, u.email, u.created_at
      ORDER BY u.created_at DESC
    `);
    
    if (recentUsers.length > 0) {
      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} - ${user.created_at}`);
      });
    } else {
      console.log('   ℹ️ No users created in the last 7 days');
    }
    
    console.log('\n🎉 Sample queries completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Open Neo4j Browser at http://localhost:7474');
    console.log('   2. Login with username: neo4j, password: password');
    console.log('   3. Try the queries from NEO4J_QUERIES.md');
    console.log('   4. Explore the graph visualization');
    
  } catch (error) {
    console.error('❌ Failed to run sample queries:', error);
  } finally {
    await neo4j.close();
  }
}

// Run the queries
runSampleQueries().catch(console.error);
