import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

dotenv.config();

export interface Subscription {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  commitment_amount: number;
  created_at: Date;
  updated_at: Date;
}

export class SubscriptionReificationMigration {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;
  private database: string;

  constructor(database: string = 'neo4j') {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
    this.database = database;
  }

  async runMigration(options: { limit?: number | undefined; skipSchema?: boolean } = {}) {
    console.log('🔄 Starting Subscription Reification Migration');
    console.log(`   Database: ${this.database}`);
    console.log(`   Limit: ${options.limit || 'No limit'}`);
    console.log(`   Skip Schema: ${options.skipSchema || false}`);

    try {
      console.log('🚀 Initializing migration...');
      
      // Test connections
      console.log('🔍 Testing PostgreSQL connection...');
      await this.postgres.testConnection();
      
      console.log('🔍 Testing Neo4j connection...');
      await this.neo4j.connect();
      
      console.log('✅ Both database connections established');

      // Create schema if needed
      if (!options.skipSchema) {
        await this.createReificationSchema();
      }

      // Fetch subscriptions data
      const subscriptions = await this.fetchSubscriptionsFromPostgres(options.limit);
      
      if (subscriptions.length > 0) {
        console.log(`📤 Reifying ${subscriptions.length} subscription relationships...`);
        await this.reifySubscriptionRelationships(subscriptions);
      } else {
        console.log('ℹ️ No subscription data found to reify.');
      }

      await this.verifyMigration();
      await this.showSampleReifiedSubscriptions(options.limit || 5);

      console.log(`🎉 Subscription reification migration completed successfully! Reified ${subscriptions.length} subscriptions.`);

    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      console.log('🧹 Cleaning up connections...');
      await this.postgres.close();
      await this.neo4j.close();
      console.log('✅ Cleanup complete');
    }
  }

