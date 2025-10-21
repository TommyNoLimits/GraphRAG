import { Neo4jConnection } from './neo4j-connection';
import { 
  LLMQuery, 
  LLMResponse, 
  CalculatedMetrics,
  PortfolioAnalysis
} from './data-focused-types';

export class LLMPortfolioQueryEngine {
  private conn: Neo4jConnection;

  constructor(connection: Neo4jConnection) {
    this.conn = connection;
  }

  /**
   * Answer natural language questions about portfolio data
   */
  async answerQuestion(query: LLMQuery): Promise<LLMResponse> {
    try {
      console.log(`🤖 Processing question: "${query.query}"`);

      // Parse the question to determine what data is needed
      const questionType = this.parseQuestionType(query.query);
      
      let response: LLMResponse;

      switch (questionType.type) {
        case 'portfolio_overview':
          response = await this.getPortfolioOverview(query);
          break;
        case 'fund_performance':
          response = await this.getFundPerformance(query);
          break;
        case 'risk_analysis':
          response = await this.getRiskAnalysis(query);
          break;
        case 'metric_calculation':
          response = await this.getMetricCalculation(query);
          break;
        case 'comparison':
          response = await this.getComparison(query);
          break;
        default:
          response = await this.getGeneralAnswer(query);
      }

      console.log(`✅ Generated response with confidence: ${response.confidence}`);
      return response;

    } catch (error) {
      console.error('❌ Failed to answer question:', error);
      return {
        answer: 'I apologize, but I encountered an error while processing your question.',
        data_points: [],
        calculations: [],
        confidence: 0
      };
    }
  }

  /**
   * Parse question to determine what type of data is needed
   */
  private parseQuestionType(question: string): { type: string; entities: string[] } {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('portfolio') && (lowerQuestion.includes('overview') || lowerQuestion.includes('summary'))) {
      return { type: 'portfolio_overview', entities: ['user', 'funds', 'metrics'] };
    }
    
    if (lowerQuestion.includes('performance') || lowerQuestion.includes('irr') || lowerQuestion.includes('multiple')) {
      return { type: 'fund_performance', entities: ['funds', 'metrics'] };
    }
    
    if (lowerQuestion.includes('risk') || lowerQuestion.includes('concentration') || lowerQuestion.includes('diversification')) {
      return { type: 'risk_analysis', entities: ['funds', 'risk_metrics'] };
    }
    
    if (lowerQuestion.includes('how') && lowerQuestion.includes('calculated')) {
      return { type: 'metric_calculation', entities: ['calculations'] };
    }
    
    if (lowerQuestion.includes('compare') || lowerQuestion.includes('vs') || lowerQuestion.includes('versus')) {
      return { type: 'comparison', entities: ['funds', 'metrics'] };
    }
    
    return { type: 'general', entities: ['user', 'funds'] };
  }

  /**
   * Get portfolio overview
   */
  private async getPortfolioOverview(query: LLMQuery): Promise<LLMResponse> {
    const userId = query.user_id || 'default_user';
    
    // Get user's portfolio metrics
    const metrics = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:HAS_METRIC]->(m:Metric)
      RETURN m.metric_name, m.value, m.currency
    `, { userId });

    // Get fund breakdown
    const funds = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:INVESTS_IN]->(f:Fund)
      RETURN f.fund_name, f.fund_type, f.stage, f.favorite
    `, { userId });

    // Get calculations
    const calculations = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:HAS_CALCULATION]->(c:Calculation)
      RETURN c.metric_name, c.formula, c.inputs, c.result
    `, { userId });

    const totalCommitment = metrics.find(m => m.metric_name === 'total_commitment')?.value || 0;
    const totalNav = metrics.find(m => m.metric_name === 'total_nav')?.value || 0;
    const portfolioIrr = metrics.find(m => m.metric_name === 'portfolio_irr')?.value || 0;
    const portfolioMultiple = metrics.find(m => m.metric_name === 'portfolio_multiple')?.value || 0;

    const answer = `Your portfolio overview shows:
- Total Commitment: $${totalCommitment.toLocaleString()}
- Current NAV: $${totalNav.toLocaleString()}
- Portfolio IRR: ${(portfolioIrr * 100).toFixed(2)}%
- Portfolio Multiple: ${portfolioMultiple.toFixed(2)}x
- Number of Funds: ${funds.length}

