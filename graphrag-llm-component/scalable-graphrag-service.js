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
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
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
      
      // Get sample properties for each label
      const schema = {};
      
      for (const label of labels) {
        const propertiesQuery = `
          MATCH (n:\`${label}\`)
          RETURN keys(n) as properties
          LIMIT 1
        `;
        
        const propertiesResult = await session.run(propertiesQuery);
        if (propertiesResult.records.length > 0) {
          schema[label] = propertiesResult.records[0].get('properties');
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
    const relevantNodes = this.identifyRelevantNodes(naturalLanguageQuery, fullSchema.nodes);
    
    // Build focused schema description
    let schemaDescription = 'Database Schema:\n';
    
    for (const [label, properties] of Object.entries(fullSchema.nodes)) {
      if (relevantNodes.has(label)) {
        schemaDescription += `- ${label}: {${properties.slice(0, 10).join(', ')}${properties.length > 10 ? ', ...' : ''}}\n`;
      }
    }
    
    schemaDescription += '\nKey Relationships:\n';
    
    // Add relevant relationships based on query context
    const relevantRelationships = this.identifyRelevantRelationships(naturalLanguageQuery, fullSchema.relationships);
    for (const relType of relevantRelationships) {
      schemaDescription += `- ${relType}\n`;
    }
    
    return schemaDescription;
  }

  /**
   * Identify which node types are relevant to the query
   */
  identifyRelevantNodes(query, nodes) {
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
      
      const prompt = `
You are a Neo4j Cypher query expert. Convert the following natural language query into a Cypher query.

${focusedSchema}

${tenantId ? `IMPORTANT: Filter all queries by tenant_id = '${tenantId}' for data isolation.` : ''}

Natural Language Query: "${naturalLanguageQuery}"

Return ONLY the Cypher query, no explanations or markdown formatting.
`;

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
   * Process natural language query with enhanced error handling
   */
  async processQuery(naturalLanguageQuery, tenantId = null) {
    try {
      // Generate Cypher query using focused schema
      const cypherQuery = await this.generateCypherQuery(naturalLanguageQuery, tenantId);
      
      // Execute the query
      const result = await this.executeQuery(cypherQuery);
      
      return {
        success: true,
        query: cypherQuery,
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
