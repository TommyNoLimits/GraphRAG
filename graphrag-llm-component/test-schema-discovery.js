#!/usr/bin/env node

const ScalableGraphRAGService = require('./scalable-graphrag-service.js');

async function testSchemaDiscovery() {
  console.log('🔍 Testing Schema Discovery...');
  
  const service = new ScalableGraphRAGService();
  
  try {
    await service.connect();
    console.log('✅ Connected to Neo4j');
    
    const schema = await service.loadSchema();
    console.log('\n📊 Complete Schema Discovered:');
    console.log(`Node Types: ${Object.keys(schema.nodes).length}`);
    console.log(`Relationship Types: ${schema.relationships.length}`);
    
    console.log('\n📋 Node Properties:');
    for (const [nodeType, properties] of Object.entries(schema.nodes)) {
      console.log(`\n${nodeType}:`);
      properties.forEach(prop => console.log(`  - ${prop}`));
    }
    
    console.log('\n🔗 Relationship Types:');
    schema.relationships.forEach(rel => console.log(`  - ${rel}`));
    
    await service.close();
    console.log('\n✅ Schema discovery test completed');
    
  } catch (error) {
    console.error('❌ Schema discovery test failed:', error.message);
    process.exit(1);
  }
}

testSchemaDiscovery();
