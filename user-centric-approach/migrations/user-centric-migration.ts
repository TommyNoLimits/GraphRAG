import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';
import neo4j, { DateTime } from 'neo4j-driver';

dotenv.config();

export interface UserCentricData {
  user: any;
  tenant: any;
  entities: any[];
  funds: any[];
  subscriptions: any[];
}

export class UserCentricMigration {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;
  private database: string;

  constructor(database: string = 'neo4j') {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
    this.database = database;
  }

  async runMigration(options: { limit?: number | undefined; skipSchema?: boolean } = {}) {
    console.log('👤 Starting User-Centric Migration');
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
        await this.createUserCentricSchema();
      }

      // Migrate data in user-centric order
      console.log('📤 Migrating data in user-centric order...');
      
      // 1. Migrate Tenants first (foundation)
      await this.migrateTenants();
      
      // 2. Migrate Users
      await this.migrateUsers(options.limit);
      
      // 3. Migrate User Entities
      await this.migrateUserEntities(options.limit);
      
      // 4. Migrate User Funds
      await this.migrateUserFunds(options.limit);
      
      // 5. Migrate Subscriptions
      await this.migrateSubscriptions(options.limit);
      
      // 6. Create user-centric relationships
      await this.createUserCentricRelationships();

      await this.verifyMigration();
      await this.showSampleUserCentricData(options.limit || 5);

      console.log(`🎉 User-centric migration completed successfully!`);

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

