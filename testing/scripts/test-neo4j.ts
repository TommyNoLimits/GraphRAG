import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testNeo4jConnection() {
  console.log('🧪 Testing Neo4j Connection...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();
    if (!connected) {
      throw new Error('Failed to connect to Neo4j');
    }
    
    // Test connection
    const testResult = await neo4j.testConnection();
    if (!testResult) {
      throw new Error('Neo4j connection test failed');
    }
    
    console.log('✅ Neo4j connection successful!');
    
    // Create a simple test node
    console.log('📝 Creating test node...');
    const session = neo4j['driver']!.session();
    
    await session.run(`
      CREATE (t:TestNode {
        id: 'test-001',
        message: 'Hello from migration test!',
        created_at: datetime()
      })
      RETURN t
    `);
    
    console.log('✅ Test node created successfully!');
    
    // Query the test node
    console.log('🔍 Querying test node...');
    const result = await session.run(`
      MATCH (t:TestNode)
      RETURN t.id as id, t.message as message, t.created_at as created_at
    `);
    
    const testNode = result.records[0];
    console.log('📋 Test Node Data:');
    console.log(`   ID: ${testNode.get('id')}`);
    console.log(`   Message: ${testNode.get('message')}`);
    console.log(`   Created: ${testNode.get('created_at')}`);
    
    // Clean up test node
    console.log('🧹 Cleaning up test node...');
    await session.run('MATCH (t:TestNode) DELETE t');
    
    await session.close();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await neo4j.close();
  }
}

// Run the test
testNeo4jConnection().catch(console.error);
