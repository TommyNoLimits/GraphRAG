const neo4j = require('neo4j-driver');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class ScalableGraphRAGService {
  constructor() {
    // Initialize Neo4j connection
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );

    // Initialize Gemini
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Schema cache for performance
    this.schemaCache = new Map();
    this.schemaCacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastSchemaUpdate = 0;
  }

  async connect() {
    try {
      await this.driver.verifyConnectivity();
      console.log('✅ Connected to Neo4j');
      
      // Pre-load schema for better performance
      await this.loadSchema();
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error.message);
      throw error;
    }
  }

  async close() {
    await this.driver.close();
  }

  /**
   * Dynamically discover and cache database schema
   */
  async loadSchema() {
    const now = Date.now();
    
    // Return cached schema if still valid
    if (this.schemaCache.has('schema') && (now - this.lastSchemaUpdate) < this.schemaCacheTimeout) {
      return this.schemaCache.get('schema');
    }

    console.log('🔄 Loading database schema...');
    
    try {
      const session = this.driver.session();
      
      // Get all node labels and their properties
      const nodeLabelsQuery = `
        CALL db.labels() YIELD label
        RETURN collect(label) as labels
      `;
      
      const nodeLabelsResult = await session.run(nodeLabelsQuery);
      const labels = nodeLabelsResult.records[0]?.get('labels') || [];
      
      // Get ALL properties for each label (from all nodes, not just first one)
      const schema = {};
      
      for (const label of labels) {
        const propertiesQuery = `
          MATCH (n:\`${label}\`)
          RETURN DISTINCT keys(n) as properties
        `;
        
        const propertiesResult = await session.run(propertiesQuery);
        if (propertiesResult.records.length > 0) {
          // Collect all unique properties from all nodes of this type
          const allProperties = new Set();
          propertiesResult.records.forEach(record => {
            const properties = record.get('properties');
            properties.forEach(prop => allProperties.add(prop));
          });
          schema[label] = Array.from(allProperties).sort();
        }
      }
      
      // Get relationship types
      const relTypesQuery = `
        CALL db.relationshipTypes() YIELD relationshipType
        RETURN collect(relationshipType) as types
      `;
      
      const relTypesResult = await session.run(relTypesQuery);
      const relationshipTypes = relTypesResult.records[0]?.get('types') || [];
      
      const fullSchema = {
        nodes: schema,
        relationships: relationshipTypes,
        lastUpdated: now
      };
      
      // Cache the schema
      this.schemaCache.set('schema', fullSchema);
      this.lastSchemaUpdate = now;
      
      console.log(`✅ Loaded schema: ${Object.keys(schema).length} node types, ${relationshipTypes.length} relationship types`);
      
      await session.close();
      return fullSchema;
      
    } catch (error) {
      console.error('❌ Schema loading failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate a focused schema description for specific query context
   */
  async generateFocusedSchema(naturalLanguageQuery, tenantId = null) {
    const fullSchema = await this.loadSchema();
    
    // Analyze query to determine relevant node types
    const relevantNodes = this.identifyRelevantNodes(naturalLanguageQuery, fullSchema.nodes, tenantId);
    
    // Always include Tenant node for tenant-centric queries
    if (tenantId && fullSchema.nodes.Tenant) {
      relevantNodes.add('Tenant');
    }
    
    // Build focused schema description
    let schemaDescription = 'Database Schema (Tenant-Centric Investment Portfolio):\n\n';
    
    // Show all relevant node types with their properties
    for (const [label, properties] of Object.entries(fullSchema.nodes)) {
      if (relevantNodes.has(label)) {
        schemaDescription += `- ${label}: {\n`;
        properties.forEach(prop => {
          schemaDescription += `    ${prop}: <value>,\n`;
        });
        schemaDescription += `  }\n\n`;
      }
    }
    
    schemaDescription += 'Key Relationships (Tenant-Centric Flow):\n';
    
    // Add relevant relationships based on query context
    const relevantRelationships = this.identifyRelevantRelationships(naturalLanguageQuery, fullSchema.relationships);
    for (const relType of relevantRelationships) {
      schemaDescription += `- ${relType}\n`;
    }
    
    // Add relationship flow explanation
    schemaDescription += '\nRelationship Flow:\n';
    schemaDescription += '- User -[:BELONGS_TO]-> Tenant\n';
    schemaDescription += '- Tenant -[:MANAGES]-> UserEntity\n';
    schemaDescription += '- UserEntity -[:INVESTED_IN]-> UserFund\n';
    schemaDescription += '- UserFund -[:HAS_SUBSCRIPTION]-> Subscription\n';
    schemaDescription += '- Tenant -[:INTEREST]-> UserFund (for funds without subscriptions)\n';
    
    return schemaDescription;
  }

  /**
   * Identify which node types are relevant to the query
   */
  identifyRelevantNodes(query, nodes, tenantId = null) {
    const relevantNodes = new Set();
    const queryLower = query.toLowerCase();
    
    // Keyword mapping for common investment terms
    const keywordMapping = {
      'user': ['User'],
      'fund': ['UserFund'],
      'subscription': ['Subscription'],
      'entity': ['UserEntity'],
      'tenant': ['Tenant'],
      'investment': ['UserFund', 'Subscription'],
      'manager': ['UserFund'],
      'commitment': ['Subscription'],
      'email': ['User'],
      'stage': ['UserFund'],
      'geography': ['UserFund'],
      'minimum': ['UserFund'],
      'fee': ['UserFund']
    };
    
    // Check for keyword matches
    for (const [keyword, nodeTypes] of Object.entries(keywordMapping)) {
      if (queryLower.includes(keyword)) {
        nodeTypes.forEach(nodeType => relevantNodes.add(nodeType));
      }
    }
    
    // Always include core nodes for tenant-centric queries
    if (tenantId) {
      relevantNodes.add('Tenant');
      relevantNodes.add('User');
    }
    
    // Fallback: include all nodes if no specific matches
    if (relevantNodes.size === 0) {
      Object.keys(nodes).forEach(nodeType => relevantNodes.add(nodeType));
    }
    
    return relevantNodes;
  }

  /**
   * Identify relevant relationship types
   */
  identifyRelevantRelationships(query, relationships) {
    const relevantRelationships = new Set();
    const queryLower = query.toLowerCase();
    
    // Relationship keyword mapping
    const relationshipMapping = {
      'belongs': ['BELONGS_TO'],
      'manages': ['MANAGES'],
      'invested': ['INVESTED_IN'],
      'subscription': ['HAS_SUBSCRIPTION'],
      'interest': ['INTEREST']
    };
    
    for (const [keyword, relTypes] of Object.entries(relationshipMapping)) {
      if (queryLower.includes(keyword)) {
        relTypes.forEach(relType => relevantRelationships.add(relType));
      }
    }
    
    // Include core relationships for tenant queries
    if (queryLower.includes('tenant') || queryLower.includes('user')) {
      relevantRelationships.add('BELONGS_TO');
      relevantRelationships.add('MANAGES');
    }
    
    return Array.from(relevantRelationships);
  }

  /**
   * Convert natural language query to Cypher using focused schema
   */
  async generateCypherQuery(naturalLanguageQuery, tenantId = null) {
    try {
      // Generate focused schema based on query context
      const focusedSchema = await this.generateFocusedSchema(naturalLanguageQuery, tenantId);
      
      // Safely handle tenantId in template literal
      const tenantFilter = tenantId ? `IMPORTANT: Filter all queries by tenant_id = '${tenantId}' for data isolation.` : '';
      
      const prompt = `You are a Neo4j Cypher query expert specializing in tenant-centric investment portfolios. Convert the following natural language query into a Cypher query.

${focusedSchema}

${tenantFilter}

IMPORTANT CYPHER RULES:
- Use single quotes for string literals: 'value'
- Use double quotes for property names with spaces: n.\`property name\`
- NEVER use curly braces {} for parameters - use literal values instead
- Always filter by tenant_id for data isolation
- Use proper Cypher syntax - no JavaScript-style parameters

Natural Language Query: "${naturalLanguageQuery}"

Return ONLY the Cypher query, no explanations or markdown formatting.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const cypherQuery = response.text().trim();
      
      console.log('🤖 Generated Cypher:', cypherQuery);
      return cypherQuery;
    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      throw new Error('Failed to generate Cypher query');
    }
  }

  /**
   * Execute Cypher query with connection pooling and timeout
   */
  async executeQuery(cypherQuery, params = {}) {
    const session = this.driver.session();
    
    try {
      // Add timeout for large queries
      const result = await session.run(cypherQuery, params, {
        timeout: 30000 // 30 second timeout
      });
      
      // Convert Neo4j records to plain objects
      const records = result.records.map(record => {
        const obj = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          obj[key] = this.convertNeo4jValue(value);
        });
        return obj;
      });

      return {
        records: records,
        summary: result.summary
      };
    } catch (error) {
      console.error('❌ Cypher execution error:', error.message);
      throw new Error(`Query execution failed: ${error.message}`);
    } finally {
      await session.close();
    }
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
      return response.text().trim();
    } catch (error) {
      console.error('❌ Explanation generation error:', error.message);
      return `Analysis completed. Found ${resultsCount} results matching your query.`;
    }
  }

  /**
   * Process natural language query with enhanced error handling and explanations
   */
  async processQuery(naturalLanguageQuery, tenantId = null) {
    try {
      // Check if this looks like a direct Cypher query
      const isDirectCypher = naturalLanguageQuery.trim().toUpperCase().startsWith('MATCH') || 
                            naturalLanguageQuery.trim().toUpperCase().startsWith('RETURN') ||
                            naturalLanguageQuery.trim().toUpperCase().startsWith('WITH');
      
      let cypherQuery;
      
      if (isDirectCypher) {
        // Use the query directly as Cypher
        cypherQuery = naturalLanguageQuery;
        console.log('🔍 Direct Cypher query detected:', cypherQuery);
      } else {
        // Generate Cypher query using focused schema
        cypherQuery = await this.generateCypherQuery(naturalLanguageQuery, tenantId);
      }
      
      // Execute the query
      const result = await this.executeQuery(cypherQuery);
      
      // Generate plain English explanation
      const explanation = await this.generatePlainEnglishExplanation(
        naturalLanguageQuery, 
        cypherQuery, 
        result.records, 
        tenantId
      );
      
      return {
        success: true,
        query: cypherQuery,
        explanation: explanation,
        results: result.records,
        summary: {
          recordsReturned: result.records.length,
          queryTime: result.summary.resultAvailableAfter + result.summary.resultConsumedAfter
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query: null,
        explanation: null,
        results: []
      };
    }
  }

  /**
   * Get schema statistics for monitoring
   */
  async getSchemaStats() {
    const schema = await this.loadSchema();
    return {
      nodeTypes: Object.keys(schema.nodes).length,
      relationshipTypes: schema.relationships.length,
      lastUpdated: schema.lastUpdated,
      cacheAge: Date.now() - schema.lastUpdated
    };
  }
}

module.exports = ScalableGraphRAGService;
