const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const GraphRAGService = require('./graphrag-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Custom JSON serializer middleware to handle BigInt values
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    const jsonString = JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    );
    this.set('Content-Type', 'application/json');
    this.send(jsonString);
  };
  next();
});

// Initialize GraphRAG service
const graphRAG = new GraphRAGService();

// Connect to Neo4j on startup
graphRAG.connect().catch(console.error);

// API Routes

/**
 * Process natural language query
 */
app.post('/api/query', async (req, res) => {
  try {
    const { query, tenantId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 Processing query: "${query}" for tenant: ${tenantId || 'all'}`);
    
    const result = await graphRAG.processQuery(query, tenantId);
    res.json(result);
  } catch (error) {
    console.error('❌ Query processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's investment journey
 */
app.get('/api/user/:email/journey', async (req, res) => {
  try {
    const { email } = req.params;
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    console.log(`👤 Getting investment journey for: ${email} in tenant: ${tenantId}`);
    
    const result = await graphRAG.getUserInvestmentJourney(email, tenantId);
    res.json({
      success: true,
      results: result.records
    });
  } catch (error) {
    console.error('❌ Journey query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Search funds
 */
app.post('/api/funds/search', async (req, res) => {
  try {
    const { searchCriteria, tenantId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    console.log(`💰 Searching funds with criteria:`, searchCriteria);
    
    const result = await graphRAG.searchFunds(searchCriteria, tenantId);
    res.json({
      success: true,
      results: result.records
    });
  } catch (error) {
    console.error('❌ Fund search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check
 */
app.get('/api/health', async (req, res) => {
  try {
    // Test Neo4j connection
    const testResult = await graphRAG.executeQuery('RETURN 1 as test');
    
    res.json({
      status: 'healthy',
      neo4j: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      neo4j: 'disconnected',
      error: error.message
    });
  }
});

/**
 * Get database stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const statsQuery = `
      MATCH (n)
      RETURN 
        labels(n)[0] as node_type,
        count(n) as count
      ORDER BY count DESC
    `;
    
    const result = await graphRAG.executeQuery(statsQuery);
    
    res.json({
      success: true,
      nodeCounts: result.records
    });
  } catch (error) {
    console.error('❌ Stats query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get timing performance statistics
 */
app.get('/api/timing', (req, res) => {
  try {
    // This would typically come from a performance monitoring system
    // For now, we'll return a sample response showing what timing data looks like
    const sampleTimingData = {
      message: "Timing data is now included in all query responses",
      example: {
        timings: {
          total: 1250,
          cypherGeneration: 800,
          queryExecution: 300,
          explanationGeneration: 150
        },
        timingSummary: {
          total: "1250ms",
          breakdown: {
            cypherGeneration: "800ms",
            queryExecution: "300ms",
            explanationGeneration: "150ms"
          },
          percentages: {
            cypherGeneration: "64%",
            queryExecution: "24%",
            explanationGeneration: "12%"
          }
        }
      },
      endpoints: {
        query: "POST /api/query - Returns timing data in response",
        journey: "GET /api/user/:email/journey - Returns timing data in response",
        search: "POST /api/funds/search - Returns timing data in response"
      }
    };
    
    res.json(sampleTimingData);
  } catch (error) {
    console.error('❌ Timing stats error:', error);
    res.status(500).json({ error: 'Failed to get timing statistics' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await graphRAG.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await graphRAG.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 GraphRAG LLM Component running on port ${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   POST /api/query - Process natural language queries`);
  console.log(`   GET  /api/user/:email/journey - Get user investment journey`);
  console.log(`   POST /api/funds/search - Search funds`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/stats - Database statistics`);
  console.log(`   GET  /api/timing - Performance timing information`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
