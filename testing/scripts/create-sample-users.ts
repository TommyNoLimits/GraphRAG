import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SampleUser {
  id: string;
  tenant_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  email_confirmed: boolean;
}

async function createSampleUsers() {
  console.log('🎭 Creating Sample User Data in Neo4j...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();
    if (!connected) {
      throw new Error('Failed to connect to Neo4j');
    }
    
    // Create schema
    console.log('📋 Creating user schema...');
    const session = neo4j['driver']!.session();
    
    // Create constraints
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);
    
    await session.run(`
      CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS 
      FOR (t:Tenant) REQUIRE t.id IS UNIQUE
    `);

    // Create indexes
    await session.run(`
      CREATE INDEX user_email_index IF NOT EXISTS 
      FOR (u:User) ON (u.email)
    `);
    
    await session.run(`
      CREATE INDEX user_username_index IF NOT EXISTS 
      FOR (u:User) ON (u.username)
    `);

    console.log('✅ Schema created successfully!');
    
    // Sample user data
    const sampleUsers: SampleUser[] = [
      {
        id: 'user-001',
        tenant_id: 'tenant-001',
        username: 'john.doe',
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-15T10:30:00Z',
        email_confirmed: true
      },
      {
        id: 'user-002',
        tenant_id: 'tenant-001',
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        created_at: '2024-01-16T14:20:00Z',
        email_confirmed: true
      },
      {
        id: 'user-003',
        tenant_id: 'tenant-002',
        username: 'bob.wilson',
        email: 'bob.wilson@example.com',
        first_name: 'Bob',
        last_name: 'Wilson',
        created_at: '2024-01-17T09:15:00Z',
        email_confirmed: false
      },
      {
        id: 'user-004',
        tenant_id: 'tenant-001',
        username: 'alice.brown',
        email: 'alice.brown@example.com',
        first_name: 'Alice',
        last_name: 'Brown',
        created_at: '2024-01-18T16:45:00Z',
        email_confirmed: true
      },
      {
        id: 'user-005',
        tenant_id: 'tenant-002',
        username: 'charlie.davis',
        email: 'charlie.davis@example.com',
        first_name: 'Charlie',
        last_name: 'Davis',
        created_at: '2024-01-19T11:30:00Z',
        email_confirmed: true
      }
    ];
    
    // Create user nodes
    console.log(`📤 Creating ${sampleUsers.length} sample user nodes...`);
    
    const query = `
      UNWIND $users AS user
      MERGE (u:User {id: user.id})
      SET u.tenant_id = user.tenant_id,
          u.username = user.username,
          u.email = user.email,
          u.first_name = user.first_name,
          u.last_name = user.last_name,
          u.created_at = datetime(user.created_at),
          u.email_confirmed = user.email_confirmed
      
      MERGE (t:Tenant {id: user.tenant_id})
      MERGE (u)-[:BELONGS_TO]->(t)
      
      RETURN count(u) as created
    `;

    const result = await session.run(query, { users: sampleUsers });
    const createdCount = result.records[0].get('created').toNumber();
    
    console.log(`✅ Successfully created ${createdCount} user nodes!`);
    
    // Verify the data
    console.log('🔍 Verifying sample data...');
    
    const userCountResult = await session.run('MATCH (u:User) RETURN count(u) as count');
    const userCount = userCountResult.records[0].get('count').toNumber();
    
    const tenantCountResult = await session.run('MATCH (t:Tenant) RETURN count(t) as count');
    const tenantCount = tenantCountResult.records[0].get('count').toNumber();
    
    const relationshipCountResult = await session.run('MATCH (u:User)-[:BELONGS_TO]->(t:Tenant) RETURN count(*) as count');
    const relationshipCount = relationshipCountResult.records[0].get('count').toNumber();
    
    console.log('📊 Sample Data Verification:');
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   🏢 Tenants: ${tenantCount}`);
    console.log(`   🔗 User-Tenant relationships: ${relationshipCount}`);
    
    // Show sample users
    console.log('📋 Sample Users:');
    const sampleResult = await session.run(`
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN u.id as id, 
             u.username as username, 
             u.email as email, 
             u.first_name as first_name, 
             u.last_name as last_name,
             u.created_at as created_at,
             u.email_confirmed as email_confirmed,
             t.id as tenant_id
      ORDER BY u.created_at DESC
    `);
    
    sampleResult.records.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.get('first_name')} ${record.get('last_name')} (${record.get('email')})`);
      console.log(`      ID: ${record.get('id')}`);
      console.log(`      Username: ${record.get('username')}`);
      console.log(`      Tenant: ${record.get('tenant_id')}`);
      console.log(`      Email Confirmed: ${record.get('email_confirmed')}`);
      console.log(`      Created: ${record.get('created_at')}`);
      console.log('');
    });
    
    // Show some useful queries
    console.log('💡 Useful Neo4j Queries to Try:');
    console.log('');
    console.log('1. Find all users in a specific tenant:');
    console.log('   MATCH (u:User)-[:BELONGS_TO]->(t:Tenant {id: "tenant-001"})');
    console.log('   RETURN u.first_name, u.last_name, u.email');
    console.log('');
    console.log('2. Find users with unconfirmed emails:');
    console.log('   MATCH (u:User) WHERE u.email_confirmed = false');
    console.log('   RETURN u.username, u.email');
    console.log('');
    console.log('3. Count users per tenant:');
    console.log('   MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)');
    console.log('   RETURN t.id as tenant_id, count(u) as user_count');
    console.log('   ORDER BY user_count DESC');
    console.log('');
    console.log('4. Find recent users (last 7 days):');
    console.log('   MATCH (u:User)');
    console.log('   WHERE u.created_at > datetime() - duration("P7D")');
    console.log('   RETURN u.first_name, u.last_name, u.created_at');
    console.log('   ORDER BY u.created_at DESC');
    
    await session.close();
    console.log('🎉 Sample data creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
  } finally {
    await neo4j.close();
  }
}

// Run the demo
createSampleUsers().catch(console.error);
