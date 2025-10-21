import { Neo4jConnection } from './neo4j-connection';
import { Document, Fund, NAV, Transaction } from './types';

/**
 * Document Processing GraphRAG utilities for knowledge graph operations
 */
export class DocumentGraphRAGUtils {
  private conn: Neo4jConnection;

  constructor(connection: Neo4jConnection) {
    this.conn = connection;
  }

  /**
   * Find documents related to a specific fund
   */
  async findDocumentsByFund(fundName: string): Promise<Document[]> {
    try {
      const results = await this.conn.executeQuery(`
        MATCH (d:Document)-[:REFERENCES]->(f:Fund {fund_name: $fundName})
        RETURN d.id as id, d.fund_name as fund_name, d.investment_entity as investment_entity,
               d.as_of_date as as_of_date, d.file_name as file_name, d.classification as classification,
               d.summary as summary
        ORDER BY d.as_of_date DESC
      `, { fundName });

      return results.map(result => ({
        id: parseInt(result.id),
        tenant_id: '', // Not returned in query
        fund_name: result.fund_name,
        investment_entity: result.investment_entity,
        as_of_date: new Date(result.as_of_date),
        file_name: result.file_name,
        classification: result.classification,
        summary: result.summary
      }));
    } catch (error) {
      console.error('❌ Failed to find documents by fund:', error);
      return [];
    }
  }

  /**
   * Find funds with similar characteristics
   */
  async findSimilarFunds(fundName: string, limit: number = 5): Promise<Fund[]> {
    try {
      const results = await this.conn.executeQuery(`
        MATCH (f1:Fund {fund_name: $fundName})
        MATCH (f2:Fund)
        WHERE f1 <> f2
        AND (f1.fund_type = f2.fund_type OR f1.investment_type = f2.investment_type)
        RETURN f2.fund_name as fund_name, f2.investment_manager as investment_manager,
               f2.fund_type as fund_type, f2.investment_type as investment_type,
               f2.inception_year as inception_year
        ORDER BY f2.fund_name
        LIMIT $limit
      `, { fundName, limit });

      return results.map(result => ({
        id: 0, // Not available in graph
        fund_name: result.fund_name,
        investment_manager_name: result.investment_manager,
        fund_type: result.fund_type,
        investment_type: result.investment_type,
        inception_year: result.inception_year
      }));
    } catch (error) {
      console.error('❌ Failed to find similar funds:', error);
      return [];
    }
  }

  /**
   * Get fund performance timeline
   */
  async getFundPerformanceTimeline(fundName: string, startDate?: string, endDate?: string): Promise<NAV[]> {
    try {
      const dateFilter = startDate && endDate ? 
        `AND n.as_of_date >= datetime('${startDate}') AND n.as_of_date <= datetime('${endDate}')` : '';
      
      const results = await this.conn.executeQuery(`
        MATCH (f:Fund {fund_name: $fundName})<-[:BELONGS_TO]-(n:NAV)
        WHERE 1=1 ${dateFilter}
        RETURN n.fund_name as fund_name, n.investment_entity as investment_entity,
               n.as_of_date as as_of_date, n.nav_value as nav
        ORDER BY n.as_of_date ASC
      `, { fundName });

      return results.map(result => ({
        id: 0, // Not available in graph
        tenant_id: '', // Not available in graph
        fund_name: result.fund_name,
        investment_entity: result.investment_entity,
        as_of_date: new Date(result.as_of_date),
        nav: result.nav
      }));
    } catch (error) {
      console.error('❌ Failed to get fund performance timeline:', error);
      return [];
    }
  }

