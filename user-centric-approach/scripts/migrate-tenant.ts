#!/usr/bin/env ts-node
/**
 * Tenant-Specific Migration
 * 
 * This script migrates data for a specific tenant only.
 * Usage: ts-node scripts/migrate-tenant.ts --tenant-id=fd68d10f-0780-4140-b393-3adf8109df4f
 */

import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';
import { DateTime } from 'neo4j-driver';

dotenv.config();

/**
 * Utility function to handle null values consistently for GraphRAG
 * Replaces null/undefined values with "__NULL__" placeholder to ensure
 * all properties are preserved in Neo4j for consistent schema
 */
function handleNullValues(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = "__NULL__";
    } else if (value instanceof Date) {
      result[key] = DateTime.fromStandardDate(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function migrateTenant(tenantId: string) {
  console.log(`🏢 Starting Tenant-Specific Migration for: ${tenantId}`);
  
  const postgres = new PostgreSQLConnection();
  const neo4j = new Neo4jConnection();

  try {
    console.log('🔍 Testing connections...');
    await postgres.testConnection();
    await neo4j.connect();
    console.log('✅ Both connections established\n');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('✅ Data cleared');
    } finally {
      await session.close();
    }

    // 1. Migrate the specific tenant
    console.log(`\n🏢 Migrating tenant: ${tenantId}`);
    const tenantQuery = `SELECT * FROM tenants WHERE id = $1`;
    const tenants = await postgres.query(tenantQuery, [tenantId]);
    
    if (tenants.length === 0) {
      throw new Error(`Tenant ${tenantId} not found in PostgreSQL`);
    }
    
    const tenant = tenants[0];
    const tenantSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      await tenantSession.run(`
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
      console.log(`✅ Migrated tenant: ${tenant.name}`);
    } finally {
      await tenantSession.close();
    }

    // 2. Migrate users for this tenant
    console.log(`\n👥 Migrating users for tenant: ${tenantId}`);
    const usersQuery = `SELECT * FROM users WHERE tenant_id = $1`;
    const users = await postgres.query(usersQuery, [tenantId]);
    console.log(`📊 Found ${users.length} users for this tenant`);
    
    const userSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const user of users) {
        await userSession.run(`
          MERGE (u:User {id: $id})
          SET u.tenant_id = $tenant_id,
              u.username = $username,
              u.normalized_username = $normalized_username,
              u.email = $email,
              u.normalized_email = $normalized_email,
              u.email_confirmed = $email_confirmed,
              u.password_hash = $password_hash,
              u.security_stamp = $security_stamp,
              u.concurrency_stamp = $concurrency_stamp,
              u.phone_number = $phone_number,
              u.phone_number_confirmed = $phone_number_confirmed,
              u.two_factor_enabled = $two_factor_enabled,
              u.lockout_end = $lockout_end,
              u.lockout_enabled = $lockout_enabled,
              u.access_failed_count = $access_failed_count,
              u.is_mfa_enabled = $is_mfa_enabled,
              u.mfa_code = $mfa_code,
              u.mfa_code_expiry = $mfa_code_expiry,
              u.first_name = $first_name,
              u.last_name = $last_name,
              u.call_notifications = $call_notifications,
              u.distribution_notifications = $distribution_notifications,
              u.statement_notifications = $statement_notifications,
              u.new_investment_notifications = $new_investment_notifications,
              u.new_opportunity_notifications = $new_opportunity_notifications,
              u.pipeline_notifications = $pipeline_notifications,
              u.forwarding_email = $forwarding_email,
              u.plaid_consent = $plaid_consent,
              u.plaid_consent_date = $plaid_consent_date,
              u.created_at = $created_at,
              u.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (u)-[:BELONGS_TO {created_at: $created_at}]->(t)
        `, handleNullValues({
          id: user.id,
          tenant_id: user.tenant_id,
          username: user.username,
          normalized_username: user.normalized_username,
          email: user.email,
          normalized_email: user.normalized_email,
          email_confirmed: user.email_confirmed,
          password_hash: user.password_hash,
          security_stamp: user.security_stamp,
          concurrency_stamp: user.concurrency_stamp,
          phone_number: user.phone_number,
          phone_number_confirmed: user.phone_number_confirmed,
          two_factor_enabled: user.two_factor_enabled,
          lockout_end: user.lockout_end ? new Date(user.lockout_end) : null,
          lockout_enabled: user.lockout_enabled,
          access_failed_count: user.access_failed_count,
          is_mfa_enabled: user.is_mfa_enabled,
          mfa_code: user.mfa_code,
          mfa_code_expiry: user.mfa_code_expiry ? new Date(user.mfa_code_expiry) : null,
          first_name: user.first_name,
          last_name: user.last_name,
          call_notifications: user.call_notifications,
          distribution_notifications: user.distribution_notifications,
          statement_notifications: user.statement_notifications,
          new_investment_notifications: user.new_investment_notifications,
          new_opportunity_notifications: user.new_opportunity_notifications,
          pipeline_notifications: user.pipeline_notifications,
          forwarding_email: user.forwarding_email,
          plaid_consent: user.plaid_consent,
          plaid_consent_date: user.plaid_consent_date ? new Date(user.plaid_consent_date) : null,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at)
        }));
      }
      console.log(`✅ Migrated ${users.length} users`);
    } finally {
      await userSession.close();
    }

    // 3. Migrate entities for this tenant
    console.log(`\n🏛️ Migrating entities for tenant: ${tenantId}`);
    const entitiesQuery = `SELECT * FROM user_entities WHERE tenant_id = $1`;
    const entities = await postgres.query(entitiesQuery, [tenantId]);
    console.log(`📊 Found ${entities.length} entities for this tenant`);
    
    const entitySession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const entity of entities) {
        await entitySession.run(`
          MERGE (ue:UserEntity {id: $id})
          SET ue.tenant_id = $tenant_id,
              ue.investment_entity = $investment_entity,
              ue.entity_allias = $entity_allias,
              ue.created_at = $created_at,
              ue.updated_at = $updated_at
          MERGE (t:Tenant {id: $tenant_id})
          MERGE (t)-[:MANAGES {created_at: $created_at}]->(ue)
        `, handleNullValues({
          id: entity.id,
          tenant_id: entity.tenant_id,
          investment_entity: entity.investment_entity,
          entity_allias: entity.entity_allias,
          created_at: new Date(entity.created_at),
          updated_at: new Date(entity.updated_at)
        }));
      }
      console.log(`✅ Migrated ${entities.length} entities`);
    } finally {
      await entitySession.close();
    }

    // 4. Migrate funds for this tenant
    console.log(`\n💰 Migrating funds for tenant: ${tenantId}`);
    const fundsQuery = `SELECT * FROM user_funds WHERE tenant_id = $1`;
    const funds = await postgres.query(fundsQuery, [tenantId]);
    console.log(`📊 Found ${funds.length} funds for this tenant`);
    
    const fundSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const fund of funds) {
        await fundSession.run(`
          MERGE (uf:UserFund {id: $id})
          SET uf.tenant_id = $tenant_id,
              uf.fund_name = $fund_name,
              uf.fund_name_allias = $fund_name_allias,
              uf.managed_vehicle = $managed_vehicle,
              uf.investment_manager_name = $investment_manager_name,
              uf.general_partner = $general_partner,
              uf.series_fund = $series_fund,
              uf.fund_series_name = $fund_series_name,
              uf.investment_summary = $investment_summary,
              uf.gics_sector = $gics_sector,
              uf.geography = $geography,
              uf.esg_mandate = $esg_mandate,
              uf.country = $country,
              uf.fund_series_number = $fund_series_number,
              uf.side_letter = $side_letter,
              uf.blocker = $blocker,
              uf.auditor = $auditor,
              uf.legal = $legal,
              uf.co_investments = $co_investments,
              uf.key_persons = $key_persons,
              uf.eligible_investors = $eligible_investors,
              uf.inception_year = $inception_year,
              uf.liquidity = $liquidity,
              uf.lockup_period_flag = $lockup_period_flag,
              uf.lockup_period_duration = $lockup_period_duration,
              uf.withdrawal_terms = $withdrawal_terms,
              uf.early_withdrawal_fee_flag = $early_withdrawal_fee_flag,
              uf.early_withdrawal_fee = $early_withdrawal_fee,
              uf.investment_type = $investment_type,
              uf.investment_subtype_fund = $investment_subtype_fund,
              uf.investment_subtype_spv = $investment_subtype_spv,
              uf.investment_subtype_direct = $investment_subtype_direct,
              uf.investment_subtype_other = $investment_subtype_other,
              uf.fund_type = $fund_type,
              uf.direct_type = $direct_type,
              uf.investment_period = $investment_period,
              uf.investment_extensions_flag = $investment_extensions_flag,
              uf.investment_extensions = $investment_extensions,
              uf.perpetual_flag = $perpetual_flag,
              uf.fund_term = $fund_term,
              uf.term_extensions_flag = $term_extensions_flag,
              uf.term_extensions = $term_extensions,
              uf.management_fee_flag = $management_fee_flag,
              uf.management_fee_breaks = $management_fee_breaks,
              uf.management_fee = $management_fee,
              uf.management_fee_on = $management_fee_on,
              uf.management_fee_change_flag = $management_fee_change_flag,
              uf.management_fee_change_to = $management_fee_change_to,
              uf.management_fee_change_on = $management_fee_change_on,
              uf.management_fee_change_after = $management_fee_change_after,
              uf.carry_fee_flag = $carry_fee_flag,
              uf.carry_fee = $carry_fee,
              uf.carry_ratchet_flag = $carry_ratchet_flag,
              uf.ratcheted_carry_fee = $ratcheted_carry_fee,
              uf.ratcheted_carry_fee_when = $ratcheted_carry_fee_when,
              uf.preferred_return_flag = $preferred_return_flag,
              uf.preferred_return = $preferred_return,
              uf.catch_up_provision = $catch_up_provision,
              uf.high_water_mark = $high_water_mark,
              uf.capital_recycling = $capital_recycling,
              uf.leverage = $leverage,
              uf.investment_minimum = $investment_minimum,
              uf.gp_commitment_flag = $gp_commitment_flag,
              uf.gp_commitment = $gp_commitment,
              uf.harvest_or_term = $harvest_or_term,
              uf.direct_investment_name = $direct_investment_name,
              uf.gp_commitment_amount = $gp_commitment_amount,
              uf.favorite = $favorite,
              uf.stage = $stage,
              uf.dd_call = $dd_call,
              uf.legal_and_gov_doc = $legal_and_gov_doc,
              uf.sub_doc_received = $sub_doc_received,
              uf.pass_reason = $pass_reason,
              uf.pass_explanation = $pass_explanation,
              uf.stage_last_updated = $stage_last_updated,
              uf.investment_notes = $investment_notes,
              uf.created_at = $created_at,
              uf.updated_at = $updated_at
        `, handleNullValues({
          id: fund.id,
          tenant_id: fund.tenant_id,
          fund_name: fund.fund_name,
          fund_name_allias: fund.fund_name_allias,
          managed_vehicle: fund.managed_vehicle,
          investment_manager_name: fund.investment_manager_name,
          general_partner: fund.general_partner,
          series_fund: fund.series_fund,
          fund_series_name: fund.fund_series_name,
          investment_summary: fund.investment_summary,
          gics_sector: fund.gics_sector,
          geography: fund.geography,
          esg_mandate: fund.esg_mandate,
          country: fund.country,
          fund_series_number: fund.fund_series_number,
          side_letter: fund.side_letter,
          blocker: fund.blocker,
          auditor: fund.auditor,
          legal: fund.legal,
          co_investments: fund.co_investments,
          key_persons: fund.key_persons,
          eligible_investors: fund.eligible_investors,
          inception_year: fund.inception_year,
          liquidity: fund.liquidity,
          lockup_period_flag: fund.lockup_period_flag,
          lockup_period_duration: fund.lockup_period_duration,
          withdrawal_terms: fund.withdrawal_terms,
          early_withdrawal_fee_flag: fund.early_withdrawal_fee_flag,
          early_withdrawal_fee: fund.early_withdrawal_fee,
          investment_type: fund.investment_type,
          investment_subtype_fund: fund.investment_subtype_fund,
          investment_subtype_spv: fund.investment_subtype_spv,
          investment_subtype_direct: fund.investment_subtype_direct,
          investment_subtype_other: fund.investment_subtype_other,
          fund_type: fund.fund_type,
          direct_type: fund.direct_type,
          investment_period: fund.investment_period,
          investment_extensions_flag: fund.investment_extensions_flag,
          investment_extensions: fund.investment_extensions,
          perpetual_flag: fund.perpetual_flag,
          fund_term: fund.fund_term,
          term_extensions_flag: fund.term_extensions_flag,
          term_extensions: fund.term_extensions,
          management_fee_flag: fund.management_fee_flag,
          management_fee_breaks: fund.management_fee_breaks,
          management_fee: fund.management_fee,
          management_fee_on: fund.management_fee_on,
          management_fee_change_flag: fund.management_fee_change_flag,
          management_fee_change_to: fund.management_fee_change_to,
          management_fee_change_on: fund.management_fee_change_on,
          management_fee_change_after: fund.management_fee_change_after,
          carry_fee_flag: fund.carry_fee_flag,
          carry_fee: fund.carry_fee,
          carry_ratchet_flag: fund.carry_ratchet_flag,
          ratcheted_carry_fee: fund.ratcheted_carry_fee,
          ratcheted_carry_fee_when: fund.ratcheted_carry_fee_when,
          preferred_return_flag: fund.preferred_return_flag,
          preferred_return: fund.preferred_return,
          catch_up_provision: fund.catch_up_provision,
          high_water_mark: fund.high_water_mark,
          capital_recycling: fund.capital_recycling,
          leverage: fund.leverage,
          investment_minimum: fund.investment_minimum,
          gp_commitment_flag: fund.gp_commitment_flag,
          gp_commitment: fund.gp_commitment,
          harvest_or_term: fund.harvest_or_term,
          direct_investment_name: fund.direct_investment_name,
          gp_commitment_amount: fund.gp_commitment_amount,
          favorite: fund.favorite,
          stage: fund.stage,
          dd_call: fund.dd_call,
          legal_and_gov_doc: fund.legal_and_gov_doc,
          sub_doc_received: fund.sub_doc_received,
          pass_reason: fund.pass_reason,
          pass_explanation: fund.pass_explanation,
          stage_last_updated: fund.stage_last_updated ? new Date(fund.stage_last_updated) : null,
          investment_notes: fund.investment_notes,
          created_at: new Date(fund.created_at),
          updated_at: new Date(fund.updated_at)
        }));
      }
      console.log(`✅ Migrated ${funds.length} funds`);
    } finally {
      await fundSession.close();
    }

    // 5. Migrate subscriptions for this tenant
    console.log(`\n📋 Migrating subscriptions for tenant: ${tenantId}`);
    const subscriptionsQuery = `SELECT * FROM subscriptions WHERE tenant_id = $1`;
    const subscriptions = await postgres.query(subscriptionsQuery, [tenantId]);
    console.log(`📊 Found ${subscriptions.length} subscriptions for this tenant`);
    
    const subscriptionSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const subscription of subscriptions) {
        await subscriptionSession.run(`
          MERGE (s:Subscription {id: $id})
          SET s.tenant_id = $tenant_id,
              s.fund_name = $fund_name,
              s.investment_entity = $investment_entity,
              s.as_of_date = $as_of_date,
              s.commitment_amount = $commitment_amount,
              s.created_at = $created_at,
              s.updated_at = $updated_at
        `, handleNullValues({
          id: subscription.id,
          tenant_id: subscription.tenant_id,
          fund_name: subscription.fund_name,
          investment_entity: subscription.investment_entity,
          as_of_date: new Date(subscription.as_of_date),
          commitment_amount: subscription.commitment_amount,
          created_at: new Date(subscription.created_at),
          updated_at: new Date(subscription.updated_at)
        }));
      }
      console.log(`✅ Migrated ${subscriptions.length} subscriptions`);
    } finally {
      await subscriptionSession.close();
    }

    // 6. Migrate NAVs for this tenant (Consolidated Structure)
    console.log(`\n💰 Migrating NAVs for tenant: ${tenantId}`);
    const navsQuery = `SELECT * FROM navs WHERE tenant_id = $1 ORDER BY fund_name, investment_entity, as_of_date`;
    const navs = await postgres.query(navsQuery, [tenantId]);
    console.log(`📊 Found ${navs.length} NAVs for this tenant`);
    
    // Group NAVs by fund_name + investment_entity combination
    const navGroups = new Map<string, any[]>();
    for (const nav of navs) {
      const key = `${nav.fund_name}|${nav.investment_entity}`;
      if (!navGroups.has(key)) {
        navGroups.set(key, []);
      }
      navGroups.get(key)!.push(nav);
    }
    
    console.log(`📊 Grouped into ${navGroups.size} unique fund/entity combinations`);
    
    const navSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const [key, navGroup] of navGroups) {
        const [fundName, investmentEntity] = key.split('|');
        
        // Build nav_values object
        const navValues: Record<string, {nav: string, created_at: string, updated_at: string}> = {};
        let latestNav = '';
        let latestDate = '';
        let earliestCreatedAt = '';
        let latestUpdatedAt = '';
        
        for (const nav of navGroup) {
          const dateStr = new Date(nav.as_of_date).toISOString().split('T')[0]; // YYYY-MM-DD format
          const navValue = nav.nav.toString();
          
          navValues[dateStr] = {
            nav: navValue,
            created_at: new Date(nav.created_at).toISOString(),
            updated_at: new Date(nav.updated_at).toISOString()
          };
          
          // Track latest values
          if (!latestDate || dateStr > latestDate) {
            latestDate = dateStr;
            latestNav = navValue;
          }
          
          // Track timestamps
          const createdAt = new Date(nav.created_at).toISOString();
          const updatedAt = new Date(nav.updated_at).toISOString();
          
          if (!earliestCreatedAt || createdAt < earliestCreatedAt) {
            earliestCreatedAt = createdAt;
          }
          
          if (!latestUpdatedAt || updatedAt > latestUpdatedAt) {
            latestUpdatedAt = updatedAt;
          }
        }
        
        // Create consolidated NAV node
        const consolidatedId = `nav_${fundName.replace(/[^a-zA-Z0-9]/g, '_')}_${investmentEntity.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        await navSession.run(`
          MERGE (n:NAV {id: $id})
          SET n.tenant_id = $tenant_id,
              n.fund_name = $fund_name,
              n.investment_entity = $investment_entity,
              n.nav_values = $nav_values,
              n.latest_nav = $latest_nav,
              n.latest_date = $latest_date,
              n.nav_count = $nav_count,
              n.created_at = $created_at,
              n.updated_at = $updated_at
        `, handleNullValues({
          id: consolidatedId,
          tenant_id: tenantId,
          fund_name: fundName,
          investment_entity: investmentEntity,
          nav_values: JSON.stringify(navValues),
          latest_nav: latestNav,
          latest_date: latestDate,
          nav_count: navGroup.length,
          created_at: new Date(earliestCreatedAt),
          updated_at: new Date(latestUpdatedAt)
        }));
      }
      console.log(`✅ Migrated ${navGroups.size} consolidated NAV nodes (from ${navs.length} individual NAVs)`);
    } finally {
      await navSession.close();
    }

    // 7. Migrate Movements for this tenant (Combined Structure)
    console.log(`\n💰 Migrating Movements for tenant: ${tenantId}`);
    
    // Get movements data
    const movementsQuery = `SELECT * FROM movements WHERE tenant_id = $1 ORDER BY fund_name, investment_entity, as_of_date`;
    const movements = await postgres.query(movementsQuery, [tenantId]);
    console.log(`📊 Found ${movements.length} movements for this tenant`);
    
    // Get transactions data  
    const transactionsQuery = `SELECT * FROM transactions WHERE tenant_id = $1 ORDER BY fund_name, investment_entity, as_of_date`;
    const transactions = await postgres.query(transactionsQuery, [tenantId]);
    console.log(`📊 Found ${transactions.length} transactions for this tenant`);
    
    // Group by fund_name + investment_entity combination
    const movementGroups = new Map<string, any[]>();
    
    // Process movements
    for (const movement of movements) {
      const key = `${movement.fund_name}|${movement.investment_entity}`;
      if (!movementGroups.has(key)) {
        movementGroups.set(key, []);
      }
      movementGroups.get(key)!.push({
        ...movement,
        source: 'movements',
        type: movement.movement_type,
        amount: movement.transaction_amount || movement.amount || 0
      });
    }
    
    // Process transactions
    for (const transaction of transactions) {
      const key = `${transaction.fund_name}|${transaction.investment_entity}`;
      if (!movementGroups.has(key)) {
        movementGroups.set(key, []);
      }
      movementGroups.get(key)!.push({
        ...transaction,
        source: 'transactions',
        type: transaction.transaction_type,
        amount: transaction.transaction_amount
      });
    }
    
    console.log(`📊 Grouped into ${movementGroups.size} unique fund/entity combinations`);
    
    const movementsSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      for (const [key, group] of movementGroups) {
        const [fundName, investmentEntity] = key.split('|');
        
        // Build combined movements JSON
        const movementsData: Record<string, {type: string, amount: string, source: string, created_at: string, updated_at: string}> = {};
        let latestMovementDate = '';
        let latestMovementType = '';
        let latestMovementAmount = '';
        let earliestCreatedAt = '';
        let latestUpdatedAt = '';
        
        for (const movement of group) {
          const dateStr = new Date(movement.as_of_date).toISOString().split('T')[0];
          movementsData[dateStr] = {
            type: movement.type,
            amount: movement.amount.toString(),
            source: movement.source,
            created_at: new Date(movement.created_at).toISOString(),
            updated_at: new Date(movement.updated_at).toISOString()
          };
          
          // Track latest values
          if (!latestMovementDate || dateStr > latestMovementDate) {
            latestMovementDate = dateStr;
            latestMovementType = movement.type;
            latestMovementAmount = movement.amount.toString();
          }
          
          // Track timestamps
          const createdAt = new Date(movement.created_at).toISOString();
          const updatedAt = new Date(movement.updated_at).toISOString();
          
          if (!earliestCreatedAt || createdAt < earliestCreatedAt) {
            earliestCreatedAt = createdAt;
          }
          
          if (!latestUpdatedAt || updatedAt > latestUpdatedAt) {
            latestUpdatedAt = updatedAt;
          }
        }
        
        // Create consolidated Movements node
        const consolidatedId = `movements_${fundName.replace(/[^a-zA-Z0-9]/g, '_')}_${investmentEntity.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        await movementsSession.run(`
          MERGE (m:Movements {id: $id})
          SET m.tenant_id = $tenant_id,
              m.fund_name = $fund_name,
              m.investment_entity = $investment_entity,
              m.movements = $movements,
              m.latest_movement_date = $latest_movement_date,
              m.latest_movement_type = $latest_movement_type,
              m.latest_movement_amount = $latest_movement_amount,
              m.movement_count = $movement_count,
              m.created_at = $created_at,
              m.updated_at = $updated_at
        `, handleNullValues({
          id: consolidatedId,
          tenant_id: tenantId,
          fund_name: fundName,
          investment_entity: investmentEntity,
          movements: JSON.stringify(movementsData),
          latest_movement_date: latestMovementDate,
          latest_movement_type: latestMovementType,
          latest_movement_amount: latestMovementAmount,
          movement_count: group.length,
          created_at: new Date(earliestCreatedAt),
          updated_at: new Date(latestUpdatedAt)
        }));
      }
      console.log(`✅ Migrated ${movementGroups.size} consolidated Movements nodes (from ${movements.length + transactions.length} individual records)`);
    } finally {
      await movementsSession.close();
    }

    // 8. Create relationships for this tenant
    console.log(`\n🔗 Creating relationships for tenant: ${tenantId}`);
    const relationshipSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      // Entity -> Fund relationships based on subscription data
      console.log('🏛️ Creating Entity -> Fund relationships...');
      const entityFundQuery = `
        MATCH (ue:UserEntity), (uf:UserFund), (s:Subscription)
        WHERE ue.tenant_id = $tenant_id
          AND uf.tenant_id = $tenant_id
          AND s.tenant_id = $tenant_id
          AND ue.investment_entity = s.investment_entity
          AND uf.fund_name = s.fund_name
        WITH DISTINCT ue, uf, s
        WITH DISTINCT ue, uf
        MERGE (ue)-[:INVESTED_IN {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const entityFundResult = await relationshipSession.run(entityFundQuery, { tenant_id: tenantId });
      const entityFundCount = entityFundResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entityFundCount} Entity->Fund relationships`);

      // Fund -> Subscription relationships
      console.log('💰 Creating Fund -> Subscription relationships...');
      const fundSubscriptionQuery = `
        MATCH (uf:UserFund), (s:Subscription)
        WHERE uf.tenant_id = $tenant_id AND s.tenant_id = $tenant_id AND uf.fund_name = s.fund_name
        WITH DISTINCT uf, s
        MERGE (uf)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const fundSubscriptionResult = await relationshipSession.run(fundSubscriptionQuery, { tenant_id: tenantId });
      const fundSubscriptionCount = fundSubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${fundSubscriptionCount} Fund->Subscription relationships`);

      // Entity -> Subscription relationships
      console.log('🏛️ Creating Entity -> Subscription relationships...');
      const entitySubscriptionQuery = `
        MATCH (ue:UserEntity), (s:Subscription)
        WHERE ue.tenant_id = $tenant_id AND s.tenant_id = $tenant_id AND ue.investment_entity = s.investment_entity
        WITH DISTINCT ue, s
        MERGE (ue)-[:HAS_SUBSCRIPTION {created_at: datetime()}]->(s)
        RETURN count(*) as created
      `;
      
      const entitySubscriptionResult = await relationshipSession.run(entitySubscriptionQuery, { tenant_id: tenantId });
      const entitySubscriptionCount = entitySubscriptionResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${entitySubscriptionCount} Entity->Subscription relationships`);

      // Subscription -> NAV relationships (Consolidated NAVs)
      console.log('💰 Creating Subscription -> NAV relationships (Consolidated NAVs)...');
      const subscriptionNavQuery = `
        MATCH (s:Subscription), (n:NAV)
        WHERE s.tenant_id = $tenant_id AND n.tenant_id = $tenant_id 
        AND s.fund_name = n.fund_name 
        AND s.investment_entity = n.investment_entity
        WITH DISTINCT s, n
        MERGE (s)-[:HAS_NAV {created_at: datetime()}]->(n)
        RETURN count(*) as created
      `;
      
      const subscriptionNavResult = await relationshipSession.run(subscriptionNavQuery, { tenant_id: tenantId });
      const subscriptionNavCount = subscriptionNavResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${subscriptionNavCount} Subscription->NAV relationships`);

      // Subscription -> Movements relationships (Consolidated Movements)
      console.log('💰 Creating Subscription -> Movements relationships (Consolidated Movements)...');
      const subscriptionMovementsQuery = `
        MATCH (s:Subscription), (m:Movements)
        WHERE s.tenant_id = $tenant_id AND m.tenant_id = $tenant_id 
        AND s.fund_name = m.fund_name 
        AND s.investment_entity = m.investment_entity
        WITH DISTINCT s, m
        MERGE (s)-[:HAS_MOVEMENTS {created_at: datetime()}]->(m)
        RETURN count(*) as created
      `;
      
      const subscriptionMovementsResult = await relationshipSession.run(subscriptionMovementsQuery, { tenant_id: tenantId });
      const subscriptionMovementsCount = subscriptionMovementsResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${subscriptionMovementsCount} Subscription->Movements relationships`);

      // Tenant -> Fund INTEREST relationships for funds without subscriptions
      console.log('💡 Creating Tenant -> Fund INTEREST relationships...');
      const interestQuery = `
        MATCH (t:Tenant), (uf:UserFund)
        WHERE t.id = $tenant_id AND uf.tenant_id = $tenant_id
        AND NOT EXISTS {
          MATCH (uf)-[:HAS_SUBSCRIPTION]->(:Subscription)
        }
        MERGE (t)-[:INTEREST {created_at: datetime()}]->(uf)
        RETURN count(*) as created
      `;
      
      const interestResult = await relationshipSession.run(interestQuery, { tenant_id: tenantId });
      const interestCount = interestResult.records[0].get('created').toNumber();
      console.log(`✅ Created ${interestCount} Tenant->Fund INTEREST relationships`);

      console.log(`\n📊 Total relationships created: ${entityFundCount + fundSubscriptionCount + entitySubscriptionCount + subscriptionNavCount + interestCount}`);

    } finally {
      await relationshipSession.close();
    }

    // 8. Final verification
    console.log(`\n🔍 Final verification for tenant: ${tenantId}`);
    const finalSession = neo4j['driver']!.session({ database: 'neo4j' });
    try {
      const nodeCounts = await finalSession.run(`
        MATCH (n) 
        WHERE n.tenant_id = $tenant_id OR labels(n)[0] = 'Tenant'
        RETURN labels(n)[0] as label, count(n) as count
      `, { tenant_id: tenantId });
      
      console.log('📊 Node counts for this tenant:');
      nodeCounts.records.forEach(record => console.log(`   ${record.get('label')}: ${record.get('count').toNumber()}`));

      const relCounts = await finalSession.run(`
        MATCH ()-[r]->()
        RETURN type(r) as type, count(r) as count
      `);
      console.log('🔗 Relationship counts:');
      relCounts.records.forEach(record => console.log(`   ${record.get('type')}: ${record.get('count').toNumber()}`));

    } finally {
      await finalSession.close();
    }

    console.log(`\n🎉 Tenant-specific migration completed successfully for: ${tenantId}`);

  } catch (error: any) {
    console.error('❌ Tenant migration failed:', error.message);
    throw error;
  } finally {
    console.log('🧹 Cleaning up connections...');
    await postgres.close();
    await neo4j.close();
    console.log('✅ Cleanup complete');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const tenantIdArg = args.find(arg => arg.startsWith('--tenant-id='));
const tenantId = tenantIdArg ? tenantIdArg.split('=')[1] : null;

if (!tenantId) {
  console.error('❌ Please provide a tenant ID: --tenant-id=fd68d10f-0780-4140-b393-3adf8109df4f');
  process.exit(1);
}

if (require.main === module) {
  migrateTenant(tenantId);
}
