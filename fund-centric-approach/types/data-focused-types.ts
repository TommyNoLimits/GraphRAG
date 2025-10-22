// Data-focused GraphRAG types for LLM portfolio analysis

export interface User {
  id: string;
  tenant_id: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserEntity {
  id: number;
  tenant_id: string;
  investment_entity: string;
  entity_alias: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserFund {
  id: number;
  tenant_id: string;
  fund_name: string;
  fund_name_alias?: string;
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

export interface CalculatedMetrics {
  // Portfolio-level calculations
  total_commitment: number;
  total_invested: number;
  total_distributions: number;
  total_nav: number;
  portfolio_irr: number;
  portfolio_multiple: number;
  
  // Fund-level calculations
  fund_commitment: number;
  fund_invested: number;
  fund_distributions: number;
  fund_nav: number;
  fund_irr: number;
  fund_multiple: number;
  
  // Risk metrics
  concentration_risk: number;
  sector_concentration: Record<string, number>;
  geography_concentration: Record<string, number>;
  
  // Performance metrics
  annualized_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  
  // Fee calculations
  total_management_fees: number;
  total_carry_fees: number;
  net_fees: number;
  
  // Liquidity metrics
  liquid_percentage: number;
  illiquid_percentage: number;
  lockup_periods: Record<string, number>;
}

export interface PortfolioAnalysis {
  user_id: string;
  entity_id: number;
  analysis_date: Date;
  metrics: CalculatedMetrics;
  fund_breakdown: Array<{
    fund_name: string;
    commitment: number;
    invested: number;
    distributions: number;
    nav: number;
    irr: number;
    multiple: number;
    stage: string;
  }>;
  risk_analysis: {
    sector_diversification: Record<string, number>;
    geography_diversification: Record<string, number>;
    vintage_year_diversification: Record<number, number>;
  };
}

// LLM Query types
export interface LLMQuery {
  query: string;
  user_id?: string;
  entity_id?: number;
  fund_name?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface LLMResponse {
  answer: string;
  data_points: Array<{
    type: 'fund' | 'entity' | 'user' | 'calculation' | 'metric';
    id: string;
    value: any;
    source: string;
  }>;
  calculations: Array<{
    metric_name: string;
    formula: string;
    inputs: Record<string, any>;
    result: number;
  }>;
  confidence: number;
}

// Graph node types for Neo4j
export interface GraphUser {
  id: string;
  tenant_id: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  properties: Record<string, any>;
}

export interface GraphEntity {
  id: string;
  tenant_id: string;
  investment_entity: string;
  entity_alias: string;
  properties: Record<string, any>;
}

export interface GraphFund {
  id: string;
  tenant_id: string;
  fund_name: string;
  fund_name_alias?: string;
  investment_manager_name?: string;
  fund_type?: string;
  inception_year?: number;
  properties: Record<string, any>;
}

export interface GraphCalculation {
  id: string;
  calculation_type: 'portfolio_metric' | 'fund_metric' | 'risk_metric' | 'performance_metric';
  metric_name: string;
  formula: string;
  inputs: Record<string, any>;
  result: number;
  calculated_at: Date;
  properties: Record<string, any>;
}

export interface GraphMetric {
  id: string;
  metric_type: 'irr' | 'multiple' | 'nav' | 'commitment' | 'distribution' | 'fee';
  value: number;
  currency?: string;
  as_of_date: Date;
  properties: Record<string, any>;
}
