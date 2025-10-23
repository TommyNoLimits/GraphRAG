const GraphRAGService = require('./graphrag-service');
require('dotenv').config();

async function testGraphRAG() {
  console.log('🧪 Testing GraphRAG LLM Component...\n');
  
  const graphRAG = new GraphRAGService();
  
  try {
    // Connect to Neo4j
    await graphRAG.connect();
    console.log('✅ Connected to Neo4j\n');

    // Test queries
    const testQueries = [
      {
        name: 'Basic Fund Query',
        query: 'Show me all funds',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'Fund Filtering',
        query: 'Show me hedge funds with investment minimum under $1M',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'User Journey',
        query: 'What is the investment journey for tommymmcguire@gmail.com?',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'Fund Manager Search',
        query: 'Show me funds managed by CAZ Investments LP',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'NAV Performance Query',
        query: 'What is the NAV performance for CAZ Private Equity Ownership II?',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'Portfolio Value Query',
        query: 'Show me the current portfolio value and NAV data for all investments',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      },
      {
        name: 'Investment Returns Query',
        query: 'What are the investment returns and asset values over time?',
        tenantId: 'fd68d10f-0780-4140-b393-3adf8109df4f'
      }
    ];

    for (const test of testQueries) {
      console.log(`🔍 Testing: ${test.name}`);
      console.log(`   Query: "${test.query}"`);
      
      const result = await graphRAG.processQuery(test.query, test.tenantId);
      
      if (result.success) {
        console.log(`   ✅ Success! Found ${result.results.length} results`);
        console.log(`   📊 Generated Cypher: ${result.query}`);
        if (result.results.length > 0) {
          console.log(`   📋 Sample result:`, JSON.stringify(result.results[0], null, 2));
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      console.log('');
    }

    // Test direct Cypher queries
    console.log('🔍 Testing Direct Cypher Queries...\n');
    
    const directQueries = [
      {
        name: 'Node Counts',
        query: 'MATCH (n) RETURN labels(n)[0] as node_type, count(n) as count ORDER BY count DESC'
      },
      {
        name: 'Fund Details',
        query: 'MATCH (uf:UserFund) WHERE uf.tenant_id = "fd68d10f-0780-4140-b393-3adf8109df4f" RETURN uf.fund_name, uf.investment_manager_name, uf.fund_type LIMIT 5'
      },
      {
        name: 'NAV Data',
        query: 'MATCH (n:NAV) WHERE n.tenant_id = "fd68d10f-0780-4140-b393-3adf8109df4f" RETURN n.fund_name, n.nav, n.as_of_date ORDER BY n.as_of_date DESC LIMIT 5'
      },
      {
        name: 'Subscription-NAV Relationships',
        query: 'MATCH (s:Subscription)-[:HAS_NAV]->(n:NAV) WHERE s.tenant_id = "fd68d10f-0780-4140-b393-3adf8109df4f" RETURN s.fund_name, s.commitment_amount, n.nav, n.as_of_date LIMIT 5'
      }
    ];

    for (const test of directQueries) {
      console.log(`🔍 Testing: ${test.name}`);
      const result = await graphRAG.executeQuery(test.query);
      console.log(`   ✅ Found ${result.records.length} results`);
      if (result.records.length > 0) {
        console.log(`   📋 Sample:`, JSON.stringify(result.records[0], null, 2));
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await graphRAG.close();
    console.log('🔌 Connection closed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGraphRAG();
}

module.exports = testGraphRAG;
