import { SchemaManager } from '../schema/schema-manager';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const database = args[1] || 'neo4j';

  const schemaManager = new SchemaManager(database);

  console.log('🏗️ Neo4j Schema Manager');
  console.log(`   Database: ${database}`);
  console.log(`   Command: ${command || 'help'}`);
  console.log('');

  try {
    switch (command) {
      case 'create':
        await schemaManager.createCompleteSchema();
        break;

      case 'create-nodes':
        const nodeLabels = args.slice(2);
        if (nodeLabels.length === 0) {
          console.error('❌ Please specify node labels to create schema for');
          console.log('   Usage: npm run schema:create-nodes User Tenant UserEntity');
          process.exit(1);
        }
        await schemaManager.createNodeSchema(nodeLabels);
        break;

      case 'drop-nodes':
        const dropLabels = args.slice(2);
        if (dropLabels.length === 0) {
          console.error('❌ Please specify node labels to drop schema for');
          console.log('   Usage: npm run schema:drop-nodes UserEntity');
          process.exit(1);
        }
        await schemaManager.dropNodeSchema(dropLabels);
        break;

      case 'verify':
        await schemaManager.verifySchema();
        break;

      case 'generate':
        const outputPath = args[2];
        await schemaManager.generateSchemaFile(outputPath);
        break;

      case 'info':
        const info = schemaManager.getSchemaInfo();
        console.log('📊 Schema Information:');
        console.log(`   Version: ${info.version}`);
        console.log(`   Node Labels: ${info.nodeLabels.join(', ')}`);
        console.log(`   Relationships: ${info.relationships}`);
        console.log(`   Constraints: ${info.constraints}`);
        console.log(`   Indexes: ${info.indexes}`);
        console.log('');
        console.log('📋 Node Details:');
        info.nodes.forEach((node: any) => {
          console.log(`   ${node.label}: ${node.properties} properties, ${node.constraints} constraints, ${node.indexes} indexes`);
        });
        break;

      case 'help':
      default:
        console.log('📖 Available Commands:');
        console.log('');
        console.log('   create                    Create complete schema');
        console.log('   create-nodes <labels>     Create schema for specific node labels');
        console.log('   drop-nodes <labels>       Drop schema for specific node labels');
        console.log('   verify                    Verify schema exists and is correct');
        console.log('   generate [path]           Generate schema Cypher file');
        console.log('   info                      Show schema information');
        console.log('   help                      Show this help message');
        console.log('');
        console.log('📝 Examples:');
        console.log('   npm run schema:create');
        console.log('   npm run schema:create-nodes User Tenant');
        console.log('   npm run schema:drop-nodes UserEntity');
        console.log('   npm run schema:verify');
        console.log('   npm run schema:generate schema/neo4j-schema.cypher');
        console.log('   npm run schema:info');
        break;
    }

  } catch (error: any) {
    console.error('❌ Schema management failed:', error.message);
    process.exit(1);
  }
}

main();
