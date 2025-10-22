#!/usr/bin/env ts-node

/**
 * Full User-Centric Migration
 * 
 * This script runs the complete migration for all data
 */

import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';
import { DateTime } from 'neo4j-driver';

dotenv.config();

async function runFullMigration() {
  console.log('🚀 Starting Full User-Centric Migration\n');
  
  const postgres = new PostgreSQLConnection();
  const neo4jConn = new Neo4jConnection();
  
  try {
    // Test connections
    console.log('🔍 Testing connections...');
    await postgres.testConnection();
    await neo4jConn.connect();
    console.log('✅ Both connections established\n');
    
    const session = neo4jConn['driver']!.session({ database: 'neo4j' });
    
    try {
      // Clear existing data
      console.log('🗑️ Clearing existing data...');
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('✅ Data cleared\n');
      
      // Migrate Tenants
      console.log('🏢 Migrating tenants...');
      const tenants = await postgres.query('SELECT * FROM tenants');
      console.log(`📊 Found ${tenants.length} tenants`);
      
      for (const tenant of tenants) {
        await session.run(`
          MERGE (t:Tenant {id: $id})
          SET t.name = $name,
              t.created_at = $created_at,
              t.updated_at = $updated_at
        `, {
          id: tenant.id,
          name: tenant.name,
          created_at: DateTime.fromStandardDate(new Date(tenant.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(tenant.updated_at))
        });
      }
      console.log(`✅ Migrated ${tenants.length} tenants\n`);
      
      // Migrate Users
      console.log('👥 Migrating users...');
      const users = await postgres.query('SELECT * FROM users');
      console.log(`📊 Found ${users.length} users`);
      
      for (const user of users) {
        await session.run(`
          MERGE (u:User {id: $id})
          SET u.tenant_id = $tenant_id,
              u.username = $username,
              u.email = $email,
              u.first_name = $first_name,
              u.last_name = $last_name,
              u.created_at = $created_at,
              u.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (u)-[:BELONGS_TO]->(t)
        `, {
          id: user.id,
          tenant_id: user.tenant_id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: DateTime.fromStandardDate(new Date(user.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(user.updated_at))
        });
      }
      console.log(`✅ Migrated ${users.length} users\n`);
      
      // Migrate User Entities
      console.log('🏛️ Migrating user entities...');
      const entities = await postgres.query('SELECT * FROM user_entities');
      console.log(`📊 Found ${entities.length} entities`);
      
      for (const entity of entities) {
        await session.run(`
          MERGE (ue:UserEntity {id: $id})
          SET ue.tenant_id = $tenant_id,
              ue.investment_entity = $investment_entity,
              ue.entity_allias = $entity_allias,
              ue.created_at = $created_at,
              ue.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (ue)-[:BELONGS_TO]->(t)
        `, {
          id: entity.id,
          tenant_id: entity.tenant_id,
          investment_entity: entity.investment_entity,
          entity_allias: entity.entity_allias,
          created_at: DateTime.fromStandardDate(new Date(entity.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(entity.updated_at))
        });
      }
      console.log(`✅ Migrated ${entities.length} entities\n`);
      
      // Migrate User Funds
      console.log('💰 Migrating user funds...');
      const funds = await postgres.query('SELECT * FROM user_funds');
      console.log(`📊 Found ${funds.length} funds`);
      
      for (const fund of funds) {
        await session.run(`
          MERGE (uf:UserFund {id: $id})
          SET uf.tenant_id = $tenant_id,
              uf.fund_name = $fund_name,
              uf.stage = $stage,
              uf.investment_type = $investment_type,
              uf.fund_type = $fund_type,
              uf.created_at = $created_at,
              uf.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (uf)-[:BELONGS_TO]->(t)
        `, {
          id: fund.id,
          tenant_id: fund.tenant_id,
          fund_name: fund.fund_name,
          stage: fund.stage,
          investment_type: fund.investment_type,
          fund_type: fund.fund_type,
          created_at: DateTime.fromStandardDate(new Date(fund.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(fund.updated_at))
        });
      }
      console.log(`✅ Migrated ${funds.length} funds\n`);
      
      // Migrate Subscriptions
      console.log('📋 Migrating subscriptions...');
      const subscriptions = await postgres.query('SELECT * FROM subscriptions');
      console.log(`📊 Found ${subscriptions.length} subscriptions`);
      
      for (const subscription of subscriptions) {
        await session.run(`
          MERGE (s:Subscription {id: $id})
          SET s.tenant_id = $tenant_id,
              s.fund_name = $fund_name,
              s.investment_entity = $investment_entity,
              s.as_of_date = $as_of_date,
              s.commitment_amount = $commitment_amount,
              s.created_at = $created_at,
              s.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (s)-[:BELONGS_TO]->(t)
        `, {
          id: subscription.id,
          tenant_id: subscription.tenant_id,
          fund_name: subscription.fund_name,
          investment_entity: subscription.investment_entity,
          as_of_date: DateTime.fromStandardDate(new Date(subscription.as_of_date)),
          commitment_amount: subscription.commitment_amount,
          created_at: DateTime.fromStandardDate(new Date(subscription.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(subscription.updated_at))
        });
      }
      console.log(`✅ Migrated ${subscriptions.length} subscriptions\n`);
      
      // Final verification
      console.log('🔍 Final verification...');
      const nodeCounts = await session.run(`
        MATCH (n)
        RETURN labels(n)[0] as node_type, count(n) as count
        ORDER BY count DESC
      `);
      
      console.log('📊 Final node counts:');
      nodeCounts.records.forEach((record: any) => {
        const nodeType = record.get('node_type');
        const count = record.get('count');
        console.log(`   ${nodeType}: ${count}`);
      });
      
      const relCounts = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as relationship_type, count(r) as count
        ORDER BY count DESC
      `);
      
      console.log('\n🔗 Final relationship counts:');
      relCounts.records.forEach((record: any) => {
        const relType = record.get('relationship_type');
        const count = record.get('count');
        console.log(`   ${relType}: ${count}`);
      });
      
      console.log('\n🎉 Full migration completed successfully!');
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await postgres.close();
    await neo4jConn.close();
    console.log('✅ Cleanup complete');
  }
}

// Run the full migration
runFullMigration().catch(console.error);