  private async createUserCentricSchema(): Promise<void> {
    console.log('📋 Creating user-centric Neo4j schema...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      // Create constraints
      await session.run(`
        CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT user_entity_id_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE ue.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT user_fund_id_unique IF NOT EXISTS FOR (uf:UserFund) REQUIRE uf.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT subscription_id_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE s.id IS UNIQUE
      `);

      // Create indexes
      await session.run(`
        CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)
      `);
      
      await session.run(`
        CREATE INDEX user_entity_tenant_id IF NOT EXISTS FOR (ue:UserEntity) ON (ue.tenant_id)
      `);
      
      await session.run(`
        CREATE INDEX user_fund_stage IF NOT EXISTS FOR (uf:UserFund) ON (uf.stage)
      `);
      
      await session.run(`
        CREATE INDEX subscription_as_of_date IF NOT EXISTS FOR (s:Subscription) ON (s.as_of_date)
      `);

      console.log('✅ User-centric schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create user-centric schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async migrateTenants(): Promise<void> {
    console.log('🏢 Migrating tenants...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const tenants = await this.postgres.query('SELECT * FROM tenants');
      console.log(`📊 Found ${tenants.length} tenants`);
      
      for (const tenant of tenants) {
        const query = `
          MERGE (t:Tenant {id: $id})
          SET t.name = $name,
              t.created_at = $created_at,
              t.updated_at = $updated_at
        `;
        
        await session.run(query, {
          id: tenant.id,
          name: tenant.name,
          created_at: DateTime.fromStandardDate(new Date(tenant.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(tenant.updated_at))
        });
      }
      console.log(`✅ Migrated ${tenants.length} tenants`);
      
    } finally {
      await session.close();
    }
  }

  private async migrateUsers(limit?: number): Promise<void> {
    console.log('👥 Migrating users...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const users = await this.postgres.query(`SELECT * FROM users ${limitClause}`);
      console.log(`📊 Found ${users.length} users`);
      
      for (const user of users) {
        const query = `
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
        `;
        
        await session.run(query, {
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
      console.log(`✅ Migrated ${users.length} users`);
      
    } finally {
      await session.close();
    }
  }

  private async migrateUserEntities(limit?: number): Promise<void> {
    console.log('🏛️ Migrating user entities...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const entities = await this.postgres.query(`SELECT * FROM user_entities ${limitClause}`);
      console.log(`📊 Found ${entities.length} entities`);
      
      for (const entity of entities) {
        const query = `
          MERGE (ue:UserEntity {id: $id})
          SET ue.tenant_id = $tenant_id,
              ue.investment_entity = $investment_entity,
              ue.entity_allias = $entity_allias,
              ue.created_at = $created_at,
              ue.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (t)-[:MANAGES]->(ue)
        `;
        
        await session.run(query, {
          id: entity.id,
          tenant_id: entity.tenant_id,
          investment_entity: entity.investment_entity,
          entity_allias: entity.entity_allias,
          created_at: DateTime.fromStandardDate(new Date(entity.created_at)),
          updated_at: DateTime.fromStandardDate(new Date(entity.updated_at))
        });
      }
      console.log(`✅ Migrated ${entities.length} entities`);
      
    } finally {
      await session.close();
    }
  }

  private async migrateUserFunds(limit?: number): Promise<void> {
    console.log('💰 Migrating user funds...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const funds = await this.postgres.query(`SELECT * FROM user_funds ${limitClause}`);
      console.log(`📊 Found ${funds.length} funds`);
      
      for (const fund of funds) {
        const query = `
          MERGE (uf:UserFund {id: $id})
          SET uf.tenant_id = $tenant_id,
              uf.fund_name = $fund_name,
              uf.stage = $stage,
              uf.investment_type = $investment_type,
              uf.fund_type = $fund_type,
              uf.created_at = $created_at,
              uf.updated_at = $updated_at
        `;
        
        await session.run(query, {
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
      console.log(`✅ Migrated ${funds.length} funds`);
      
    } finally {
      await session.close();
    }
  }

  private async migrateSubscriptions(limit?: number): Promise<void> {
    console.log('📋 Migrating subscriptions...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const subscriptions = await this.postgres.query(`SELECT * FROM subscriptions ${limitClause}`);
      console.log(`📊 Found ${subscriptions.length} subscriptions`);
      
      for (const subscription of subscriptions) {
        const query = `
          MERGE (s:Subscription {id: $id})
          SET s.tenant_id = $tenant_id,
              s.fund_name = $fund_name,
              s.investment_entity = $investment_entity,
              s.as_of_date = $as_of_date,
              s.commitment_amount = $commitment_amount,
              s.created_at = $created_at,
              s.updated_at = $updated_at
        `;
        
        await session.run(query, {
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
      console.log(`✅ Migrated ${subscriptions.length} subscriptions`);
      
    } finally {
      await session.close();
    }
  }

  private async createUserCentricRelationships(): Promise<void> {
    console.log('🔗 Creating tenant-centric relationships...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      // 1. Create Entity -> Fund relationships based on subscription data (one per unique entity-fund pair)
      console.log('🏛️ Creating Entity -> Fund relationships based on subscriptions...');
      const entityFundQuery = `
        MATCH (ue:UserEntity), (uf:UserFund), (s:Subscription)
        WHERE ue.tenant_id = s.tenant_id 
          AND uf.tenant_id = s.tenant_id
          AND ue.investment_entity = s.investment_entity
          AND uf.fund_name = s.fund_name
        WITH DISTINCT ue, uf, s
        WITH DISTINCT ue, uf
        MERGE (ue)-[:INVESTED_IN {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const entityFundResult = await session.run(entityFundQuery);
      const entityFundCount = entityFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityFundCount} Entity->Fund relationships`);
      
      // 2. Create Fund -> Subscription relationships (one per unique fund-subscription pair)
      console.log('💰 Creating Fund -> Subscription relationships...');
      const fundSubscriptionQuery = `
        MATCH (uf:UserFund), (s:Subscription)
        WHERE uf.tenant_id = s.tenant_id AND uf.fund_name = s.fund_name
        WITH DISTINCT uf, s
        MERGE (uf)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const fundSubscriptionResult = await session.run(fundSubscriptionQuery);
      const fundSubscriptionCount = fundSubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${fundSubscriptionCount} Fund->Subscription relationships`);
      
      // 3. Create Entity -> Subscription relationships (one per unique entity-subscription pair)
      console.log('🏛️ Creating Entity -> Subscription relationships...');
      const entitySubscriptionQuery = `
        MATCH (ue:UserEntity), (s:Subscription)
        WHERE ue.tenant_id = s.tenant_id AND ue.investment_entity = s.investment_entity
        WITH DISTINCT ue, s
        MERGE (ue)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const entitySubscriptionResult = await session.run(entitySubscriptionQuery);
      const entitySubscriptionCount = entitySubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entitySubscriptionCount} Entity->Subscription relationships`);
      
      // 4. Create Tenant -> Fund INTEREST relationships for funds without subscriptions
      console.log('💡 Creating Tenant -> Fund INTEREST relationships...');
      const interestQuery = `
        MATCH (t:Tenant), (uf:UserFund)
        WHERE t.id = uf.tenant_id
        AND NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        MERGE (t)-[:INTEREST {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const interestResult = await session.run(interestQuery);
      const interestCount = interestResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${interestCount} Tenant->Fund INTEREST relationships`);
      
      console.log(`\n📊 Total relationships created: ${entityFundCount + fundSubscriptionCount + entitySubscriptionCount + interestCount}`);
      
    } finally {
      await session.close();
    }
  }

  private async verifyMigration(): Promise<void> {
    console.log(`🔍 Verifying user-centric migration in ${this.database} database...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      // Count nodes
      const userCount = await session.run('MATCH (u:User) RETURN count(u) as count');
      const tenantCount = await session.run('MATCH (t:Tenant) RETURN count(t) as count');
      const entityCount = await session.run('MATCH (ue:UserEntity) RETURN count(ue) as count');
      const fundCount = await session.run('MATCH (uf:UserFund) RETURN count(uf) as count');
      const subscriptionCount = await session.run('MATCH (s:Subscription) RETURN count(s) as count');
      
      // Count relationships
      const controlsCount = await session.run('MATCH ()-[r:CONTROLS]->() RETURN count(r) as count');
      const investsInCount = await session.run('MATCH ()-[r:INVESTS_IN]->() RETURN count(r) as count');
      const hasSubscriptionCount = await session.run('MATCH ()-[r:HAS_SUBSCRIPTION]->() RETURN count(r) as count');
      
      console.log('📊 Migration Verification Results:');
      console.log(`   👥 Users: ${userCount.records[0].get('count').toNumber()}`);
      console.log(`   🏢 Tenants: ${tenantCount.records[0].get('count').toNumber()}`);
      console.log(`   🏛️ User Entities: ${entityCount.records[0].get('count').toNumber()}`);
      console.log(`   💰 User Funds: ${fundCount.records[0].get('count').toNumber()}`);
      console.log(`   📋 Subscriptions: ${subscriptionCount.records[0].get('count').toNumber()}`);
      console.log(`   🔗 CONTROLS relationships: ${controlsCount.records[0].get('count').toNumber()}`);
      console.log(`   🔗 INVESTS_IN relationships: ${investsInCount.records[0].get('count').toNumber()}`);
      console.log(`   🔗 HAS_SUBSCRIPTION relationships: ${hasSubscriptionCount.records[0].get('count').toNumber()}`);
      
      console.log('✅ User-centric migration verification successful!');
      
    } finally {
      await session.close();
    }
  }

  private async showSampleUserCentricData(limit: number = 5): Promise<void> {
    console.log(`🔍 Showing sample user-centric data from ${this.database} database (limit: ${limit})...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const query = `
        MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        RETURN 
          u.first_name + ' ' + u.last_name as user_name,
          ue.investment_entity as entity_name,
          uf.fund_name as fund_name,
          s.commitment_amount as commitment_amount,
          s.as_of_date as investment_date
        ORDER BY s.as_of_date DESC
        LIMIT $limit
      `;
      
      const results = await session.run(query, { limit: neo4j.int(limit) });

      console.log(`📋 Sample User-Centric Data (${this.database} database):`);
      results.records.forEach((record: any, index: number) => {
        const data = record.toObject();
        console.log(`   ${index + 1}. User: ${data.user_name}`);
        console.log(`      Entity: ${data.entity_name}`);
        console.log(`      Fund: ${data.fund_name}`);
        console.log(`      Commitment: $${data.commitment_amount}`);
        console.log(`      Date: ${data.investment_date}`);
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
      limit = parseInt(arg, 10);
    }
  }

  const migration = new UserCentricMigration('neo4j');
  try {
    await migration.runMigration({ limit, skipSchema });
  } catch (error) {
    console.error('❌ User-centric migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
