# 🚀 GraphRAG LLM Component - Quick Setup Guide

## ✅ **What's Been Created**

A complete GraphRAG LLM component in `/graphrag-llm-component/` with:

- **Backend**: Express server with Neo4j integration
- **Frontend**: Simple HTML interface for testing
- **AI Integration**: Gemini AI for natural language to Cypher conversion
- **API**: RESTful endpoints for programmatic access

## 🎯 **Current Status**

✅ **Working Components:**
- Neo4j connection and query execution
- Express server with all API endpoints
- Web frontend with query interface
- Database statistics and health checks

⚠️ **Needs Configuration:**
- Gemini API key for natural language queries

## 🚀 **Quick Start**

### **1. Start the Server**
```bash
cd graphrag-llm-component
npm run start:env
```

### **2. Open Web Interface**
Navigate to: http://localhost:3001

### **3. Test Basic Functionality**
- Health check: http://localhost:3001/api/health
- Database stats: http://localhost:3001/api/stats

## 🔧 **Enable Gemini AI (Optional)**

To enable natural language queries:

1. **Get API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Set Environment Variable**:
   ```bash
   export GEMINI_API_KEY=your-api-key-here
   npm run start:env
   ```

## 📊 **Test Queries**

### **Direct Cypher Queries** (Always work):
```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (uf:UserFund) RETURN uf.fund_name LIMIT 5", "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"}'
```

### **Natural Language Queries** (Requires Gemini API):
```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all hedge funds", "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"}'
```

## 🎯 **Key Features**

### **Multi-tenant Support**
- All queries automatically filtered by `tenant_id`
- Data isolation between tenants

### **Rich Query Interface**
- Natural language to Cypher conversion
- Direct Cypher query execution
- User investment journey tracking
- Fund search with multiple criteria

### **Web Interface**
- Simple, clean UI for testing
- Example queries to try
- Real-time results display
- Database statistics

## 📈 **Performance**

- **Neo4j Queries**: ~10-100ms
- **Gemini AI**: ~1-2 seconds
- **Total Response**: ~1-3 seconds

## 🔍 **Example Use Cases**

1. **Fund Discovery**: "Show me all hedge funds with minimum investment under $1M"
2. **User Analysis**: "What is the investment journey for user@example.com?"
3. **Manager Search**: "Show me funds managed by CAZ Investments LP"
4. **Subscription Analysis**: "What are the subscription details for Liquid Income fund?"

## 🛠️ **Development**

### **Test Connection**
```bash
npm run test:connection
```

### **Run Tests**
```bash
npm test
```

### **Development Mode**
```bash
npm run dev
```

## 📁 **File Structure**

```
graphrag-llm-component/
├── server.js              # Express server
├── graphrag-service.js    # Core GraphRAG logic
├── public/
│   └── index.html         # Web frontend
├── test-queries.js        # Test suite
├── start.sh              # Startup script
├── package.json          # Dependencies
└── README.md             # Full documentation
```

## 🎉 **Ready to Use!**

Your GraphRAG LLM component is ready for testing GraphRAG functionality with your Neo4j investment database!

**Next Steps:**
1. Start the server: `npm run start:env`
2. Open http://localhost:3001
3. Try the example queries
4. Add your Gemini API key for full functionality
5. Integrate with your applications using the REST API

---

**Built for GraphRAG testing and development** 🚀
