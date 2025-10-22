import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testPostgreSQLConnection() {
  console.log('🔍 Testing PostgreSQL Connection...');
  console.log('');
  
  // Show current configuration
  console.log('📋 Current Configuration:');
  console.log(`   POSTGRES_URL: ${process.env.POSTGRES_URL ? 'Set' : 'Not set'}`);
  console.log(`   POSTGRES_HOST: ${process.env.POSTGRES_HOST || 'Not set'}`);
  console.log(`   POSTGRES_PORT: ${process.env.POSTGRES_PORT || 'Not set'}`);
  console.log(`   POSTGRES_DB: ${process.env.POSTGRES_DB || 'Not set'}`);
  console.log(`   POSTGRES_USER: ${process.env.POSTGRES_USER || 'Not set'}`);
  console.log(`   POSTGRES_PASSWORD: ${process.env.POSTGRES_PASSWORD ? 'Set' : 'Not set'}`);
  console.log('');
  
  const postgres = new PostgreSQLConnection();
  
  try {
    // Test basic connection
    console.log('🚀 Testing basic connection...');
    const connected = await postgres.testConnection();
    
    if (connected) {
      console.log('');
      console.log('✅ Connection successful! Testing additional queries...');
      
      // Test a simple query
      console.log('📊 Testing simple query...');
      const result = await postgres.query('SELECT COUNT(*) as user_count FROM users');
      console.log(`   Users in database: ${result[0].user_count}`);
      
      // Test table counts
      console.log('📋 Testing table counts...');
      const tableCounts = await postgres.getTableCounts();
      console.log('   Table counts:');
      Object.entries(tableCounts).forEach(([table, count]) => {
        console.log(`     ${table}: ${count}`);
      });
      
      console.log('');
      console.log('🎉 PostgreSQL connection test completed successfully!');
      console.log('   You can now run the migration scripts.');
      
    } else {
      console.log('');
      console.log('❌ Connection failed. Please check the configuration.');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  } finally {
    await postgres.close();
  }
}

// Run the test
testPostgreSQLConnection().catch(console.error);
