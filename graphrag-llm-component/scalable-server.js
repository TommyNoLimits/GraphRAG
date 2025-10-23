const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ScalableGraphRAGService = require('./scalable-graphrag-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002; // Different port to avoid conflicts

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

// Initialize Scalable GraphRAG service
const graphRAG = new ScalableGraphRAGService();

// Connect to Neo4j on startup
graphRAG.connect().catch(console.error);

// API Routes

/**
 * Process natural language query with scalable service
 */
app.post('/api/query', async (req, res) => {
  try {
    const { query, tenantId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 [SCALABLE] Processing query: "${query}" for tenant: ${tenantId || 'all'}`);
    
    const result = await graphRAG.processQuery(query, tenantId);
    res.json(result);
  } catch (error) {
    console.error('❌ Query processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get schema statistics
 */
app.get('/api/schema-stats', async (req, res) => {
  try {
    const stats = await graphRAG.getSchemaStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Schema stats error:', error);
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
      service: 'scalable-graphrag',
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
  console.log(`🚀 Scalable GraphRAG LLM Component running on port ${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   POST /api/query - Process natural language queries (SCALABLE)`);
  console.log(`   GET  /api/schema-stats - Schema statistics`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/stats - Database statistics`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 Service: Scalable GraphRAG with dynamic schema discovery`);
});
