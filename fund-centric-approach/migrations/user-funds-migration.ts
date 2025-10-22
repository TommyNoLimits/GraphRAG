import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';
import { UserFund } from '../types';
import neo4j from 'neo4j-driver';

dotenv.config();

export class UserFundsMigration {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;
  private database: string;

  constructor(database: string = 'neo4j') {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
    this.database = database;
  }

  async runMigration(options: { limit?: number | undefined; skipSchema?: boolean } = {}) {
    console.log('💰 Starting User Funds Migration');
    console.log(`   Database: ${this.database}`);
    console.log(`   Limit: ${options.limit || 'No limit'}`);
    console.log(`   Skip Schema: ${options.skipSchema || false}`);

    try {
      console.log('🚀 Initializing migration...');
      await this.postgres.testConnection();
      await this.neo4j.connect();
      console.log('✅ Both database connections established');

      if (!options.skipSchema) {
        await this.createUserFundsSchema();
      }

      const userFunds = await this.fetchUserFundsFromPostgres(options.limit);
      if (userFunds.length > 0) {
        await this.createUserFundsNodes(userFunds);
      } else {
        console.log('ℹ️ No user funds found in PostgreSQL to migrate.');
      }

      await this.verifyMigration();
      await this.showSampleUserFunds(options.limit || 5);

      console.log(`🎉 User funds migration completed successfully! Created ${userFunds.length} fund nodes in ${this.database} database.`);

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

  private async createUserFundsSchema(): Promise<void> {
    console.log('📋 Creating Neo4j user funds schema...');
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      // Constraint for UserFund ID
      await session.run(`
        CREATE CONSTRAINT user_fund_id_unique IF NOT EXISTS FOR (uf:UserFund) REQUIRE uf.id IS UNIQUE
      `);
      
      // Note: Removed tenant-constrained uniqueness constraint due to duplicate fund names in PostgreSQL data
      // The data has duplicate fund names within the same tenant, so we'll handle this in the migration logic

      // Indexes for performance
      await session.run(`
        CREATE INDEX user_fund_tenant_id IF NOT EXISTS FOR (uf:UserFund) ON (uf.tenant_id)
      `);
      
      await session.run(`
        CREATE INDEX user_fund_name IF NOT EXISTS FOR (uf:UserFund) ON (uf.fund_name)
      `);
      
      await session.run(`
        CREATE INDEX user_fund_investment_type IF NOT EXISTS FOR (uf:UserFund) ON (uf.investment_type)
      `);
      
      await session.run(`
        CREATE INDEX user_fund_fund_type IF NOT EXISTS FOR (uf:UserFund) ON (uf.fund_type)
      `);

      console.log('✅ User funds schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create user funds schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async fetchUserFundsFromPostgres(limit?: number): Promise<UserFund[]> {
    console.log('📥 Fetching user funds from PostgreSQL...');
    const query = limit ? `SELECT * FROM user_funds LIMIT ${limit}` : `SELECT * FROM user_funds`;
    const result = await this.postgres.query(query);
    console.log(`✅ Fetched ${result.length} user funds from PostgreSQL`);
    return result;
  }

  private async createUserFundsNodes(userFunds: UserFund[]): Promise<number> {
    console.log(`📤 Creating ${userFunds.length} user fund nodes in ${this.database} database...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    let createdCount = 0;

    const batchSize = 50; // Smaller batch size due to many properties
    for (let i = 0; i < userFunds.length; i += batchSize) {
      const batch = userFunds.slice(i, i + batchSize);
      const plainBatch = JSON.parse(JSON.stringify(batch)); // Ensure plain objects

      const query = `
        UNWIND $userFunds AS fund
        MERGE (uf:UserFund {id: fund.id})
        SET uf.tenant_id = fund.tenant_id,
            uf.fund_name = fund.fund_name,
            uf.fund_name_allias = fund.fund_name_allias,
            uf.managed_vehicle = fund.managed_vehicle,
            uf.investment_manager_name = fund.investment_manager_name,
            uf.general_partner = fund.general_partner,
            uf.series_fund = fund.series_fund,
            uf.fund_series_name = fund.fund_series_name,
            uf.investment_summary = fund.investment_summary,
            uf.gics_sector = fund.gics_sector,
            uf.geography = fund.geography,
            uf.esg_mandate = fund.esg_mandate,
            uf.country = fund.country,
            uf.fund_series_number = fund.fund_series_number,
            uf.side_letter = fund.side_letter,
            uf.blocker = fund.blocker,
            uf.auditor = fund.auditor,
            uf.legal = fund.legal,
            uf.co_investments = fund.co_investments,
            uf.key_persons = fund.key_persons,
            uf.eligible_investors = fund.eligible_investors,
            uf.inception_year = fund.inception_year,
            uf.liquidity = fund.liquidity,
            uf.lockup_period_flag = fund.lockup_period_flag,
            uf.lockup_period_duration = fund.lockup_period_duration,
            uf.withdrawal_terms = fund.withdrawal_terms,
            uf.early_withdrawal_fee_flag = fund.early_withdrawal_fee_flag,
            uf.early_withdrawal_fee = fund.early_withdrawal_fee,
            uf.investment_type = fund.investment_type,
            uf.investment_subtype_fund = fund.investment_subtype_fund,
            uf.investment_subtype_spv = fund.investment_subtype_spv,
            uf.investment_subtype_direct = fund.investment_subtype_direct,
            uf.investment_subtype_other = fund.investment_subtype_other,
            uf.fund_type = fund.fund_type,
            uf.direct_type = fund.direct_type,
            uf.investment_period = fund.investment_period,
            uf.investment_extensions_flag = fund.investment_extensions_flag,
            uf.investment_extensions = fund.investment_extensions,
            uf.perpetual_flag = fund.perpetual_flag,
            uf.fund_term = fund.fund_term,
            uf.term_extensions_flag = fund.term_extensions_flag,
            uf.term_extensions = fund.term_extensions,
            uf.management_fee_flag = fund.management_fee_flag,
            uf.management_fee_breaks = fund.management_fee_breaks,
            uf.management_fee = fund.management_fee,
            uf.management_fee_on = fund.management_fee_on,
            uf.management_fee_change_flag = fund.management_fee_change_flag,
            uf.management_fee_change_to = fund.management_fee_change_to,
            uf.management_fee_change_on = fund.management_fee_change_on,
            uf.management_fee_change_after = fund.management_fee_change_after,
            uf.carry_fee_flag = fund.carry_fee_flag,
            uf.carry_fee = fund.carry_fee,
            uf.carry_ratchet_flag = fund.carry_ratchet_flag,
            uf.ratcheted_carry_fee = fund.ratcheted_carry_fee,
            uf.ratcheted_carry_fee_when = fund.ratcheted_carry_fee_when,
            uf.preferred_return_flag = fund.preferred_return_flag,
            uf.preferred_return = fund.preferred_return,
            uf.catch_up_provision = fund.catch_up_provision,
            uf.high_water_mark = fund.high_water_mark,
            uf.capital_recycling = fund.capital_recycling,
            uf.leverage = fund.leverage,
            uf.investment_minimum = fund.investment_minimum,
            uf.gp_commitment_flag = fund.gp_commitment_flag,
            uf.gp_commitment = fund.gp_commitment,
            uf.harvest_or_term = fund.harvest_or_term,
            uf.direct_investment_name = fund.direct_investment_name,
            uf.gp_commitment_amount = fund.gp_commitment_amount,
            uf.created_at = fund.created_at,
            uf.updated_at = fund.updated_at,
            uf.favorite = fund.favorite,
            uf.stage = fund.stage,
            uf.dd_call = fund.dd_call,
            uf.legal_and_gov_doc = fund.legal_and_gov_doc,
            uf.sub_doc_received = fund.sub_doc_received,
            uf.pass_reason = fund.pass_reason,
            uf.pass_explanation = fund.pass_explanation,
            uf.stage_last_updated = fund.stage_last_updated,
            uf.investment_notes = fund.investment_notes
        MERGE (t:Tenant {id: fund.tenant_id})
        MERGE (uf)-[:BELONGS_TO_TENANT]->(t)
        RETURN count(uf) as created
      `;

      const result = await session.run(query, { userFunds: plainBatch });
      const batchCreated = result.records[0].get('created').toNumber();
      createdCount += batchCreated;
      console.log(`📦 Processed batch ${Math.floor(i / batchSize) + 1}: ${batchCreated} funds created`);
    }

    await session.close();
    console.log(`✅ Successfully created ${createdCount} user fund nodes in ${this.database} database`);
    return createdCount;
  }

  private async verifyMigration(): Promise<void> {
    console.log(`🔍 Verifying user funds migration in ${this.database} database...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      const fundCountResult = await session.run('MATCH (uf:UserFund) RETURN count(uf) as count');
      const fundCount = fundCountResult.records[0].get('count').toNumber();

      const tenantRelationshipCountResult = await session.run('MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant) RETURN count(*) as count');
      const tenantRelationshipCount = tenantRelationshipCountResult.records[0].get('count').toNumber();

      console.log('📊 Migration Verification Results:');
      console.log(`   💰 User Funds: ${fundCount}`);
      console.log(`   🔗 Fund-Tenant relationships: ${tenantRelationshipCount}`);

      if (fundCount > 0 && fundCount === tenantRelationshipCount) {
        console.log('✅ User funds migration verification successful!');
      } else {
        console.warn('⚠️ User funds migration verification showed discrepancies.');
      }
    } finally {
      await session.close();
    }
  }

  private async showSampleUserFunds(limit: number = 5): Promise<void> {
    console.log(`🔍 Showing sample user funds from ${this.database} database (limit: ${limit})...`);
    const session = this.neo4j['driver']!.session({ database: this.database });
    try {
      const query = `
        MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)
        RETURN uf.id as id,
               uf.fund_name as fund_name,
               uf.fund_name_allias as fund_name_allias,
               uf.investment_type as investment_type,
               uf.fund_type as fund_type,
               uf.investment_manager_name as investment_manager_name,
               uf.created_at as created_at,
               t.id as tenant_id
        ORDER BY uf.created_at DESC
        LIMIT $limit
      `;
      const results = await session.run(query, { limit: neo4j.int(limit) });

      console.log(`📋 Sample User Funds (${this.database} database):`);
      results.records.forEach((record: any, index: number) => {
        const fund = record.toObject();
        console.log(`   ${index + 1}. ID: ${fund.id}, Fund: ${fund.fund_name}`);
        console.log(`      Alias: ${fund.fund_name_allias || 'N/A'}`);
        console.log(`      Type: ${fund.investment_type || 'N/A'} (${fund.fund_type || 'N/A'})`);
        console.log(`      Manager: ${fund.investment_manager_name || 'N/A'}`);
        console.log(`      Tenant: ${fund.tenant_id}`);
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
      // Handle numeric arguments (e.g., "5" from npm run migrate:user-funds:limit 5)
      limit = parseInt(arg, 10);
    }
  }

  const migration = new UserFundsMigration('neo4j');
  try {
    await migration.runMigration({ limit, skipSchema });
  } catch (error) {
    console.error('❌ User funds migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
