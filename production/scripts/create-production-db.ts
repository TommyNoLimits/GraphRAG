import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createProductionDatabase() {
  console.log('🏭 Creating Production Database for Real Data...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();
    if (!connected) {
      throw new Error('Failed to connect to Neo4j');
    }
    
    console.log('✅ Connected to Neo4j successfully!');
    
    const session = neo4j['driver']!.session();
    
    // Create a new database for production data
    console.log('📋 Creating production database...');
    
    try {
      await session.run('CREATE DATABASE production IF NOT EXISTS');
      console.log('✅ Production database created successfully!');
    } catch (error) {
      console.log('ℹ️ Production database already exists or creation failed:', error);
    }
    
    // List all databases
    console.log('\n📊 Available Databases:');
    const databases = await session.run('SHOW DATABASES');
    
    databases.records.forEach((record, index) => {
      const dbName = record.get('name');
      const dbType = record.get('type');
      const dbStatus = record.get('currentStatus');
      console.log(`   ${index + 1}. ${dbName} (${dbType}) - Status: ${dbStatus}`);
    });
    
    // Switch to production database
    console.log('\n🔄 Switching to production database...');
    await session.close();
    
    // Create a new session for production database
    const prodSession = neo4j['driver']!.session({ database: 'production' });
    
    // Test the production database
    const testResult = await prodSession.run('RETURN "Production database ready!" as message');
    const message = testResult.records[0].get('message');
    console.log(`✅ ${message}`);
    
    // Create schema in production database
    console.log('\n📋 Creating production schema...');
    
    // Create constraints for production
    await prodSession.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);
    
    await prodSession.run(`
      CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS 
      FOR (t:Tenant) REQUIRE t.id IS UNIQUE
    `);

    // Create indexes for production
    await prodSession.run(`
      CREATE INDEX user_email_index IF NOT EXISTS 
      FOR (u:User) ON (u.email)
    `);
    
    await prodSession.run(`
      CREATE INDEX user_username_index IF NOT EXISTS 
      FOR (u:User) ON (u.username)
    `);

    await prodSession.run(`
      CREATE INDEX user_tenant_index IF NOT EXISTS 
      FOR (u:User) ON (u.tenant_id)
    `);

    console.log('✅ Production schema created successfully!');
    
    // Verify production database is empty
    const userCount = await prodSession.run('MATCH (u:User) RETURN count(u) as count');
    const count = userCount.records[0].get('count').toNumber();
    console.log(`📊 Production database currently has ${count} users`);
    
    await prodSession.close();
    
    console.log('\n🎉 Production database setup completed!');
    console.log('\n📋 Database Summary:');
    console.log('   🎭 Sample Database (neo4j): Contains 5 sample users for reference');
    console.log('   🏭 Production Database (production): Ready for real PostgreSQL data');
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your migration script to use the production database');
    console.log('   2. Run the migration with your real PostgreSQL data');
    console.log('   3. Keep the sample database for testing and reference');
    
  } catch (error) {
    console.error('❌ Failed to create production database:', error);
  } finally {
    await neo4j.close();
  }
}

// Run the setup
createProductionDatabase().catch(console.error);
