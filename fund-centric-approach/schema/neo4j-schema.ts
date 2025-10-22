/**
 * Centralized Neo4j Schema Management
 * 
 * This file contains all Neo4j schema definitions including:
 * - Node labels and their properties
 * - Constraints (unique, existence, etc.)
 * - Indexes for performance
 * - Relationships and their properties
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
  properties?: readonly string[];
}

export interface NodeSchema {
  label: string;
  properties: readonly string[];
  constraints: readonly SchemaConstraint[];
  indexes: readonly SchemaIndex[];
}

/**
 * Complete Neo4j Schema Definition
 */
export const NEO4J_SCHEMA = {
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
        },
        // Note: Removed tenant-constrained uniqueness constraint due to duplicate fund names in PostgreSQL data
        // The data has duplicate fund names within the same tenant, so we handle this in migration logic
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
        }
      ]
    },

    Fund: {
      label: 'Fund',
      properties: ['fund_name', 'managed_vehicle', 'investment_manager_name', 'general_partner'],
      constraints: [
        {
          name: 'fund_name_unique',
          type: 'UNIQUE',
          label: 'Fund',
          properties: ['fund_name'],
          cypher: 'CREATE CONSTRAINT fund_name_unique IF NOT EXISTS FOR (f:Fund) REQUIRE f.fund_name IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'fund_name_index',
          label: 'Fund',
          properties: ['fund_name'],
          type: 'BTREE',
          cypher: 'CREATE INDEX fund_name_index IF NOT EXISTS FOR (f:Fund) ON (f.fund_name)'
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
        },
        {
          name: 'subscription_tenant_unique',
          type: 'UNIQUE',
          label: 'Subscription',
          properties: ['tenant_id', 'id'],
          cypher: 'CREATE CONSTRAINT subscription_tenant_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE (s.tenant_id, s.id) IS UNIQUE'
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

    Document: {
      label: 'Document',
      properties: ['id', 'tenant_id', 'fund_name', 'investment_entity', 'as_of_date', 'file_name'],
      constraints: [
        {
          name: 'document_id_unique',
          type: 'UNIQUE',
          label: 'Document',
          properties: ['id'],
          cypher: 'CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE'
        }
      ],
      indexes: [
        {
          name: 'document_classification_index',
          label: 'Document',
          properties: ['classification'],
          type: 'BTREE',
          cypher: 'CREATE INDEX document_classification_index IF NOT EXISTS FOR (d:Document) ON (d.classification)'
        }
      ]
    },

    NAV: {
      label: 'NAV',
      properties: ['tenant_id', 'fund_name', 'investment_entity', 'as_of_date', 'nav'],
      constraints: [],
      indexes: [
        {
          name: 'nav_date_index',
          label: 'NAV',
          properties: ['as_of_date'],
          type: 'BTREE',
          cypher: 'CREATE INDEX nav_date_index IF NOT EXISTS FOR (n:NAV) ON (n.as_of_date)'
        }
      ]
    },

    Transaction: {
      label: 'Transaction',
      properties: ['tenant_id', 'fund_name', 'investment_entity', 'as_of_date', 'transaction_amount', 'transaction_type'],
      constraints: [],
      indexes: [
        {
          name: 'transaction_date_index',
          label: 'Transaction',
          properties: ['as_of_date'],
          type: 'BTREE',
          cypher: 'CREATE INDEX transaction_date_index IF NOT EXISTS FOR (t:Transaction) ON (t.as_of_date)'
        }
      ]
    }
  },

  // Relationships
  relationships: [
    {
      from: 'User',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'UserEntity',
      to: 'Tenant',
      type: 'BELONGS_TO_TENANT',
      properties: ['created_at']
    },
    {
      from: 'UserFund',
      to: 'Tenant',
      type: 'BELONGS_TO_TENANT',
      properties: ['created_at']
    },
    {
      from: 'UserFund',
      to: 'UserEntity',
      type: 'INVESTED_THROUGH',
      properties: ['subscription_id', 'as_of_date', 'commitment_amount', 'created_at', 'updated_at']
    },
    {
      from: 'UserFund',
      to: 'Subscription',
      type: 'INVESTED_THROUGH',
      properties: ['created_at']
    },
    {
      from: 'Subscription',
      to: 'UserEntity',
      type: 'LINKED_TO',
      properties: ['created_at']
    },
    // Document relationships - to be added when documents are migrated
    // {
    //   from: 'Subscription',
    //   to: 'Document',
    //   type: 'HAS_DOCUMENT',
    //   properties: ['created_at', 'document_type']
    // },
    {
      from: 'Document',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'NAV',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    },
    {
      from: 'Transaction',
      to: 'Tenant',
      type: 'BELONGS_TO',
      properties: ['created_at']
    }
  ]
} as const;

/**
 * Schema version for migration tracking
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Get all constraints from the schema
 */
export function getAllConstraints(): SchemaConstraint[] {
  const constraints: SchemaConstraint[] = [];
  
  Object.values(NEO4J_SCHEMA.nodes).forEach(node => {
    constraints.push(...node.constraints);
  });
  
  return constraints;
}

/**
 * Get all indexes from the schema
 */
export function getAllIndexes(): SchemaIndex[] {
  const indexes: SchemaIndex[] = [];
  
  Object.values(NEO4J_SCHEMA.nodes).forEach(node => {
    indexes.push(...node.indexes);
  });
  
  return indexes;
}

/**
 * Get schema for a specific node label
 */
export function getNodeSchema(label: string): NodeSchema | undefined {
  return NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes];
}

/**
 * Generate Cypher for creating all constraints
 */
export function generateConstraintsCypher(): string[] {
  return getAllConstraints().map(constraint => constraint.cypher);
}

/**
 * Generate Cypher for creating all indexes
 */
export function generateIndexesCypher(): string[] {
  return getAllIndexes().map(index => index.cypher);
}

/**
 * Generate complete schema creation Cypher
 */
export function generateSchemaCypher(): string[] {
  return [
    '-- Neo4j Schema Creation Script',
    `-- Version: ${SCHEMA_VERSION}`,
    '-- Generated: ' + new Date().toISOString(),
    '',
    '-- Constraints:',
    ...generateConstraintsCypher(),
    '',
    '-- Indexes:',
    ...generateIndexesCypher(),
    '',
    '-- Schema creation complete'
  ];
}
