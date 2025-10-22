import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';
import { 
  FundPerformance,
  DocumentClassification,
  FundTransactionSummary
} from '../types/types';

// Load environment variables
dotenv.config();

export class Neo4jConnection {
  private driver: Driver | null = null;
  private uri: string;
  private user: string;
  private password: string;

  constructor(
    uri: string = process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: string = process.env.NEO4J_USER || 'neo4j',
    password: string = process.env.NEO4J_PASSWORD || 'password123'
  ) {
    this.uri = uri;
    this.user = user;
    this.password = password;
  }

  /**
   * Establish connection to Neo4j database
   */
  async connect(): Promise<boolean> {
    try {
      this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password));
      
      // Test the connection
      await this.driver.verifyConnectivity();
      console.log(`✅ Connected to Neo4j at ${this.uri}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error);
      return false;
    }
  }

  /**
   * Close the Neo4j connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      console.log('🔌 Neo4j connection closed');
    }
  }

  /**
   * Test the database connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return false;
    }

    try {
      const session = this.driver.session();
      const result = await session.run('RETURN "Hello Neo4j!" as message');
      const message = result.records[0].get('message');
      console.log(`✅ Connection test successful: ${message}`);
      await session.close();
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * Create constraints and indexes for document processing schema
   */
  async createSchema(): Promise<boolean> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return false;
    }

    try {
      const session = this.driver.session();
      
      // Create constraints
      await session.run('CREATE CONSTRAINT tenant_id_unique FOR (t:Tenant) REQUIRE t.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT fund_name_unique FOR (f:Fund) REQUIRE f.fund_name IS UNIQUE');
      await session.run('CREATE CONSTRAINT document_id_unique FOR (d:Document) REQUIRE d.id IS UNIQUE');
      
      // Create indexes for performance
      await session.run('CREATE INDEX tenant_id_index FOR (t:Tenant) ON (t.id)');
      await session.run('CREATE INDEX fund_name_index FOR (f:Fund) ON (f.fund_name)');
      await session.run('CREATE INDEX document_classification_index FOR (d:Document) ON (d.classification)');
      await session.run('CREATE INDEX nav_date_index FOR (n:NAV) ON (n.as_of_date)');
      await session.run('CREATE INDEX transaction_date_index FOR (t:Transaction) ON (t.as_of_date)');

      await session.close();
      console.log('✅ Schema constraints and indexes created successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to create schema:', error);
      return false;
    }
  }

  /**
   * Query fund performance over time
   */
  async queryFundPerformance(startDate?: string, endDate?: string): Promise<FundPerformance[]> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return [];
    }

    try {
      const session = this.driver.session();
      const dateFilter = startDate && endDate ? 
        `WHERE n.as_of_date >= datetime('${startDate}') AND n.as_of_date <= datetime('${endDate}')` : '';
      
      const result = await session.run(`
        MATCH (f:Fund)<-[:BELONGS_TO]-(n:NAV)
        ${dateFilter}
        RETURN f.fund_name as fund_name, 
               avg(n.nav_value) as avg_nav,
               max(n.nav_value) as max_nav,
               min(n.nav_value) as min_nav,
               count(n) as nav_count
        ORDER BY avg_nav DESC
      `);
      
      const performance: FundPerformance[] = result.records.map(record => ({
        fund_name: record.get('fund_name'),
        avg_nav: parseFloat(record.get('avg_nav')),
        max_nav: parseFloat(record.get('max_nav')),
        min_nav: parseFloat(record.get('min_nav')),
        nav_count: parseInt(record.get('nav_count'))
      }));

      await session.close();
      console.log(`📊 Found performance data for ${performance.length} funds`);
      return performance;
    } catch (error) {
      console.error('❌ Failed to query fund performance:', error);
      return [];
    }
  }

  /**
   * Query documents by classification
   */
  async queryDocumentsByClassification(): Promise<DocumentClassification[]> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return [];
    }

    try {
      const session = this.driver.session();
      const result = await session.run(`
        MATCH (d:Document)
        WHERE d.classification IS NOT NULL
        RETURN d.classification as classification, count(d) as count
        ORDER BY count DESC
      `);
      
      const classifications: DocumentClassification[] = result.records.map(record => ({
        classification: record.get('classification'),
        count: parseInt(record.get('count'))
      }));

      await session.close();
      console.log(`📄 Found ${classifications.length} document classifications`);
      return classifications;
    } catch (error) {
      console.error('❌ Failed to query document classifications:', error);
      return [];
    }
  }

  /**
   * Get fund transaction summary
   */
  async getFundTransactionSummary(startDate?: string, endDate?: string): Promise<FundTransactionSummary[]> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return [];
    }

    try {
      const session = this.driver.session();
      const dateFilter = startDate && endDate ? 
        `WHERE t.as_of_date >= datetime('${startDate}') AND t.as_of_date <= datetime('${endDate}')` : '';
      
      const result = await session.run(`
        MATCH (f:Fund)<-[:BELONGS_TO]-(t:Transaction)
        ${dateFilter}
        RETURN f.fund_name as fund_name,
               sum(t.transaction_amount) as total_amount,
               count(t) as transaction_count,
               collect(DISTINCT t.transaction_type) as transaction_types
        ORDER BY total_amount DESC
      `);

      const summaries: FundTransactionSummary[] = result.records.map(record => ({
        fund_name: record.get('fund_name'),
        total_amount: parseFloat(record.get('total_amount')),
        transaction_count: parseInt(record.get('transaction_count')),
        transaction_types: record.get('transaction_types')
      }));

      await session.close();
      console.log(`💰 Found transaction summaries for ${summaries.length} funds`);
      return summaries;
    } catch (error) {
      console.error('❌ Failed to get fund transaction summary:', error);
      return [];
    }
  }

  /**
   * Execute a custom Cypher query
   */
  async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    if (!this.driver) {
      console.error('❌ Driver not initialized');
      return [];
    }

    try {
      const session = this.driver.session();
      const result = await session.run(query, parameters);
      
      const records = result.records.map(record => {
        const obj: Record<string, any> = {};
        record.keys.forEach(key => {
          obj[key as string] = record.get(key);
        });
        return obj;
      });

      await session.close();
      return records;
    } catch (error) {
      console.error('❌ Failed to execute query:', error);
      return [];
    }
  }
}
