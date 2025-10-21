// Type definitions matching your PostgreSQL schema

export interface Tenant {
  id: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
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
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  nav: number;
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