  private async createReificationSchema(): Promise<void> {
    console.log('📋 Creating Neo4j reification schema...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      // Create constraints for Subscription nodes
      await session.run(`
        CREATE CONSTRAINT subscription_id_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE s.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT subscription_tenant_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE (s.tenant_id, s.id) IS UNIQUE
      `);

      // Create indexes for performance
      await session.run(`
        CREATE INDEX subscription_tenant_id IF NOT EXISTS FOR (s:Subscription) ON (s.tenant_id)
      `);
      
      await session.run(`
        CREATE INDEX subscription_as_of_date IF NOT EXISTS FOR (s:Subscription) ON (s.as_of_date)
      `);
      
      await session.run(`
        CREATE INDEX subscription_commitment_amount IF NOT EXISTS FOR (s:Subscription) ON (s.commitment_amount)
      `);

      // Create indexes for Document relationships
      await session.run(`
        CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.type)
      `);

      console.log('✅ Reification schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create reification schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async fetchSubscriptionsFromPostgres(limit?: number): Promise<Subscription[]> {
    console.log('📥 Fetching subscriptions from PostgreSQL...');
    
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const query = `
      SELECT s.*, uf.stage
      FROM subscriptions s
      INNER JOIN user_funds uf ON s.tenant_id = uf.tenant_id AND s.fund_name = uf.fund_name
      WHERE uf.stage = 'Invested'
      ${limitClause}
    `;
    
    const subscriptions = await this.postgres.query(query);
    console.log(`✅ Fetched ${subscriptions.length} subscriptions from PostgreSQL`);
    
    return subscriptions;
  }

  private async reifySubscriptionRelationships(subscriptions: Subscription[]): Promise<number> {
    const session = this.neo4j['driver']!.session({ database: this.database });
    let reifiedCount = 0;

    try {
      const batchSize = 25; // Smaller batch size for complex operations
      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const plainBatch = JSON.parse(JSON.stringify(batch)); // Ensure plain objects

        const query = `
          UNWIND $subscriptions AS sub
          
          // Find the existing relationship
          MATCH (uf:UserFund {tenant_id: sub.tenant_id, fund_name: sub.fund_name})
          MATCH (ue:UserEntity {tenant_id: sub.tenant_id, investment_entity: sub.investment_entity})
          MATCH (uf)-[r:INVESTED_THROUGH {subscription_id: sub.id}]->(ue)
          
          // Create the reified subscription node
          CREATE (s:Subscription {
            id: sub.id,
            tenant_id: sub.tenant_id,
            fund_name: sub.fund_name,
            investment_entity: sub.investment_entity,
            as_of_date: sub.as_of_date,
            commitment_amount: sub.commitment_amount,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          })
          
          // Create new relationships through the subscription node
          MERGE (uf)-[:INVESTED_THROUGH]->(s)
          MERGE (s)-[:LINKED_TO]->(ue)
          
          // Remove the old direct relationship
          DELETE r
          
          RETURN count(s) as reified
        `;

        const result = await session.run(query, { subscriptions: plainBatch });
        const batchReified = result.records[0].get('reified').toNumber();
        reifiedCount += batchReified;
        console.log(`📦 Processed batch ${Math.floor(i / batchSize) + 1}: ${batchReified} subscriptions reified`);
      }

      await session.close();
      console.log(`✅ Successfully reified ${reifiedCount} subscription relationships in ${this.database} database`);
      return reifiedCount;
    } catch (error) {
      await session.close();
      throw error;
    }
  }

  private async verifyMigration(): Promise<void> {
    console.log(`🔍 Verifying subscription reification in ${this.database} database...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      // Count reified subscription nodes
      const subscriptionCount = await session.run(`
        MATCH (s:Subscription)
        RETURN count(s) as count
      `);
      
      // Count new relationships
      const investedThroughCount = await session.run(`
        MATCH ()-[r:INVESTED_THROUGH]->(s:Subscription)
        RETURN count(r) as count
      `);
      
      const linkedToCount = await session.run(`
        MATCH (s:Subscription)-[r:LINKED_TO]->()
        RETURN count(r) as count
      `);
      
      // Check for any remaining old direct relationships (UserFund -> UserEntity)
      const oldRelationshipCount = await session.run(`
        MATCH (uf:UserFund)-[r:INVESTED_THROUGH]->(ue:UserEntity)
        WHERE NOT EXISTS((uf)-[:INVESTED_THROUGH]->(:Subscription))
        RETURN count(r) as count
      `);
      
      const subCount = subscriptionCount.records[0].get('count').toNumber();
      const invCount = investedThroughCount.records[0].get('count').toNumber();
      const linkCount = linkedToCount.records[0].get('count').toNumber();
      const oldCount = oldRelationshipCount.records[0].get('count').toNumber();
      
      console.log('📊 Migration Verification Results:');
      console.log(`   📄 Subscription nodes: ${subCount}`);
      console.log(`   🔗 INVESTED_THROUGH relationships: ${invCount}`);
      console.log(`   🔗 LINKED_TO relationships: ${linkCount}`);
      console.log(`   ⚠️ Old direct relationships remaining: ${oldCount}`);
      
      if (subCount > 0 && invCount === subCount && linkCount === subCount) {
        console.log('✅ Subscription reification verification successful!');
      } else {
        console.log('⚠️ Verification failed - counts do not match');
      }
      
    } finally {
      await session.close();
    }
  }

  private async showSampleReifiedSubscriptions(limit: number = 5): Promise<void> {
    console.log(`🔍 Showing sample reified subscriptions from ${this.database} database (limit: ${limit})...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const query = `
        MATCH (uf:UserFund)-[:INVESTED_THROUGH]->(s:Subscription)-[:LINKED_TO]->(ue:UserEntity)
        RETURN 
          uf.fund_name as fund_name,
          ue.investment_entity as investment_entity,
          s.commitment_amount as commitment_amount,
          s.as_of_date as as_of_date,
          s.id as subscription_id,
          uf.tenant_id as tenant_id
        ORDER BY s.as_of_date DESC
        LIMIT $limit
      `;
      
      const results = await session.run(query, { limit: neo4j.int(limit) });

      console.log(`📋 Sample Reified Subscriptions (${this.database} database):`);
      results.records.forEach((record: any, index: number) => {
        const sub = record.toObject();
        console.log(`   ${index + 1}. Subscription ID: ${sub.subscription_id}`);
        console.log(`      Fund: ${sub.fund_name}`);
        console.log(`      Entity: ${sub.investment_entity}`);
        console.log(`      Commitment: $${sub.commitment_amount}`);
        console.log(`      Date: ${sub.as_of_date}`);
        console.log(`      Tenant: ${sub.tenant_id.substring(0, 8)}...`);
        console.log('');
      });
    } finally {
      await session.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let limit: number | undefined;
  let skipSchema: boolean = false;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--skip-schema') {
      skipSchema = true;
    } else if (!isNaN(parseInt(arg, 10))) {
      // Handle numeric arguments (e.g., "5" from npm run migrate:reify:limit 5)
      limit = parseInt(arg, 10);
    }
  }

  const migration = new SubscriptionReificationMigration('neo4j');
  try {
    await migration.runMigration({ limit, skipSchema });
  } catch (error) {
    console.error('❌ Subscription reification migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
