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
      
      // Debug: Check what we're getting from PostgreSQL
      console.log('🔍 Sample tenant data:', JSON.stringify(tenants[0], null, 2));
      
      // Test with just the first tenant
      const firstTenant = tenants[0];
      console.log('🔍 First tenant cleaned:', JSON.stringify(firstTenant, null, 2));
      
      const query = `
        MERGE (t:Tenant {id: $id})
        SET t.name = $name,
            t.created_at = $created_at,
            t.updated_at = $updated_at
        RETURN t
      `;
      
      const result = await session.run(query, {
        id: firstTenant.id,
        name: firstTenant.name,
        created_at: DateTime.fromStandardDate(new Date(firstTenant.created_at)),
        updated_at: DateTime.fromStandardDate(new Date(firstTenant.updated_at))
      });
      console.log(`✅ Migrated 1 tenant:`, result.records[0].get('t').properties);
      
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
      
      // Test with just the first user
      const firstUser = users[0];
      console.log('🔍 First user data:', JSON.stringify(firstUser, null, 2));
      
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
        RETURN u
      `;
      
      const result = await session.run(query, {
        id: firstUser.id,
        tenant_id: firstUser.tenant_id,
        username: firstUser.username,
        email: firstUser.email,
        first_name: firstUser.first_name,
        last_name: firstUser.last_name,
        created_at: DateTime.fromStandardDate(new Date(firstUser.created_at)),
        updated_at: DateTime.fromStandardDate(new Date(firstUser.updated_at))
      });
      console.log(`✅ Migrated 1 user:`, result.records[0].get('u').properties);
      
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
      
      // Test with just the first entity
      const firstEntity = entities[0];
      console.log('🔍 First entity data:', JSON.stringify(firstEntity, null, 2));
      
      const query = `
        MERGE (ue:UserEntity {id: $id})
        SET ue.tenant_id = $tenant_id,
            ue.investment_entity = $investment_entity,
            ue.entity_allias = $entity_allias,
            ue.created_at = $created_at,
            ue.updated_at = $updated_at
        MERGE (t:Tenant {id: $tenant_id})
        MERGE (ue)-[:BELONGS_TO]->(t)
        RETURN ue
      `;
      
      const result = await session.run(query, {
        id: firstEntity.id,
        tenant_id: firstEntity.tenant_id,
        investment_entity: firstEntity.investment_entity,
        entity_allias: firstEntity.entity_allias,
        created_at: DateTime.fromStandardDate(new Date(firstEntity.created_at)),
        updated_at: DateTime.fromStandardDate(new Date(firstEntity.updated_at))
      });
      console.log(`✅ Migrated 1 user entity:`, result.records[0].get('ue').properties);
      
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
      
      // Test with just the first fund
      const firstFund = funds[0];
      console.log('🔍 First fund data:', JSON.stringify(firstFund, null, 2));
      
      const query = `
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
        RETURN uf
      `;
      
      const result = await session.run(query, {
        id: firstFund.id,
        tenant_id: firstFund.tenant_id,
        fund_name: firstFund.fund_name,
        stage: firstFund.stage,
        investment_type: firstFund.investment_type,
        fund_type: firstFund.fund_type,
        created_at: DateTime.fromStandardDate(new Date(firstFund.created_at)),
        updated_at: DateTime.fromStandardDate(new Date(firstFund.updated_at))
      });
      console.log(`✅ Migrated 1 user fund:`, result.records[0].get('uf').properties);
      
    } finally {
      await session.close();
    }
  }

  private async migrateSubscriptions(limit?: number): Promise<void> {
    console.log('📋 Migrating subscriptions...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const subscriptions = await this.postgres.query(`
        SELECT s.*, uf.stage
        FROM subscriptions s
        INNER JOIN user_funds uf ON s.tenant_id = uf.tenant_id AND s.fund_name = uf.fund_name
        WHERE uf.stage = 'Invested'
        ${limitClause}
      `);
      
      // Test with just the first subscription
      const firstSubscription = subscriptions[0];
      console.log('🔍 First subscription data:', JSON.stringify(firstSubscription, null, 2));
      
      const query = `
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
        RETURN s
      `;
      
      const result = await session.run(query, {
        id: firstSubscription.id,
        tenant_id: firstSubscription.tenant_id,
        fund_name: firstSubscription.fund_name,
        investment_entity: firstSubscription.investment_entity,
        as_of_date: DateTime.fromStandardDate(new Date(firstSubscription.as_of_date)),
        commitment_amount: firstSubscription.commitment_amount,
        created_at: DateTime.fromStandardDate(new Date(firstSubscription.created_at)),
        updated_at: DateTime.fromStandardDate(new Date(firstSubscription.updated_at))
      });
      console.log(`✅ Migrated 1 subscription:`, result.records[0].get('s').properties);
      
    } finally {
      await session.close();
    }
  }

  private async createUserCentricRelationships(): Promise<void> {
    console.log('🔗 Creating user-centric relationships...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    
    try {
      // User -> Entity relationships
      const userEntityQuery = `
        MATCH (u:User), (ue:UserEntity)
        WHERE u.tenant_id = ue.tenant_id
        MERGE (u)-[:CONTROLS {created_at: datetime()}]->(ue)
        RETURN count(*) as created
      `;
      
      const userEntityResult = await session.run(userEntityQuery);
      const userEntityCount = userEntityResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${userEntityCount} User->Entity relationships`);
      
      // Entity -> Fund relationships (for invested funds)
      const entityFundQuery = `
        MATCH (ue:UserEntity), (uf:UserFund)
        WHERE ue.tenant_id = uf.tenant_id
        AND uf.stage = 'Invested'
        MERGE (ue)-[:INVESTS_IN {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const entityFundResult = await session.run(entityFundQuery);
      const entityFundCount = entityFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityFundCount} Entity->Fund relationships`);
      
      // Fund -> Subscription relationships
      const fundSubscriptionQuery = `
        MATCH (uf:UserFund), (s:Subscription)
        WHERE uf.tenant_id = s.tenant_id 
        AND uf.fund_name = s.fund_name
        MERGE (uf)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const fundSubscriptionResult = await session.run(fundSubscriptionQuery);
      const fundSubscriptionCount = fundSubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${fundSubscriptionCount} Fund->Subscription relationships`);
      
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
