import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface UserData {
  id: string;
  tenant_id: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  email_confirmed: boolean;
  phone_number?: string;
  phone_number_confirmed: boolean;
  two_factor_enabled: boolean;
  lockout_enabled: boolean;
  access_failed_count: number;
  is_mfa_enabled: boolean;
  call_notifications: boolean;
  distribution_notifications: boolean;
  statement_notifications: boolean;
  new_investment_notifications: boolean;
  new_opportunity_notifications: boolean;
  pipeline_notifications: boolean;
  forwarding_email?: string;
  plaid_consent: boolean;
  plaid_consent_date?: string;
}

class SimpleUserMigration {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;

  constructor() {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
  }

  /**
   * Initialize connections to both databases
   */
  async initialize(): Promise<boolean> {
    console.log('🚀 Initializing migration...');
    
    // Test PostgreSQL connection
    const postgresConnected = await this.postgres.testConnection();
    if (!postgresConnected) {
      console.error('❌ Failed to connect to PostgreSQL');
      return false;
    }

    // Test Neo4j connection
    const neo4jConnected = await this.neo4j.connect();
    if (!neo4jConnected) {
      console.error('❌ Failed to connect to Neo4j');
      return false;
    }

    // Test Neo4j connection
    const neo4jTest = await this.neo4j.testConnection();
    if (!neo4jTest) {
      console.error('❌ Neo4j connection test failed');
      return false;
    }

    console.log('✅ Both database connections established');
    return true;
  }

  /**
   * Create Neo4j schema for users
   */
  async createUserSchema(): Promise<boolean> {
    console.log('📋 Creating Neo4j user schema...');
    
    try {
      const session = this.neo4j['driver']!.session();
      
      // Create constraints for users
      await session.run(`
        CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS 
        FOR (t:Tenant) REQUIRE t.id IS UNIQUE
      `);

      // Create indexes for performance
      await session.run(`
        CREATE INDEX user_email_index IF NOT EXISTS 
        FOR (u:User) ON (u.email)
      `);
      
      await session.run(`
        CREATE INDEX user_username_index IF NOT EXISTS 
        FOR (u:User) ON (u.username)
      `);

      await session.run(`
        CREATE INDEX user_tenant_index IF NOT EXISTS 
        FOR (u:User) ON (u.tenant_id)
      `);

      await session.close();
      console.log('✅ User schema created successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to create user schema:', error);
      return false;
    }
  }

  /**
   * Fetch users from PostgreSQL
   */
  async fetchUsers(limit?: number): Promise<UserData[]> {
    console.log('📥 Fetching users from PostgreSQL...');
    
    try {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const query = `
        SELECT 
          id,
          tenant_id,
          username,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          email_confirmed,
          phone_number,
          phone_number_confirmed,
          two_factor_enabled,
          lockout_enabled,
          access_failed_count,
          is_mfa_enabled,
          call_notifications,
          distribution_notifications,
          statement_notifications,
          new_investment_notifications,
          new_opportunity_notifications,
          pipeline_notifications,
          forwarding_email,
          plaid_consent,
          plaid_consent_date
        FROM users 
        ORDER BY created_at DESC
        ${limitClause}
      `;
      
      const users = await this.postgres.query(query);
      console.log(`✅ Fetched ${users.length} users from PostgreSQL`);
      return users;
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      return [];
    }
  }

