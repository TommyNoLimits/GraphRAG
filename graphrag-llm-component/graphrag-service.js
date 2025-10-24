const neo4j = require('neo4j-driver');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GraphRAGService {
  constructor() {
    // Initialize Neo4j connection
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );

    // Initialize Gemini
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async connect() {
    try {
      await this.driver.verifyConnectivity();
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error.message);
      throw error;
    }
  }

  async close() {
    await this.driver.close();
  }

  /**
   * Convert natural language query to Cypher using Gemini
   */
  async generateCypherQuery(naturalLanguageQuery, tenantId = null) {
    const startTime = Date.now();
    
    const prompt = `
You are a Neo4j Cypher query expert. Convert the following natural language query into a Cypher query.

Database Schema:
- User: {id, tenant_id, email, first_name, last_name, username, ...}
- Tenant: {id, name, created_at, updated_at}
- UserEntity: {id, tenant_id, investment_entity, entity_allias, ...}
- UserFund: {id, tenant_id, fund_name, investment_manager_name, general_partner, investment_type, fund_type, stage, investment_minimum, management_fee, carry_fee, geography, gics_sector, liquidity, investment_summary, ...}
- Subscription: {id, tenant_id, fund_name, investment_entity, as_of_date, commitment_amount (stored as string), ...}
- NAV: {id, tenant_id, fund_name, investment_entity, nav_values (JSON string with date->{nav, created_at, updated_at} pairs), latest_nav, latest_date, nav_count, created_at, updated_at}
- Movements: {id, tenant_id, fund_name, investment_entity, movements (JSON string with date->{type, amount, source, created_at, updated_at} pairs), latest_movement_date, latest_movement_type, latest_movement_amount, movement_count, created_at, updated_at}

IMPORTANT DATA TYPE NOTES:
- Many numeric fields are stored as STRINGS (e.g., "11500.00", "0.00")
- Fields like commitment_amount, latest_nav, investment_minimum, management_fee, carry_fee are stored as strings
- When using SUM(), AVG(), MIN(), MAX() on these fields, use toFloat() conversion
- Example: SUM(toFloat(s.commitment_amount)) instead of SUM(s.commitment_amount)
- Common string-numeric fields: commitment_amount, latest_nav, investment_minimum, management_fee, carry_fee, amount, value, price, cost, total, sum, balance

NAV QUERY PATTERNS:
- Use n.latest_nav for most recent NAV value
- Use n.latest_date for most recent NAV date  
- Use n.nav_values (JSON string) to get all historical NAV data
- Use n.nav_count to know how many historical entries exist
- nav_values is stored as a JSON string with structure: {"2023-01-01": {"nav": "100.00", "created_at": "2023-01-01T10:30:00Z", "updated_at": "2023-01-01T10:30:00Z"}}
- Each NAV entry has: nav value, created_at, updated_at timestamps
- Example: Parse n.nav_values in application code to access specific dates and timestamps

MOVEMENTS QUERY PATTERNS:
- Use m.latest_movement_date for most recent movement date
- Use m.latest_movement_type for most recent movement type  
- Use m.latest_movement_amount for most recent movement amount
- Use m.movements (JSON string) to get ALL historical movement/transaction data
- Use m.movement_count to know how many historical entries exist
- movements is stored as a JSON string with structure: {"2023-01-15": {"type": "capital_call", "amount": "50000.00", "source": "movements", "created_at": "2023-01-15T14:20:00Z", "updated_at": "2023-01-15T14:20:00Z"}}
- Each movement entry has: type, amount, source, created_at, updated_at timestamps
- IMPORTANT: For queries about "recent", "all", "historical", or "any" movements, ALWAYS return m.movements JSON to get complete data
- For filtering by movement type (capital_call, distribution, etc.), return m.movements and filter in application code
- CRITICAL: Always use the actual "type" field from the JSON data, never infer from positive/negative amounts
- Common movement types: "capital_call", "distribution", "subscription", "redemption", "dividend", "interest"
- If type field is missing or null, note this in analysis rather than inferring from amount sign
- Example queries: "recent capital calls" → return m.movements, "all distributions" → return m.movements, "any movements" → return m.movements

Relationships:
- User -[:BELONGS_TO]-> Tenant
- Tenant -[:MANAGES]-> UserEntity
- UserEntity -[:INVESTED_IN]-> UserFund
- UserFund -[:HAS_SUBSCRIPTION]-> Subscription
- Subscription -[:HAS_NAV]-> NAV (Net Asset Value data)
- Subscription -[:HAS_MOVEMENTS]-> Movements (Movement/Transaction data)
- UserEntity -[:HAS_SUBSCRIPTION]-> Subscription
- Tenant -[:INTEREST]-> UserFund

${tenantId ? `IMPORTANT: Filter all queries by tenant_id = '${tenantId}' for data isolation.` : ''}

CYPHER RULES FOR NUMERIC OPERATIONS:
- Always use toFloat() when performing SUM(), AVG(), MIN(), MAX() on fields that might be stored as strings
- Common string-numeric fields: commitment_amount, latest_nav, latest_movement_amount, investment_minimum, management_fee, carry_fee, amount, value, price, cost, total, sum, balance
- Use toInteger() for whole number conversions
- Handle potential null values with COALESCE() if needed
- Examples: 
  * SUM(toFloat(s.commitment_amount)) AS total_amount
  * AVG(toFloat(nav.latest_nav)) AS average_nav
  * MAX(toFloat(m.latest_movement_amount)) AS max_movement_amount
  * MAX(toFloat(uf.investment_minimum)) AS max_minimum

NAV-SPECIFIC QUERY EXAMPLES:
- Latest NAV: RETURN nav.latest_nav, nav.latest_date
- All NAVs for fund: RETURN nav.nav_values, nav.nav_count
- NAV aggregation: SUM(toFloat(nav.latest_nav)) AS total_nav
- NAV statistics: AVG(toFloat(nav.latest_nav)) AS avg_nav

MOVEMENTS-SPECIFIC QUERY EXAMPLES:
- Latest movement: RETURN m.latest_movement_date, m.latest_movement_type, m.latest_movement_amount
- All movements for fund: RETURN m.movements, m.movement_count
- Recent capital calls/distributions: RETURN m.movements, m.latest_movement_date, m.latest_movement_type
- Historical movements: RETURN m.movements, m.movement_count (parse JSON in application)
- Movement aggregation: SUM(toFloat(m.latest_movement_amount)) AS total_movement_amount
- Movement statistics: AVG(toFloat(m.latest_movement_amount)) AS avg_movement_amount
- For "any recent movements" queries: ALWAYS include m.movements in RETURN clause

Natural Language Query: "${naturalLanguageQuery}"

Return ONLY the Cypher query, no explanations or markdown formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const cypherQuery = response.text().trim();
      
      const generationTime = Date.now() - startTime;
      console.log(`🤖 Generated Cypher in ${generationTime}ms:`, cypherQuery);
      return cypherQuery;
    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error(`❌ Gemini API error after ${generationTime}ms:`, error.message);
      throw new Error('Failed to generate Cypher query');
    }
  }

  /**
   * Execute Cypher query and return results
   */
  async executeQuery(cypherQuery) {
    const startTime = Date.now();
    const session = this.driver.session();
    try {
      const result = await session.run(cypherQuery);
      const executionTime = Date.now() - startTime;
      
      // Convert Neo4j records to plain objects
      const records = result.records.map(record => {
        const obj = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          obj[key] = this.convertNeo4jValue(value);
        });
        return obj;
      });

      console.log(`⏱️  Query executed in ${executionTime}ms, returned ${records.length} records`);
      return {
        records: records,
        summary: result.summary
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Cypher execution error after ${executionTime}ms:`, error.message);
      
      // Check if it's a data type error with SUM/aggregation functions
      if (error.message.includes('SUM') && error.message.includes('can only handle numerical values')) {
        console.log('🔧 Detected data type error - attempting to fix query...');
        const fixedQuery = this.fixAggregationQuery(cypherQuery);
        if (fixedQuery !== cypherQuery) {
          console.log('🔧 Retrying with fixed query:', fixedQuery);
          try {
            const retryResult = await session.run(fixedQuery);
            const retryRecords = retryResult.records.map(record => {
              const obj = {};
              record.keys.forEach(key => {
                const value = record.get(key);
                obj[key] = this.convertNeo4jValue(value);
              });
              return obj;
            });
            return {
              records: retryRecords,
              summary: retryResult.summary
            };
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError.message);
          }
        }
      }
      
      throw new Error(`Query execution failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Fix common aggregation query issues
   */
  fixAggregationQuery(query) {
    // Define fields that are known to be stored as strings but should be numeric
    const stringNumericFields = [
      'commitment_amount',
      'latest_nav',  // Updated from 'nav' to 'latest_nav'
      'latest_movement_amount',  // Added for Movements
      'investment_minimum',
      'management_fee',
      'carry_fee',
      'amount',
      'value',
      'price',
      'cost',
      'total',
      'sum',
      'balance'
    ];
    
    let fixedQuery = query;
    
    // Fix aggregation functions for known string-numeric fields
    for (const field of stringNumericFields) {
      // Fix SUM() operations
      fixedQuery = fixedQuery.replace(
        new RegExp(`SUM\\(([^)]*\\.${field})\\)`, 'g'),
        `SUM(toFloat($1.${field}))`
      );
      
      // Fix AVG() operations
      fixedQuery = fixedQuery.replace(
        new RegExp(`AVG\\(([^)]*\\.${field})\\)`, 'g'),
        `AVG(toFloat($1.${field}))`
      );
      
      // Fix MIN() operations
      fixedQuery = fixedQuery.replace(
        new RegExp(`MIN\\(([^)]*\\.${field})\\)`, 'g'),
        `MIN(toFloat($1.${field}))`
      );
      
      // Fix MAX() operations
      fixedQuery = fixedQuery.replace(
        new RegExp(`MAX\\(([^)]*\\.${field})\\)`, 'g'),
        `MAX(toFloat($1.${field}))`
      );
      
      // Fix COUNT() operations (though COUNT usually works on any type)
      fixedQuery = fixedQuery.replace(
        new RegExp(`COUNT\\(([^)]*\\.${field})\\)`, 'g'),
        `COUNT($1.${field})`
      );
    }
    
    return fixedQuery;
  }

  /**
   * Convert Neo4j values to plain JavaScript objects
   */
  convertNeo4jValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (neo4j.isInt(value)) {
      return value.toNumber();
    }
    
    if (neo4j.isDate(value)) {
      return value.toString();
    }
    
    if (neo4j.isDateTime(value)) {
      return value.toString();
    }
    
    if (neo4j.isTime(value)) {
      return value.toString();
    }
    
    if (neo4j.isDuration(value)) {
      return value.toString();
    }
    
    if (neo4j.isPoint(value)) {
      return value.toString();
    }
    
    // Handle BigInt values that might not be Neo4j Int types
    if (typeof value === 'bigint') {
      return Number(value);
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => this.convertNeo4jValue(item));
      } else {
        const obj = {};
        for (const [key, val] of Object.entries(value)) {
          obj[key] = this.convertNeo4jValue(val);
        }
        return obj;
      }
    }
    
    return value;
  }

  /**
   * Generate plain English explanation of query results
   */
  async generatePlainEnglishExplanation(naturalLanguageQuery, cypherQuery, results, tenantId = null) {
    const startTime = Date.now();
    
    // Safely stringify results to avoid template literal issues
    let resultsData = '';
    try {
      resultsData = JSON.stringify(results.slice(0, 5), null, 2);
    } catch (error) {
      resultsData = 'Results data unavailable';
    }
    
    const resultsCount = results.length;
    const resultsSuffix = resultsCount > 5 ? `\n... (showing first 5 of ${resultsCount} results)` : '';
    
    const prompt = `You are a financial advisor and portfolio analyst. Analyze the following investment data and provide a clear, detailed explanation in plain English.

