#!/usr/bin/env node

/**
 * GraphRAG Production Migration Tool
 * 
 * This is the main entry point for production migrations.
 * Use this for actual data migration from PostgreSQL to Neo4j.
 */

import { ProductionUserMigration } from './migrations';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 GraphRAG Production Migration Tool');
  console.log('=====================================');
  console.log('');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Available Commands:');
    console.log('');
    console.log('  migrate:users [--limit=N] [--skip-schema]');
    console.log('    Migrate users from PostgreSQL to Neo4j');
    console.log('    --limit=N: Migrate only N users (for testing)');
    console.log('    --skip-schema: Skip creating Neo4j schema');
    console.log('');
    console.log('📚 Examples:');
    console.log('  npm run migrate:users');
    console.log('  npm run migrate:users:limit=5');
    console.log('  npm run migrate:users:limit=10 --skip-schema');
    console.log('');
    console.log('🔧 Setup Commands:');
    console.log('  npm run db:test-postgres    # Test PostgreSQL connection');
    console.log('  npm run db:list-tables      # List all PostgreSQL tables');
    console.log('  npm run db:create-production # Create production Neo4j database');
    console.log('');
    console.log('📖 For more information, see production/README.md');
    return;
  }
  
  const command = args[0];
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const skipSchemaArg = args.includes('--skip-schema');
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  
  switch (command) {
    case 'migrate:users':
      console.log('👥 Starting User Migration...');
      console.log(`   Limit: ${limit || 'No limit'}`);
      console.log(`   Skip Schema: ${skipSchemaArg}`);
      console.log('');
      
      const migration = new ProductionUserMigration('production');
      
      try {
        await migration.runMigration({ 
          limit: limit || undefined, 
          skipSchema: skipSchemaArg 
        });
        console.log('');
        console.log('🎉 Migration completed successfully!');
      } catch (error) {
        console.error('');
        console.error('💥 Migration failed:', error);
        process.exit(1);
      }
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run without arguments to see available commands.');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