  /**
   * Find documents by classification and date range
   */
  async findDocumentsByClassificationAndDate(
    classification: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<Document[]> {
    try {
      const dateFilter = startDate && endDate ? 
        `AND d.as_of_date >= datetime('${startDate}') AND d.as_of_date <= datetime('${endDate}')` : '';
      
      const results = await this.conn.executeQuery(`
        MATCH (d:Document)
        WHERE d.classification = $classification ${dateFilter}
        RETURN d.id as id, d.fund_name as fund_name, d.investment_entity as investment_entity,
               d.as_of_date as as_of_date, d.file_name as file_name, d.classification as classification,
               d.summary as summary
        ORDER BY d.as_of_date DESC
      `, { classification });

      return results.map(result => ({
        id: parseInt(result.id),
        tenant_id: '', // Not returned in query
        fund_name: result.fund_name,
        investment_entity: result.investment_entity,
        as_of_date: new Date(result.as_of_date),
        file_name: result.file_name,
        classification: result.classification,
        summary: result.summary
      }));
    } catch (error) {
      console.error('❌ Failed to find documents by classification:', error);
      return [];
    }
  }

  /**
   * Get fund transaction history
   */
  async getFundTransactionHistory(fundName: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    try {
      const dateFilter = startDate && endDate ? 
        `AND t.as_of_date >= datetime('${startDate}') AND t.as_of_date <= datetime('${endDate}')` : '';
      
      const results = await this.conn.executeQuery(`
        MATCH (f:Fund {fund_name: $fundName})<-[:BELONGS_TO]-(t:Transaction)
        WHERE 1=1 ${dateFilter}
        RETURN t.fund_name as fund_name, t.investment_entity as investment_entity,
               t.as_of_date as as_of_date, t.transaction_amount as transaction_amount,
               t.transaction_type as transaction_type
        ORDER BY t.as_of_date DESC
      `, { fundName });

      return results.map(result => ({
        id: 0, // Not available in graph
        tenant_id: '', // Not available in graph
        fund_name: result.fund_name,
        investment_entity: result.investment_entity,
        as_of_date: new Date(result.as_of_date),
        transaction_amount: result.transaction_amount,
        transaction_type: result.transaction_type
      }));
    } catch (error) {
      console.error('❌ Failed to get fund transaction history:', error);
      return [];
    }
  }

  /**
   * Find related entities for a document (funds, transactions, NAVs)
   */
  async getDocumentContext(documentId: string): Promise<{
    document: Document | null;
    relatedFunds: Fund[];
    relatedNAVs: NAV[];
    relatedTransactions: Transaction[];
  }> {
    try {
      const results = await this.conn.executeQuery(`
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:REFERENCES]->(f:Fund)
        OPTIONAL MATCH (f)<-[:BELONGS_TO]-(n:NAV)
        OPTIONAL MATCH (f)<-[:BELONGS_TO]-(t:Transaction)
        RETURN d.id as doc_id, d.fund_name as doc_fund_name, d.investment_entity as doc_entity,
               d.as_of_date as doc_date, d.file_name as doc_file_name, d.classification as doc_classification,
               collect(DISTINCT f.fund_name) as fund_names,
               collect(DISTINCT n.nav_value) as nav_values,
               collect(DISTINCT t.transaction_amount) as transaction_amounts
      `, { documentId });

      if (results.length === 0) {
        return { document: null, relatedFunds: [], relatedNAVs: [], relatedTransactions: [] };
      }

      const result = results[0];
      const document: Document = {
        id: parseInt(result.doc_id),
        tenant_id: '', // Not available
        fund_name: result.doc_fund_name,
        investment_entity: result.doc_entity,
        as_of_date: new Date(result.doc_date),
        file_name: result.doc_file_name,
        classification: result.doc_classification
      };

      const relatedFunds: Fund[] = result.fund_names.filter((name: string) => name !== null)
        .map((name: string) => ({ id: 0, fund_name: name }));

      const relatedNAVs: NAV[] = result.nav_values.filter((value: number) => value !== null)
        .map((value: number) => ({
          id: 0,
          tenant_id: '',
          fund_name: result.doc_fund_name,
          investment_entity: result.doc_entity,
          as_of_date: new Date(),
          nav: value
        }));

      const relatedTransactions: Transaction[] = result.transaction_amounts.filter((amount: number) => amount !== null)
        .map((amount: number) => ({
          id: 0,
          tenant_id: '',
          fund_name: result.doc_fund_name,
          investment_entity: result.doc_entity,
          as_of_date: new Date(),
          transaction_amount: amount,
          transaction_type: 'Unknown'
        }));

      return { document, relatedFunds, relatedNAVs, relatedTransactions };
    } catch (error) {
      console.error('❌ Failed to get document context:', error);
      return { document: null, relatedFunds: [], relatedNAVs: [], relatedTransactions: [] };
    }
  }

  /**
   * Search for documents by text content (simplified)
   */
  async searchDocuments(searchText: string, limit: number = 10): Promise<Document[]> {
    try {
      const results = await this.conn.executeQuery(`
        MATCH (d:Document)
        WHERE d.file_name CONTAINS $searchText 
           OR d.summary CONTAINS $searchText 
           OR d.fund_name CONTAINS $searchText
        RETURN d.id as id, d.fund_name as fund_name, d.investment_entity as investment_entity,
               d.as_of_date as as_of_date, d.file_name as file_name, d.classification as classification,
               d.summary as summary
        ORDER BY d.as_of_date DESC
        LIMIT $limit
      `, { searchText, limit });

      return results.map(result => ({
        id: parseInt(result.id),
        tenant_id: '', // Not returned in query
        fund_name: result.fund_name,
        investment_entity: result.investment_entity,
        as_of_date: new Date(result.as_of_date),
        file_name: result.file_name,
        classification: result.classification,
        summary: result.summary
      }));
    } catch (error) {
      console.error('❌ Failed to search documents:', error);
      return [];
    }
  }
}

/**
 * Example Document Processing GraphRAG workflow
 */
export async function runDocumentGraphRAGExample(): Promise<void> {
  console.log('🧠 Starting Document Processing GraphRAG Example...\n');

  const conn = new Neo4jConnection();
  const documentRAG = new DocumentGraphRAGUtils(conn);

  try {
    // Connect
    if (!(await conn.connect())) {
      console.log('❌ Failed to connect to Neo4j');
      return;
    }

    // Search for documents
    console.log('🔍 Searching for documents containing "statement":');
    const documents = await documentRAG.searchDocuments('statement', 5);
    documents.forEach(doc => {
      console.log(`  - ${doc.file_name} (${doc.classification}) - ${doc.fund_name}`);
    });

    // Find documents by fund (if any funds exist)
    console.log('\n📊 Finding documents by fund:');
    const fundDocuments = await documentRAG.findDocumentsByFund('Sample Fund');
    if (fundDocuments.length > 0) {
      fundDocuments.forEach(doc => {
        console.log(`  - ${doc.file_name} (${doc.as_of_date.toDateString()})`);
      });
    } else {
      console.log('  No documents found for "Sample Fund"');
    }

    // Get fund performance timeline
    console.log('\n📈 Fund performance timeline:');
    const performanceData = await documentRAG.getFundPerformanceTimeline('Sample Fund');
    if (performanceData.length > 0) {
      performanceData.slice(0, 3).forEach(nav => {
        console.log(`  - ${nav.as_of_date.toDateString()}: $${nav.nav.toFixed(2)}`);
      });
    } else {
      console.log('  No performance data found');
    }

    console.log('\n✅ Document Processing GraphRAG example completed!');

  } catch (error) {
    console.error('❌ Document Processing GraphRAG example failed:', error);
  } finally {
    await conn.close();
  }
}
