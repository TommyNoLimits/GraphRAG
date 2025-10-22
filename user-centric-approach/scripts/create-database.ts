import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function createUserCentricDatabase() {
  const neo4j = new Neo4jConnection();
  
  try {
    console.log('🔍 Connecting to Neo4j...');
    await neo4j.connect();
    
    console.log('📋 Creating user_centric database...');
    
    // Create the database using system database
    const session = neo4j['driver']!.session({ database: 'system' });
    
    try {
      // Check if database already exists
      const checkResult = await session.run(`
        SHOW DATABASES 
        YIELD name 
        WHERE name = 'user_centric'
      `);
      
      if (checkResult.records.length > 0) {
        console.log('✅ Database user_centric already exists');
      } else {
        // Create the database using Neo4j 5.x syntax
        await session.run('CREATE DATABASE user_centric');
        console.log('✅ Database user_centric created successfully');
      }
      
    } finally {
      await session.close();
    }
    
    // Test connection to the new database
    console.log('🔍 Testing connection to user_centric database...');
    const testSession = neo4j['driver']!.session({ database: 'user_centric' });
    
    try {
      const testResult = await testSession.run('RETURN "Hello from user_centric database!" as message');
      console.log('✅ Connection test successful:', testResult.records[0].get('message'));
    } finally {
      await testSession.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error creating database:', error.message);
  } finally {
    await neo4j.close();
  }
}

createUserCentricDatabase();