Your portfolio consists of ${funds.length} funds across different stages and types.`;

    return {
      answer,
      data_points: metrics.map(m => ({
        type: 'metric' as const,
        id: m.metric_name,
        value: m.value,
        source: 'portfolio_calculation'
      })),
      calculations: calculations.map(c => ({
        metric_name: c.metric_name,
        formula: c.formula,
        inputs: c.inputs,
        result: c.result
      })),
      confidence: 0.9
    };
  }

  /**
   * Get fund performance analysis
   */
  private async getFundPerformance(query: LLMQuery): Promise<LLMResponse> {
    const userId = query.user_id || 'default_user';
    
    // Get fund performance data
    const fundPerformance = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:INVESTS_IN]->(f:Fund)
      OPTIONAL MATCH (f)-[:HAS_METRIC]->(m:Metric)
      RETURN f.fund_name, f.fund_type, f.stage, 
             collect({name: m.metric_name, value: m.value}) as metrics
    `, { userId });

    let answer = 'Fund Performance Analysis:\n\n';
    fundPerformance.forEach(fund => {
      const fundMetrics = fund.metrics.filter((m: any) => m.name !== null);
      answer += `${fund.fund_name}:\n`;
      answer += `  - Type: ${fund.fund_type || 'Unknown'}\n`;
      answer += `  - Stage: ${fund.stage || 'Unknown'}\n`;
      fundMetrics.forEach((metric: any) => {
        answer += `  - ${metric.name}: ${metric.value}\n`;
      });
      answer += '\n';
    });

    return {
      answer,
      data_points: fundPerformance.map(f => ({
        type: 'fund' as const,
        id: f.fund_name,
        value: f,
        source: 'fund_analysis'
      })),
      calculations: [],
      confidence: 0.8
    };
  }

  /**
   * Get risk analysis
   */
  private async getRiskAnalysis(query: LLMQuery): Promise<LLMResponse> {
    const userId = query.user_id || 'default_user';
    
    // Get concentration risk metrics
    const riskMetrics = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:HAS_METRIC]->(m:Metric)
      WHERE m.metric_name CONTAINS 'concentration' OR m.metric_name CONTAINS 'risk'
      RETURN m.metric_name, m.value
    `, { userId });

    // Get fund diversification
    const fundTypes = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:INVESTS_IN]->(f:Fund)
      RETURN f.fund_type, count(f) as count
    `, { userId });

    let answer = 'Risk Analysis:\n\n';
    
    if (riskMetrics.length > 0) {
      answer += 'Concentration Risk:\n';
      riskMetrics.forEach(metric => {
        answer += `- ${metric.metric_name}: ${metric.value}\n`;
      });
    }

    answer += '\nFund Diversification:\n';
    fundTypes.forEach(type => {
      answer += `- ${type.fund_type || 'Unknown'}: ${type.count} funds\n`;
    });

    return {
      answer,
      data_points: riskMetrics.map(m => ({
        type: 'metric' as const,
        id: m.metric_name,
        value: m.value,
        source: 'risk_calculation'
      })),
      calculations: [],
      confidence: 0.7
    };
  }

  /**
   * Get metric calculation details
   */
  private async getMetricCalculation(query: LLMQuery): Promise<LLMResponse> {
    const userId = query.user_id || 'default_user';
    
    // Extract metric name from question
    const metricName = this.extractMetricName(query.query);
    
    const calculations = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})-[:HAS_CALCULATION]->(c:Calculation)
      WHERE c.metric_name = $metricName
      RETURN c.metric_name, c.formula, c.inputs, c.result
    `, { userId, metricName });

    if (calculations.length === 0) {
      return {
        answer: `I don't have calculation details for ${metricName}.`,
        data_points: [],
        calculations: [],
        confidence: 0.1
      };
    }

    const calc = calculations[0];
    const answer = `${calc.metric_name} is calculated using the formula: ${calc.formula}\n\n` +
                  `Inputs:\n${Object.entries(calc.inputs).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n` +
                  `Result: ${calc.result}`;

    return {
      answer,
      data_points: [{
        type: 'calculation' as const,
        id: calc.metric_name,
        value: calc,
        source: 'calculation_engine'
      }],
      calculations: [{
        metric_name: calc.metric_name,
        formula: calc.formula,
        inputs: calc.inputs,
        result: calc.result
      }],
      confidence: 0.95
    };
  }

  /**
   * Get comparison analysis
   */
  private async getComparison(query: LLMQuery): Promise<LLMResponse> {
    // This would implement fund-to-fund or time-period comparisons
    return {
      answer: 'Comparison analysis is not yet implemented.',
      data_points: [],
      calculations: [],
      confidence: 0.1
    };
  }

  /**
   * Get general answer for unrecognized questions
   */
  private async getGeneralAnswer(query: LLMQuery): Promise<LLMResponse> {
    const userId = query.user_id || 'default_user';
    
    // Get basic user info
    const userInfo = await this.conn.executeQuery(`
      MATCH (u:User {id: $userId})
      RETURN u.first_name, u.last_name, u.email
    `, { userId });

    const answer = `I can help you analyze your portfolio data. I have information about your investments, fund performance, and calculated metrics. ` +
                  `Try asking about your portfolio overview, fund performance, risk analysis, or specific calculations.`;

    return {
      answer,
      data_points: userInfo.map(u => ({
        type: 'user' as const,
        id: userId,
        value: u,
        source: 'user_profile'
      })),
      calculations: [],
      confidence: 0.5
    };
  }

  /**
   * Extract metric name from question
   */
  private extractMetricName(question: string): string {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('irr')) return 'portfolio_irr';
    if (lowerQuestion.includes('multiple')) return 'portfolio_multiple';
    if (lowerQuestion.includes('nav')) return 'total_nav';
    if (lowerQuestion.includes('commitment')) return 'total_commitment';
    if (lowerQuestion.includes('distribution')) return 'total_distributions';
    
    return 'portfolio_irr'; // Default
  }

  /**
   * Get available questions the system can answer
   */
  getAvailableQuestions(): string[] {
    return [
      'What is my portfolio overview?',
      'How is my portfolio performing?',
      'What is my portfolio IRR?',
      'How is my portfolio IRR calculated?',
      'What is my portfolio multiple?',
      'Show me my fund performance',
      'What is my risk analysis?',
      'How diversified is my portfolio?',
      'What are my total commitments?',
      'What is my current NAV?'
    ];
  }
}