  /**
   * Create user nodes in Neo4j
   */
  async createUserNodes(users: UserData[]): Promise<number> {
    console.log(`📤 Creating ${users.length} user nodes in Neo4j...`);
    
    if (users.length === 0) {
      console.log('⚠️ No users to migrate');
      return 0;
    }

    try {
      const session = this.neo4j['driver']!.session();
      let createdCount = 0;

      // Process users in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        const query = `
          UNWIND $users AS user
          MERGE (u:User {id: user.id})
          SET u.tenant_id = user.tenant_id,
              u.username = user.username,
              u.email = user.email,
              u.first_name = user.first_name,
              u.last_name = user.last_name,
              u.created_at = user.created_at,
              u.updated_at = user.updated_at,
              u.email_confirmed = user.email_confirmed,
              u.phone_number = user.phone_number,
              u.phone_number_confirmed = user.phone_number_confirmed,
              u.two_factor_enabled = user.two_factor_enabled,
              u.lockout_enabled = user.lockout_enabled,
              u.access_failed_count = user.access_failed_count,
              u.is_mfa_enabled = user.is_mfa_enabled,
              u.call_notifications = user.call_notifications,
              u.distribution_notifications = user.distribution_notifications,
              u.statement_notifications = user.statement_notifications,
              u.new_investment_notifications = user.new_investment_notifications,
              u.new_opportunity_notifications = user.new_opportunity_notifications,
              u.pipeline_notifications = user.pipeline_notifications,
              u.forwarding_email = user.forwarding_email,
              u.plaid_consent = user.plaid_consent,
              u.plaid_consent_date = CASE WHEN user.plaid_consent_date IS NOT NULL THEN user.plaid_consent_date ELSE null END
          
          MERGE (t:Tenant {id: user.tenant_id})
          MERGE (u)-[:BELONGS_TO]->(t)
          
          RETURN count(u) as created
        `;

        // Convert Map objects to plain objects using JSON serialization
        const plainBatch = JSON.parse(JSON.stringify(batch));
        
        const result = await session.run(query, { users: plainBatch });
        const batchCreated = result.records[0].get('created').toNumber();
        createdCount += batchCreated;
        
        console.log(`📦 Processed batch ${Math.floor(i/batchSize) + 1}: ${batchCreated} users created`);
      }

      await session.close();
      console.log(`✅ Successfully created ${createdCount} user nodes in Neo4j`);
      return createdCount;
    } catch (error) {
      console.error('❌ Failed to create user nodes:', error);
      return 0;
    }
  }

  /**
   * Verify the migration by counting nodes
   */
  async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration...');
    
    try {
      const session = this.neo4j['driver']!.session();
      
      // Count total users
      const userCountResult = await session.run('MATCH (u:User) RETURN count(u) as count');
      const userCount = userCountResult.records[0].get('count').toNumber();
      
      // Count tenants
      const tenantCountResult = await session.run('MATCH (t:Tenant) RETURN count(t) as count');
      const tenantCount = tenantCountResult.records[0].get('count').toNumber();
      
      // Count relationships
      const relationshipCountResult = await session.run('MATCH (u:User)-[:BELONGS_TO]->(t:Tenant) RETURN count(*) as count');
      const relationshipCount = relationshipCountResult.records[0].get('count').toNumber();
      
      await session.close();
      
      console.log('📊 Migration Verification Results:');
      console.log(`   👥 Users: ${userCount}`);
      console.log(`   🏢 Tenants: ${tenantCount}`);
      console.log(`   🔗 User-Tenant relationships: ${relationshipCount}`);
      
      if (userCount > 0) {
        console.log('✅ Migration verification successful!');
      } else {
        console.log('⚠️ No users found in Neo4j');
      }
    } catch (error) {
      console.error('❌ Migration verification failed:', error);
    }
  }

  /**
   * Run a sample query to show user data
   */
  async showSampleUsers(limit: number = 5): Promise<void> {
    console.log(`🔍 Showing sample users (limit: ${limit})...`);
    
    try {
      const query = `
        MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
        RETURN u.id as id, 
               u.username as username, 
               u.email as email, 
               u.first_name as first_name, 
               u.last_name as last_name,
               u.created_at as created_at,
               t.id as tenant_id
        ORDER BY u.created_at DESC
        LIMIT $limit
      `;
      
      const results = await this.neo4j.executeQuery(query, { limit: Math.floor(Number(limit)) });
      
      console.log('📋 Sample Users:');
      results.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name || ''} ${user.last_name || ''} (${user.email || user.username || 'No email'})`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Tenant: ${user.tenant_id}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to show sample users:', error);
    }
  }

  /**
   * Clean up connections
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up connections...');
    await this.postgres.close();
    await this.neo4j.close();
    console.log('✅ Cleanup complete');
  }

  /**
   * Run the complete migration process
   */
  async runMigration(options: { limit?: number | undefined; skipSchema?: boolean } = {}): Promise<void> {
    try {
      // Initialize connections
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize database connections');
      }

      // Create schema (unless skipped)
      if (!options.skipSchema) {
        const schemaCreated = await this.createUserSchema();
        if (!schemaCreated) {
          throw new Error('Failed to create Neo4j schema');
        }
      }

      // Fetch users from PostgreSQL
      const users = await this.fetchUsers(options.limit);
      if (users.length === 0) {
        console.log('⚠️ No users found to migrate');
        return;
      }

      // Create user nodes in Neo4j
      const createdCount = await this.createUserNodes(users);
      
      // Verify migration
      await this.verifyMigration();
      
      // Show sample data
      await this.showSampleUsers(options.limit || 5);
      
      console.log(`🎉 Migration completed successfully! Created ${createdCount} user nodes.`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  const migration = new SimpleUserMigration();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const skipSchemaArg = args.includes('--skip-schema');
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  
  console.log('🚀 Starting Simple User Migration');
  console.log(`   Limit: ${limit || 'No limit'}`);
  console.log(`   Skip Schema: ${skipSchemaArg}`);
  console.log('');
  
  try {
    await migration.runMigration({ 
      limit: limit || undefined, 
      skipSchema: skipSchemaArg 
    });
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { SimpleUserMigration };