Original Question: "${naturalLanguageQuery}"
Generated Cypher Query: "${cypherQuery}"
Number of Results: ${resultsCount}

Results Data:
${resultsData}${resultsSuffix}

IMPORTANT ANALYSIS GUIDELINES:
- For movement/transaction data: ALWAYS use the actual "type" field from the JSON data
- NEVER infer movement types from positive/negative amounts
- If the "type" field is missing, null, or "__NULL__", explicitly state this rather than guessing
- Common movement types include: "capital_call", "distribution", "subscription", "redemption", "dividend", "interest"
- For NAV data: Use the actual nav values and dates from the JSON structure
- Always parse JSON fields (movements, nav_values) to access individual entries with their timestamps

Please provide:
1. A clear answer to the user's question
2. Key insights and analysis
3. Important details about each investment
4. Any patterns or trends you notice
5. Recommendations or observations

Format your response as a comprehensive portfolio analysis that a client would understand.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const explanationTime = Date.now() - startTime;
      console.log(`📝 Generated explanation in ${explanationTime}ms`);
      return response.text().trim();
    } catch (error) {
      const explanationTime = Date.now() - startTime;
      console.error(`❌ Explanation generation error after ${explanationTime}ms:`, error.message);
      return `Analysis completed. Found ${resultsCount} results matching your query.`;
    }
  }

  /**
   * Process natural language query and return results with explanations
   */
  async processQuery(naturalLanguageQuery, tenantId = null) {
    const startTime = Date.now();
    const timings = {
      total: 0,
      cypherGeneration: 0,
      queryExecution: 0,
      explanationGeneration: 0
    };
    
    try {
      console.log(`🔍 Processing query: "${naturalLanguageQuery}" for tenant: ${tenantId}`);
      
      // Check if this looks like a direct Cypher query
      const isDirectCypher = naturalLanguageQuery.trim().toUpperCase().startsWith('MATCH') || 
                            naturalLanguageQuery.trim().toUpperCase().startsWith('RETURN') ||
                            naturalLanguageQuery.trim().toUpperCase().startsWith('WITH');
      
      let cypherQuery;
      
      if (isDirectCypher) {
        // Use the query directly as Cypher
        cypherQuery = naturalLanguageQuery;
        console.log('🔍 Direct Cypher query detected:', cypherQuery);
        timings.cypherGeneration = 0; // No generation time for direct queries
      } else {
        // Generate Cypher query using Gemini
        const cypherStartTime = Date.now();
        cypherQuery = await this.generateCypherQuery(naturalLanguageQuery, tenantId);
        timings.cypherGeneration = Date.now() - cypherStartTime;
        console.log(`⏱️  Cypher generation took: ${timings.cypherGeneration}ms`);
      }
      
      // Execute the query
      const executionStartTime = Date.now();
      const result = await this.executeQuery(cypherQuery);
      timings.queryExecution = Date.now() - executionStartTime;
      console.log(`⏱️  Query execution took: ${timings.queryExecution}ms`);
      
      // Generate plain English explanation
      const explanationStartTime = Date.now();
      const explanation = await this.generatePlainEnglishExplanation(
        naturalLanguageQuery, 
        cypherQuery, 
        result.records, 
        tenantId
      );
      timings.explanationGeneration = Date.now() - explanationStartTime;
      console.log(`⏱️  Explanation generation took: ${timings.explanationGeneration}ms`);
      
      timings.total = Date.now() - startTime;
      console.log(`⏱️  Total processing time: ${timings.total}ms`);
      
      return {
        success: true,
        query: cypherQuery,
        explanation: explanation,
        results: result.records,
        summary: {
          recordsReturned: result.records.length,
          queryTime: result.summary.resultAvailableAfter + result.summary.resultConsumedAfter
        },
        timings: timings,
        timingSummary: this.getTimingSummary(timings)
      };
    } catch (error) {
      timings.total = Date.now() - startTime;
      console.log(`❌ Query failed after ${timings.total}ms: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        query: null,
        explanation: null,
        results: [],
        timings: timings,
        timingSummary: this.getTimingSummary(timings)
      };
    }
  }

  /**
   * Get timing statistics summary
   */
  getTimingSummary(timings) {
    return {
      total: `${timings.total}ms`,
      breakdown: {
        cypherGeneration: `${timings.cypherGeneration}ms`,
        queryExecution: `${timings.queryExecution}ms`,
        explanationGeneration: `${timings.explanationGeneration}ms`
      },
      percentages: {
        cypherGeneration: `${Math.round((timings.cypherGeneration / timings.total) * 100)}%`,
        queryExecution: `${Math.round((timings.queryExecution / timings.total) * 100)}%`,
        explanationGeneration: `${Math.round((timings.explanationGeneration / timings.total) * 100)}%`
      }
    };
  }

  /**
   * Get user's complete investment journey
   */
  async getUserInvestmentJourney(userEmail, tenantId) {
    const startTime = Date.now();
    
    const query = `
      MATCH (u:User {email: $userEmail})-[:BELONGS_TO]->(t:Tenant {id: $tenantId})-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
      OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
      OPTIONAL MATCH (ue)-[:HAS_SUBSCRIPTION]->(s2:Subscription)
      OPTIONAL MATCH (t)-[:INTEREST]->(uf_interest:UserFund)
      RETURN 
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        t.name as tenant_name,
        collect(DISTINCT ue.investment_entity) as entities,
        collect(DISTINCT {
          fund_name: uf.fund_name,
          investment_manager: uf.investment_manager_name,
          fund_type: uf.fund_type,
          stage: uf.stage,
          investment_minimum: uf.investment_minimum,
          management_fee: uf.management_fee,
          geography: uf.geography
        }) as invested_funds,
        collect(DISTINCT {
          fund_name: s.fund_name,
          commitment_amount: s.commitment_amount,
          as_of_date: s.as_of_date
        }) as fund_subscriptions,
        collect(DISTINCT {
          fund_name: s2.fund_name,
          commitment_amount: s2.commitment_amount,
          as_of_date: s2.as_of_date
        }) as entity_subscriptions,
        collect(DISTINCT {
          fund_name: uf_interest.fund_name,
          investment_manager: uf_interest.investment_manager_name,
          fund_type: uf_interest.fund_type,
          stage: uf_interest.stage
        }) as interest_funds
    `;

    const result = await this.executeQuery(query, { userEmail, tenantId });
    const totalTime = Date.now() - startTime;
    console.log(`⏱️  User journey query completed in ${totalTime}ms`);
    
    return {
      ...result,
      timings: {
        total: totalTime,
        queryExecution: totalTime
      },
      timingSummary: {
        total: `${totalTime}ms`,
        breakdown: {
          queryExecution: `${totalTime}ms`
        },
        percentages: {
          queryExecution: "100%"
        }
      }
    };
  }

  /**
   * Search funds by various criteria
   */
  async searchFunds(searchCriteria, tenantId) {
    const startTime = Date.now();
    
    const { fundName, fundType, investmentType, stage, geography, minInvestment } = searchCriteria;
    
    let whereClause = `uf.tenant_id = $tenantId`;
    const params = { tenantId };
    
    if (fundName) {
      whereClause += ` AND uf.fund_name CONTAINS $fundName`;
      params.fundName = fundName;
    }
    
    if (fundType) {
      whereClause += ` AND uf.fund_type = $fundType`;
      params.fundType = fundType;
    }
    
    if (investmentType) {
      whereClause += ` AND uf.investment_type = $investmentType`;
      params.investmentType = investmentType;
    }
    
    if (stage) {
      whereClause += ` AND uf.stage = $stage`;
      params.stage = stage;
    }
    
    if (geography) {
      whereClause += ` AND uf.geography CONTAINS $geography`;
      params.geography = geography;
    }
    
    if (minInvestment) {
      whereClause += ` AND uf.investment_minimum <= $minInvestment`;
      params.minInvestment = parseFloat(minInvestment);
    }

    const query = `
      MATCH (uf:UserFund)
      WHERE ${whereClause}
      RETURN 
        uf.fund_name as fund_name,
        uf.investment_manager_name as investment_manager,
        uf.general_partner as general_partner,
        uf.fund_type as fund_type,
        uf.investment_type as investment_type,
        uf.stage as stage,
        uf.investment_minimum as investment_minimum,
        uf.management_fee as management_fee,
        uf.carry_fee as carry_fee,
        uf.geography as geography,
        uf.gics_sector as gics_sector,
        uf.liquidity as liquidity,
        uf.investment_summary as investment_summary
      ORDER BY uf.fund_name
    `;

    const result = await this.executeQuery(query, params);
    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Fund search completed in ${totalTime}ms`);
    
    return {
      ...result,
      timings: {
        total: totalTime,
        queryExecution: totalTime
      },
      timingSummary: {
        total: `${totalTime}ms`,
        breakdown: {
          queryExecution: `${totalTime}ms`
        },
        percentages: {
          queryExecution: "100%"
        }
      }
    };
  }
}

module.exports = GraphRAGService;
