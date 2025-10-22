import { Neo4jConnection } from '../database/neo4j-connection';

async function main() {
  console.log('🧪 Testing Neo4j Connection\n');

  const neo4j = new Neo4jConnection();

  try {
    // Connect to Neo4j
    const connected = await neo4j.connect();

    if (!connected) {
      console.error('❌ Failed to connect to Neo4j');
      process.exit(1);
    }

    // Test the connection
    const testPassed = await neo4j.testConnection();

    if (!testPassed) {
      console.error('❌ Connection test failed');
      process.exit(1);
    }

    console.log('\n✅ Neo4j is ready for migrations!');
    console.log('   Neo4j Browser: http://localhost:7474');
    console.log('   Bolt URI: bolt://localhost:7687');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await neo4j.close();
  }
}

main().catch(console.error);
