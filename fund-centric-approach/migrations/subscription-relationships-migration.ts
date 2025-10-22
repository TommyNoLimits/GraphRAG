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

export class SubscriptionRelationshipMigration {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;
  private database: string;

  constructor(database: string = 'neo4j') {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
    this.database = database;
  }

  async runMigration(options: { limit?: number | undefined; skipSchema?: boolean } = {}) {
    console.log('🔗 Starting Subscription Relationship Migration');
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
        await this.createRelationshipSchema();
      }

      // Fetch subscriptions data
      const subscriptions = await this.fetchSubscriptionsFromPostgres(options.limit);
      
      if (subscriptions.length > 0) {
        console.log(`📤 Creating ${subscriptions.length} "invested through" relationships...`);
        await this.createInvestedThroughRelationships(subscriptions);
      } else {
        console.log('ℹ️ No subscription data found to migrate.');
      }

      await this.verifyMigration();
      await this.showSampleRelationships(options.limit || 5);

      console.log(`🎉 Subscription relationship migration completed successfully! Created relationships for ${subscriptions.length} subscriptions.`);

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

  private async createRelationshipSchema(): Promise<void> {
    console.log('📋 Creating Neo4j relationship schema...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      // Create index for performance on the relationship
      await session.run(`
        CREATE INDEX invested_through_as_of_date IF NOT EXISTS FOR ()-[r:INVESTED_THROUGH]->() ON (r.as_of_date)
      `);
      
      await session.run(`
        CREATE INDEX invested_through_commitment IF NOT EXISTS FOR ()-[r:INVESTED_THROUGH]->() ON (r.commitment_amount)
      `);

      console.log('✅ Relationship schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create relationship schema:', error);
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

  private async createInvestedThroughRelationships(subscriptions: Subscription[]): Promise<number> {
    const session = this.neo4j['driver']!.session({ database: this.database });
    let createdCount = 0;

    try {
      const batchSize = 50;
      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const plainBatch = JSON.parse(JSON.stringify(batch)); // Ensure plain objects

        const query = `
          UNWIND $subscriptions AS sub
          MATCH (uf:UserFund {tenant_id: sub.tenant_id, fund_name: sub.fund_name})
          MATCH (ue:UserEntity {tenant_id: sub.tenant_id, investment_entity: sub.investment_entity})
          MERGE (uf)-[r:INVESTED_THROUGH {
            subscription_id: sub.id,
            as_of_date: sub.as_of_date,
            commitment_amount: sub.commitment_amount,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          }]->(ue)
          RETURN count(r) as created
        `;

        const result = await session.run(query, { subscriptions: plainBatch });
        const batchCreated = result.records[0].get('created').toNumber();
        createdCount += batchCreated;
        console.log(`📦 Processed batch ${Math.floor(i / batchSize) + 1}: ${batchCreated} relationships created`);
      }

      await session.close();
      console.log(`✅ Successfully created ${createdCount} "invested through" relationships in ${this.database} database`);
      return createdCount;
    } catch (error) {
      await session.close();
      throw error;
    }
  }

  private async verifyMigration(): Promise<void> {
    console.log(`🔍 Verifying subscription relationship migration in ${this.database} database...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      // Count relationships
      const relationshipCount = await session.run(`
        MATCH ()-[r:INVESTED_THROUGH]->()
        RETURN count(r) as count
      `);
      
      const count = relationshipCount.records[0].get('count').toNumber();
      
      console.log('📊 Migration Verification Results:');
      console.log(`   🔗 INVESTED_THROUGH relationships: ${count}`);
      
      if (count > 0) {
        console.log('✅ Subscription relationship migration verification successful!');
      } else {
        console.log('⚠️ No relationships found - check if funds have stage="Invested"');
      }
      
    } finally {
      await session.close();
    }
  }

  private async showSampleRelationships(limit: number = 5): Promise<void> {
    console.log(`🔍 Showing sample relationships from ${this.database} database (limit: ${limit})...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const query = `
        MATCH (uf:UserFund)-[r:INVESTED_THROUGH]->(ue:UserEntity)
        RETURN 
          uf.fund_name as fund_name,
          ue.investment_entity as investment_entity,
          r.commitment_amount as commitment_amount,
          r.as_of_date as as_of_date,
          uf.tenant_id as tenant_id
        ORDER BY r.as_of_date DESC
        LIMIT $limit
      `;
      
      const results = await session.run(query, { limit: neo4j.int(limit) });

      console.log(`📋 Sample INVESTED_THROUGH Relationships (${this.database} database):`);
      results.records.forEach((record: any, index: number) => {
        const rel = record.toObject();
        console.log(`   ${index + 1}. Fund: ${rel.fund_name}`);
        console.log(`      Entity: ${rel.investment_entity}`);
        console.log(`      Commitment: $${rel.commitment_amount}`);
        console.log(`      Date: ${rel.as_of_date}`);
        console.log(`      Tenant: ${rel.tenant_id.substring(0, 8)}...`);
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
      // Handle numeric arguments (e.g., "5" from npm run migrate:subscriptions:limit 5)
      limit = parseInt(arg, 10);
    }
  }

  const migration = new SubscriptionRelationshipMigration('neo4j');
  try {
    await migration.runMigration({ limit, skipSchema });
  } catch (error) {
    console.error('❌ Subscription relationship migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
