/**
 * User-Centric Neo4j Schema Definition
 * 
 * This schema follows a user-centric approach where:
 * User -> Entity -> Fund -> Subscription
 * 
 * Key relationships:
 * - User CONTROLS Entity
 * - Entity INVESTS_IN Fund  
 * - Fund HAS_SUBSCRIPTION Subscription
 */

export interface SchemaConstraint {
  name: string;
  type: 'UNIQUE' | 'EXISTS' | 'NODE_KEY';
  label: string;
  properties: readonly string[];
  cypher: string;
}

export interface SchemaIndex {
  name: string;
  label: string;
  properties: readonly string[];
  type: 'BTREE' | 'TEXT' | 'POINT' | 'RANGE';
  cypher: string;
}

export interface SchemaRelationship {
  from: string;
  to: string;
  type: string;
  properties: readonly string[];
}

export interface NodeSchema {
  label: string;
  properties: readonly string[];
  constraints: readonly SchemaConstraint[];
  indexes: readonly SchemaIndex[];
}

/**
 * User-Centric Neo4j Schema Definition
 */
export const USER_CENTRIC_SCHEMA = {
  // Node Labels
  nodes: {
    User: {
      label: 'User',
      properties: [
        'id', 'tenant_id', 'username', 'email', 'first_name', 'last_name',
        'created_at', 'updated_at', 'email_confirmed', 'phone_number',
        'phone_number_confirmed', 'two_factor_enabled', 'lockout_enabled',
        'access_failed_count', 'is_mfa_enabled', 'call_notifications',
        'distribution_notifications', 'statement_notifications',
        'new_investment_notifications', 'new_opportunity_notifications',
        'pipeline_notifications', 'forwarding_email', 'plaid_consent',
        'plaid_consent_date'
      ],
      constraints: [
        {
          name: 'user_id_unique',
          type: 'UNIQUE',
          label: 'User',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'user_email_index',
          label: 'User',
          properties: ['email'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)'
        },
        {
          name: 'user_username_index',
          label: 'User',
          properties: ['username'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_username_index IF NOT EXISTS FOR (u:User) ON (u.username)'
        },
        {
          name: 'user_tenant_index',
          label: 'User',
          properties: ['tenant_id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_tenant_index IF NOT EXISTS FOR (u:User) ON (u.tenant_id)'
        }
      ]
    },

    Tenant: {
      label: 'Tenant',
      properties: ['id', 'name', 'created_at', 'updated_at'],
      constraints: [
        {
          name: 'tenant_id_unique',
          type: 'UNIQUE',
          label: 'Tenant',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'tenant_id_index',
          label: 'Tenant',
          properties: ['id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX tenant_id_index IF NOT EXISTS FOR (t:Tenant) ON (t.id)'
        }
      ]
    },

    UserEntity: {
      label: 'UserEntity',
      properties: ['id', 'investment_entity', 'entity_allias', 'created_at', 'updated_at', 'tenant_id'],
      constraints: [
        {
          name: 'user_entity_id_unique',
          type: 'UNIQUE',
          label: 'UserEntity',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT user_entity_id_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE ue.id IS UNIQUE'
        },
        {
          name: 'user_entity_tenant_investment_unique',
          type: 'UNIQUE',
          label: 'UserEntity',
          properties: ['tenant_id', 'investment_entity'],
          cypher: 'CREATE CONSTRAINT user_entity_tenant_investment_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE (ue.tenant_id, ue.investment_entity) IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'user_entity_tenant_id',
          label: 'UserEntity',
          properties: ['tenant_id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_entity_tenant_id IF NOT EXISTS FOR (ue:UserEntity) ON (ue.tenant_id)'
        },
        {
          name: 'user_entity_alias',
          label: 'UserEntity',
          properties: ['entity_allias'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_entity_alias IF NOT EXISTS FOR (ue:UserEntity) ON (ue.entity_allias)'
        }
      ]
    },

    UserFund: {
      label: 'UserFund',
      properties: ['id', 'tenant_id', 'fund_name', 'fund_name_allias', 'managed_vehicle', 'investment_manager_name', 'general_partner', 'series_fund', 'fund_series_name', 'investment_summary', 'gics_sector', 'geography', 'esg_mandate', 'country', 'fund_series_number', 'side_letter', 'blocker', 'auditor', 'legal', 'co_investments', 'key_persons', 'eligible_investors', 'inception_year', 'liquidity', 'lockup_period_flag', 'lockup_period_duration', 'withdrawal_terms', 'early_withdrawal_fee_flag', 'early_withdrawal_fee', 'investment_type', 'investment_subtype_fund', 'investment_subtype_spv', 'investment_subtype_direct', 'investment_subtype_other', 'fund_type', 'direct_type', 'investment_period', 'investment_extensions_flag', 'investment_extensions', 'perpetual_flag', 'fund_term', 'term_extensions_flag', 'term_extensions', 'management_fee_flag', 'management_fee_breaks', 'management_fee', 'management_fee_on', 'management_fee_change_flag', 'management_fee_change_to', 'management_fee_change_on', 'management_fee_change_after', 'carry_fee_flag', 'carry_fee', 'carry_ratchet_flag', 'ratcheted_carry_fee', 'ratcheted_carry_fee_when', 'preferred_return_flag', 'preferred_return', 'catch_up_provision', 'high_water_mark', 'capital_recycling', 'leverage', 'investment_minimum', 'gp_commitment_flag', 'gp_commitment', 'harvest_or_term', 'direct_investment_name', 'gp_commitment_amount', 'created_at', 'updated_at', 'favorite', 'stage', 'dd_call', 'legal_and_gov_doc', 'sub_doc_received', 'pass_reason', 'pass_explanation', 'stage_last_updated', 'investment_notes'],
      constraints: [
        {
          name: 'user_fund_id_unique',
          type: 'UNIQUE',
          label: 'UserFund',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT user_fund_id_unique IF NOT EXISTS FOR (uf:UserFund) REQUIRE uf.id IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'user_fund_tenant_id',
          label: 'UserFund',
          properties: ['tenant_id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_fund_tenant_id IF NOT EXISTS FOR (uf:UserFund) ON (uf.tenant_id)'
        },
        {
          name: 'user_fund_name',
          label: 'UserFund',
          properties: ['fund_name'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_fund_name IF NOT EXISTS FOR (uf:UserFund) ON (uf.fund_name)'
        },
        {
          name: 'user_fund_investment_type',
          label: 'UserFund',
          properties: ['investment_type'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_fund_investment_type IF NOT EXISTS FOR (uf:UserFund) ON (uf.investment_type)'
        },
        {
          name: 'user_fund_fund_type',
          label: 'UserFund',
          properties: ['fund_type'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_fund_fund_type IF NOT EXISTS FOR (uf:UserFund) ON (uf.fund_type)'
        },
        {
          name: 'user_fund_stage',
          label: 'UserFund',
          properties: ['stage'],
          type: 'BTREE',
          cypher: 'CREATE INDEX user_fund_stage IF NOT EXISTS FOR (uf:UserFund) ON (uf.stage)'
        }
      ]
    },

    Subscription: {
      label: 'Subscription',
      properties: ['id', 'tenant_id', 'fund_name', 'investment_entity', 'as_of_date', 'commitment_amount', 'created_at', 'updated_at'],
      constraints: [
        {
          name: 'subscription_id_unique',
          type: 'UNIQUE',
          label: 'Subscription',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT subscription_id_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE s.id IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'subscription_tenant_id',
          label: 'Subscription',
          properties: ['tenant_id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX subscription_tenant_id IF NOT EXISTS FOR (s:Subscription) ON (s.tenant_id)'
        },
        {
          name: 'subscription_as_of_date',
          label: 'Subscription',
          properties: ['as_of_date'],
          type: 'BTREE',
          cypher: 'CREATE INDEX subscription_as_of_date IF NOT EXISTS FOR (s:Subscription) ON (s.as_of_date)'
        },
        {
          name: 'subscription_commitment_amount',
          label: 'Subscription',
          properties: ['commitment_amount'],
          type: 'BTREE',
          cypher: 'CREATE INDEX subscription_commitment_amount IF NOT EXISTS FOR (s:Subscription) ON (s.commitment_amount)'
        }
      ]
    },

    NAV: {
      label: 'NAV',
      properties: [
        'id', 
        'tenant_id', 
        'fund_name', 
        'investment_entity', 
        'nav_values',  // Object with date->value pairs: {"2023-01-01": "100.00", "2023-02-01": "105.00"}
        'latest_nav',  // Most recent NAV value
        'latest_date', // Most recent NAV date
        'nav_count',   // Number of historical NAV entries
        'created_at', 
        'updated_at'
      ],
      constraints: [
        {
          name: 'nav_id_unique',
          type: 'UNIQUE',
          label: 'NAV',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT nav_id_unique IF NOT EXISTS FOR (n:NAV) REQUIRE n.id IS UNIQUE'
        },
        {
          name: 'nav_fund_entity_unique',
          type: 'UNIQUE',
          label: 'NAV',
          properties: ['fund_name', 'investment_entity', 'tenant_id'],
          cypher: 'CREATE CONSTRAINT nav_fund_entity_unique IF NOT EXISTS FOR (n:NAV) REQUIRE (n.fund_name, n.investment_entity, n.tenant_id) IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'nav_tenant_id',
          label: 'NAV',
          properties: ['tenant_id'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_tenant_id IF NOT EXISTS FOR (n:NAV) ON (n.tenant_id)'
        },
        {
          name: 'nav_fund_name',
          label: 'NAV',
          properties: ['fund_name'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_fund_name IF NOT EXISTS FOR (n:NAV) ON (n.fund_name)'
        },
        {
          name: 'nav_investment_entity',
          label: 'NAV',
          properties: ['investment_entity'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_investment_entity IF NOT EXISTS FOR (n:NAV) ON (n.investment_entity)'
        },
        {
          name: 'nav_latest_date',
          label: 'NAV',
          properties: ['latest_date'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_latest_date IF NOT EXISTS FOR (n:NAV) ON (n.latest_date)'
        },
        {
          name: 'nav_latest_value',
          label: 'NAV',
          properties: ['latest_nav'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_latest_value IF NOT EXISTS FOR (n:NAV) ON (n.latest_nav)'
        },
        {
          name: 'nav_fund_entity',
          label: 'NAV',
          properties: ['fund_name', 'investment_entity'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_fund_entity IF NOT EXISTS FOR (n:NAV) ON (n.fund_name, n.investment_entity)'
        }
      ]
    }
  },

  // Relationships
  relationships: [
    // User-centric relationships
    {
      from: 'User',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'User',
      to: 'UserEntity',
      type: 'CONTROLS',
      properties: ['created_at', 'control_type']
    },
    {
      from: 'UserEntity',
      to: 'UserFund',
      type: 'INVESTS_IN',
      properties: ['created_at', 'investment_date']
    },
    {
      from: 'UserFund',
      to: 'Subscription',
      type: 'HAS_SUBSCRIPTION',
      properties: ['created_at']
    },
    
    // Tenant relationships (for data organization)
    {
      from: 'UserEntity',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'UserFund',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'Subscription',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'Subscription',
      to: 'NAV',
      type: 'HAS_NAV',
      properties: ['created_at']
    },
    {
      from: 'NAV',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    }
  ]
} as const;

export type UserCentricSchema = typeof USER_CENTRIC_SCHEMA;
