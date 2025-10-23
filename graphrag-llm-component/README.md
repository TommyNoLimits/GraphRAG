# GraphRAG LLM Component

A powerful GraphRAG (Graph Retrieval-Augmented Generation) component that uses Google's Gemini AI to convert natural language queries into Neo4j Cypher queries for intelligent database search.

## 🎯 **Features**

- **Natural Language to Cypher**: Convert human language queries to Neo4j Cypher using Gemini AI
- **Multi-tenant Support**: Automatic tenant isolation for data security
- **Rich Investment Data**: Full access to user funds, entities, subscriptions, and relationships
- **Simple Web Interface**: Easy-to-use frontend for testing queries
- **RESTful API**: Programmatic access to all functionality
- **Real-time Results**: Fast query execution with detailed results

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd graphrag-llm-component
npm install
```

### **2. Configure Environment**
```bash
cp env.example .env
# Edit .env with your configuration:
# - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
# - GEMINI_API_KEY (get from Google AI Studio)
# - PORT (optional, defaults to 3001)
```

### **3. Start the Server**
```bash
npm start
# or for development:
npm run dev
```

### **4. Open the Web Interface**
Navigate to: http://localhost:3001

## 🔧 **Configuration**

### **Environment Variables**
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
PORT=3001
```

### **Getting Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 📊 **Database Schema**

The component works with the following Neo4j schema:

### **Nodes**
- **User**: `{id, tenant_id, email, first_name, last_name, username, ...}`
- **Tenant**: `{id, name, created_at, updated_at}`
- **UserEntity**: `{id, tenant_id, investment_entity, entity_allias, ...}`
- **UserFund**: `{id, tenant_id, fund_name, investment_manager_name, general_partner, investment_type, fund_type, stage, investment_minimum, management_fee, carry_fee, geography, gics_sector, liquidity, investment_summary, ...}`
- **Subscription**: `{id, tenant_id, fund_name, investment_entity, as_of_date, commitment_amount, ...}`

### **Relationships**
- `User -[:BELONGS_TO]-> Tenant`
- `Tenant -[:MANAGES]-> UserEntity`
- `UserEntity -[:INVESTED_IN]-> UserFund`
- `UserFund -[:HAS_SUBSCRIPTION]-> Subscription`
- `UserEntity -[:HAS_SUBSCRIPTION]-> Subscription`
- `Tenant -[:INTEREST]-> UserFund`

## 🔍 **API Endpoints**

### **POST /api/query**
Process natural language queries using Gemini AI.

**Request:**
```json
{
  "query": "Show me all hedge funds with investment minimum under $1M",
  "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"
}
```

**Response:**
```json
{
  "success": true,
  "query": "MATCH (uf:UserFund) WHERE uf.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f' AND uf.fund_type = 'Hedge Fund' AND uf.investment_minimum < 1000000 RETURN uf",
  "results": [...],
  "summary": {
    "recordsReturned": 5,
    "queryTime": 15
  }
}
```

### **GET /api/user/:email/journey**
Get complete investment journey for a user.

**Request:**
```
GET /api/user/tommymmcguire@gmail.com/journey?tenantId=fd68d10f-0780-4140-b393-3adf8109df4f
```

### **POST /api/funds/search**
Search funds with specific criteria.

**Request:**
```json
{
  "searchCriteria": {
    "fundType": "Hedge Fund",
    "stage": "Recently Added",
    "minInvestment": 500000
  },
  "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"
}
```

### **GET /api/health**
Health check endpoint.

### **GET /api/stats**
Get database statistics.

## 💡 **Example Queries**

### **Fund Queries**
- "Show me all funds in the Recently Added stage"
- "What funds have investment minimum under $500,000?"
- "Show me all hedge funds with monthly liquidity"
- "Show me funds managed by CAZ Investments LP"

### **User Queries**
- "What is the investment journey for tommymmcguire@gmail.com?"
- "Show me all users in tenant fd68d10f-0780-4140-b393-3adf8109df4f"

### **Subscription Queries**
- "What are the subscription details for Liquid Income fund?"
- "Show me all subscriptions with commitment amount over $10,000"

### **Complex Queries**
- "Show me funds where the investment manager is CAZ Investments LP and the fund type is Hedge Fund"
- "What entities are invested in funds with management fee over 2%?"

## 🧪 **Testing**

### **Run Test Suite**
```bash
npm test
```

### **Manual Testing**
1. Start the server: `npm start`
2. Open http://localhost:3001
3. Try the example queries in the web interface

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │───▶│  Express Server │───▶│  GraphRAG       │
│   (HTML/JS)     │    │  (REST API)     │    │  Service        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Static Files  │    │  Gemini AI      │
                       │   (Public)      │    │  (Cypher Gen)   │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Neo4j         │
                                               │   Database      │
                                               └─────────────────┘
```

## 🔒 **Security Features**

- **Tenant Isolation**: All queries automatically filtered by tenant_id
- **Input Validation**: Sanitized inputs prevent injection attacks
- **Error Handling**: Graceful error handling prevents information leakage
- **API Key Protection**: Gemini API key stored securely in environment variables

## 🚀 **Deployment**

### **Production Setup**
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy with Nginx
4. Configure SSL certificates
5. Set up monitoring and logging

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📈 **Performance**

- **Query Generation**: ~1-2 seconds (Gemini API)
- **Neo4j Execution**: ~10-100ms (depending on query complexity)
- **Total Response Time**: ~1-3 seconds end-to-end

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.

## 🆘 **Support**

For issues and questions:
1. Check the test suite: `npm test`
2. Verify your environment configuration
3. Check Neo4j connectivity
4. Verify Gemini API key
5. Create an issue in the repository

---

**Built with ❤️ for GraphRAG applications**
