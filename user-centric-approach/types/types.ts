// Type definitions matching your PostgreSQL schema

export interface Tenant {
  id: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserFund {
  id: number;
  tenant_id: string;
  fund_name: string;
  fund_name_allias?: string;
  managed_vehicle?: boolean;
  investment_manager_name?: string;
  general_partner?: string;
  series_fund?: string;
  fund_series_name?: string;
  investment_summary?: string;
  gics_sector?: string;
  geography?: string;
  esg_mandate?: string;
  country?: string;
  fund_series_number?: number;
  side_letter?: string;
  blocker?: string;
  auditor?: string;
  legal?: string;
  co_investments?: string;
  key_persons?: string;
  eligible_investors?: string;
  inception_year?: number;
  liquidity?: string;
  lockup_period_flag?: boolean;
  lockup_period_duration?: string;
  withdrawal_terms?: string;
  early_withdrawal_fee_flag?: boolean;
  early_withdrawal_fee?: number;
  investment_type?: string;
  investment_subtype_fund?: string;
  investment_subtype_spv?: string;
  investment_subtype_direct?: string;
  investment_subtype_other?: string;
  fund_type?: string;
  direct_type?: string;
  investment_period?: number;
  investment_extensions_flag?: boolean;
  investment_extensions?: string;
  perpetual_flag?: boolean;
  fund_term?: string;
  term_extensions_flag?: boolean;
  term_extensions?: string;
  management_fee_flag?: boolean;
  management_fee_breaks?: string;
  management_fee?: number;
  management_fee_on?: string;
  management_fee_change_flag?: boolean;
  management_fee_change_to?: number;
  management_fee_change_on?: string;
  management_fee_change_after?: string;
  carry_fee_flag?: boolean;
  carry_fee?: number;
  carry_ratchet_flag?: boolean;
  ratcheted_carry_fee?: number;
  ratcheted_carry_fee_when?: string;
  preferred_return_flag?: boolean;
  preferred_return?: number;
  catch_up_provision?: string;
  high_water_mark?: string;
  capital_recycling?: string;
  leverage?: string;
  investment_minimum?: number;
  gp_commitment_flag?: boolean;
  gp_commitment?: string;
  harvest_or_term?: string;
  direct_investment_name?: string;
  gp_commitment_amount?: number;
  created_at?: Date;
  updated_at?: Date;
  favorite?: boolean;
  stage?: string;
  dd_call?: boolean;
  legal_and_gov_doc?: boolean;
  sub_doc_received?: boolean;
  pass_reason?: string;
  pass_explanation?: string;
  stage_last_updated?: Date;
  investment_notes?: string;
}

export interface Fund {
  id: number;
  fund_name: string;
  managed_vehicle?: boolean;
  investment_manager_name?: string;
  general_partner?: string;
  series_fund?: string;
  fund_series_name?: string;
  investment_summary?: string;
  gics_sector?: string;
  geography?: string;
  esg_mandate?: string;
  country?: string;
  fund_series_number?: number;
  side_letter?: string;
  blocker?: string;
  auditor?: string;
  legal?: string;
  co_investments?: string;
  key_persons?: string;
  eligible_investors?: string;
  inception_year?: number;
  liquidity?: string;
  lockup_period_flag?: boolean;
  lockup_period_duration?: number;
  withdrawal_terms?: string;
  early_withdrawal_fee_flag?: boolean;
  early_withdrawal_fee?: number;
  investment_type?: string;
  investment_subtype_fund?: string;
  investment_subtype_spv?: string;
  investment_subtype_direct?: string;
  investment_subtype_other?: string;
  fund_type?: string;
  direct_type?: string;
  investment_period?: number;
  investment_extensions_flag?: boolean;
  investment_extensions?: string;
  perpetual_flag?: boolean;
  fund_term?: number;
  term_extensions_flag?: boolean;
  term_extensions?: string;
  management_fee_flag?: boolean;
  management_fee_breaks?: string;
  management_fee?: number;
  management_fee_on?: string;
  management_fee_change_flag?: boolean;
  management_fee_change_to?: number;
  management_fee_change_on?: string;
  management_fee_change_after?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Document {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  file_name: string;
  summary?: string;
  classification?: string;
  investment_statements_type?: string;
  investor_statements_type?: string;
  preliminary_investment_documents_type?: string;
  purchase_and_subscription_agreements_type?: string;
  legal_and_governance_documents_type?: string;
  updates_and_letters_type?: string;
  taxdocuments_type?: string;
  capital_call_and_distribution_notices_type?: string;
  other_type?: string;
  created_at?: Date;
  updated_at?: Date;
  sent_flag?: boolean;
  tax_year?: number;
  document_id?: string;
  public_market_documents_type?: string;
}

export interface NAV {
  id: string;  // Composite key: "nav_{fund_name}_{investment_entity}"
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  nav_values: Record<string, string>;  // Date -> NAV value pairs: {"2023-01-01": "100.00"}
  latest_nav: string;  // Most recent NAV value
  latest_date: string;  // Most recent NAV date
  nav_count: number;  // Number of historical NAV entries
  created_at?: Date;
  updated_at?: Date;
}

export interface Movements {
  id: string;  // Composite key: "movements_{fund_name}_{investment_entity}"
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  
  // Combined movement/transaction data
  movements: Record<string, {
    type: string;           // movement_type or transaction_type
    amount: string;         // amount or transaction_amount
    source: string;         // "movements" or "transactions"
  }>;
  
  // Quick access fields
  latest_movement_date: string;
  latest_movement_type: string;
  latest_movement_amount: string;
  movement_count: number;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface Transaction {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  transaction_amount: number;
  transaction_type: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Movement {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  transaction_amount: number;
  transaction_type: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Subscription {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  commitment_amount: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface EmailAttachmentDocument {
  id: string;
  tenant_id: string;
  user_id: string;
  internet_message_id: string;
  email_subject: string;
  sender_email: string;
  attachment_id: string;
  attachment_name: string;
  received_at: Date;
  status: string;
  details?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Graph-specific types
export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

export interface GraphResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

// Migration result types
export interface MigrationResult {
  success: boolean;
  message: string;
  counts?: {
    tenants: number;
    funds: number;
    documents: number;
    navs: number;
    transactions: number;
    movements: number;
    subscriptions: number;
    emailAttachments: number;
  };
  error?: string;
}

// Query result types
export interface FundPerformance {
  fund_name: string;
  avg_nav: number;
  max_nav: number;
  min_nav: number;
  nav_count: number;
}

export interface DocumentClassification {
  classification: string;
  count: number;
}

export interface FundTransactionSummary {
  fund_name: string;
  total_amount: number;
  transaction_count: number;
  transaction_types: string[];
}

export interface TenantDocumentCount {
  tenant_id: string;
  tenant_name: string;
  document_count: number;
}
