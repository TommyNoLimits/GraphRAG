import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

dotenv.config();

interface UserEntity {
  id: number;
  investment_entity: string;
  entity_allias: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export class UserEntityCypherGenerator {
  private postgres: PostgreSQLConnection;

  constructor() {
    this.postgres = new PostgreSQLConnection();
  }

  async generateCypherQueries(limit?: number): Promise<void> {
    console.log('🏢 Generating User Entity Cypher Queries');
    console.log(`   Limit: ${limit || 'No limit'}`);

    try {
      // Test PostgreSQL connection
      console.log('🔍 Testing PostgreSQL connection...');
      const connected = await this.postgres.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to PostgreSQL');
      }

      // Fetch user entities
      console.log('📥 Fetching user entities from PostgreSQL...');
      const userEntities = await this.fetchUserEntities(limit);
      console.log(`✅ Fetched ${userEntities.length} user entities`);

      if (userEntities.length === 0) {
        console.log('⚠️ No user entities found');
        return;
      }

      // Generate schema queries
      console.log('\n📋 1. SCHEMA SETUP QUERIES');
      console.log('==========================');
      this.generateSchemaQueries();

      // Generate data queries
      console.log('\n📋 2. DATA MIGRATION QUERIES');
      console.log('============================');
      this.generateDataQueries(userEntities);

      // Generate verification queries
      console.log('\n📋 3. VERIFICATION QUERIES');
      console.log('==========================');
      this.generateVerificationQueries();

      console.log('\n🎉 Cypher queries generated successfully!');
      console.log('\n📝 Instructions:');
      console.log('1. Open Neo4j Browser: http://localhost:7474');
      console.log('2. Copy and paste the queries above in order');
      console.log('3. Run each query by clicking the play button');

    } catch (error) {
      console.error('❌ Failed to generate queries:', error);
    } finally {
      await this.postgres.close();
    }
  }

  private generateSchemaQueries(): void {
    const schemaQueries = [
      '-- Create constraints and indexes for UserEntity',
      'CREATE CONSTRAINT user_entity_id_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE ue.id IS UNIQUE;',
      'CREATE CONSTRAINT user_entity_investment_entity_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE ue.investment_entity IS UNIQUE;',
      'CREATE INDEX user_entity_tenant_id IF NOT EXISTS FOR (ue:UserEntity) ON (ue.tenant_id);',
      'CREATE INDEX user_entity_alias IF NOT EXISTS FOR (ue:UserEntity) ON (ue.entity_allias);',
      '',
      '-- Note: If any constraint already exists, you can ignore the error'
    ];

    schemaQueries.forEach(query => console.log(query));
  }

  private generateDataQueries(userEntities: UserEntity[]): void {
    console.log('-- Create UserEntity nodes and relationships');
    console.log('-- Run this query to create all user entities:');
    console.log('');

    const query = `
UNWIND $userEntities AS entity
MERGE (ue:UserEntity {id: entity.id})
SET ue.investment_entity = entity.investment_entity,
    ue.entity_allias = entity.entity_allias,
    ue.created_at = entity.created_at,
    ue.updated_at = entity.updated_at,
    ue.tenant_id = entity.tenant_id

MERGE (t:Tenant {id: entity.tenant_id})
MERGE (ue)-[:BELONGS_TO]->(t)

RETURN count(ue) as created_entities`;

    console.log(query);
    console.log('');

    // Generate the data parameter
    console.log('-- Data parameter (copy this JSON):');
    console.log(JSON.stringify({ userEntities }, null, 2));
    console.log('');

    // Generate individual queries for each entity
    console.log('-- Alternative: Individual queries for each entity');
    console.log('-- (Use this if the batch query doesn\'t work)');
    console.log('');

    userEntities.forEach((entity, index) => {
      console.log(`-- Entity ${index + 1}: ${entity.investment_entity}`);
      console.log(`MERGE (ue${index + 1}:UserEntity {id: ${entity.id}})`);
      console.log(`SET ue${index + 1}.investment_entity = '${entity.investment_entity.replace(/'/g, "\\'")}',`);
      console.log(`    ue${index + 1}.entity_allias = '${entity.entity_allias.replace(/'/g, "\\'")}',`);
      console.log(`    ue${index + 1}.created_at = '${entity.created_at}',`);
      console.log(`    ue${index + 1}.updated_at = '${entity.updated_at}',`);
      console.log(`    ue${index + 1}.tenant_id = '${entity.tenant_id}'`);
      console.log(`MERGE (t${index + 1}:Tenant {id: '${entity.tenant_id}'})`);
      console.log(`MERGE (ue${index + 1})-[:BELONGS_TO]->(t${index + 1});`);
      console.log('');
    });
  }

  private generateVerificationQueries(): void {
    const verificationQueries = [
      '-- Verify the migration',
      'MATCH (ue:UserEntity) RETURN count(ue) as total_user_entities;',
      '',
      '-- Show sample user entities',
      'MATCH (ue:UserEntity)-[:BELONGS_TO]->(t:Tenant)',
      'RETURN ue.id, ue.investment_entity, ue.entity_allias, t.id as tenant_id',
      'ORDER BY ue.created_at DESC',
      'LIMIT 10;',
      '',
      '-- Show user entities by tenant',
      'MATCH (ue:UserEntity)-[:BELONGS_TO]->(t:Tenant)',
      'RETURN t.id as tenant_id, collect(ue.investment_entity) as entities, count(ue) as entity_count',
      'ORDER BY entity_count DESC;',
      '',
      '-- Visualize the graph',
      'MATCH (ue:UserEntity)-[:BELONGS_TO]->(t:Tenant)',
      'RETURN ue, t',
      'LIMIT 25;'
    ];

    verificationQueries.forEach(query => console.log(query));
  }

  private async fetchUserEntities(limit?: number): Promise<UserEntity[]> {
    try {
      const query = limit 
        ? `SELECT * FROM user_entities ORDER BY created_at DESC LIMIT $1`
        : `SELECT * FROM user_entities ORDER BY created_at DESC`;
      
      const params = limit ? [limit] : [];
      const results = await this.postgres.query(query, params);
      
      return results.map((row: any) => ({
        id: row.id,
        investment_entity: row.investment_entity,
        entity_allias: row.entity_allias,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tenant_id: row.tenant_id
      }));
    } catch (error) {
      console.error('❌ Failed to fetch user entities:', error);
      throw error;
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  const generator = new UserEntityCypherGenerator();
  await generator.generateCypherQueries(limit);
}

if (require.main === module) {
  main().catch(console.error);
}
