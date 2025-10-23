# 🚀 GraphRAG Service - Running Guide

## 📋 **Available Services**

You now have **TWO** GraphRAG services to choose from:

| Service | Port | Features | Best For |
|---------|------|----------|----------|
| **Original** | 3001 | Static schema, simple | Small schemas (< 20 node types) |
| **Scalable** | 3002 | Dynamic schema, cached | Large schemas (unlimited growth) |

## 🎯 **How to Run Each Service**

### **1. Original GraphRAG Service (Port 3001)**

#### **Method A: Using Start Script (Recommended)**
```bash
cd graphrag-llm-component
./start.sh
```

#### **Method B: Using npm**
```bash
cd graphrag-llm-component
npm start
```

#### **Method C: Direct Node**
```bash
cd graphrag-llm-component
NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=password123 PORT=3001 node server.js
```

#### **Method D: Development Mode**
```bash
cd graphrag-llm-component
npm run dev
```

### **2. Scalable GraphRAG Service (Port 3002)**

#### **Method A: Using Start Script (Recommended)**
```bash
cd graphrag-llm-component
./start-scalable.sh
```

#### **Method B: Using npm**
```bash
cd graphrag-llm-component
npm run start:scalable
```

#### **Method C: Development Mode**
```bash
cd graphrag-llm-component
npm run dev:scalable
```

## 🔧 **Testing Connections**

### **Test Original Service**
```bash
npm run test:connection
```

### **Test Scalable Service**
```bash
npm run test:scalable
```

## 🌐 **Access Points**

### **Original Service (Port 3001)**
- **Web Interface**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health
- **API Stats**: http://localhost:3001/api/stats
- **API Query**: POST http://localhost:3001/api/query

### **Scalable Service (Port 3002)**
- **Web Interface**: http://localhost:3002
- **API Health**: http://localhost:3002/api/health
- **API Stats**: http://localhost:3002/api/stats
- **API Query**: POST http://localhost:3002/api/query
- **Schema Stats**: http://localhost:3002/api/schema-stats

## 🧪 **Quick Test Commands**

### **Test Original Service**
```bash
# Start service
./start.sh &

# Test API
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (uf:UserFund) RETURN uf.fund_name LIMIT 3", "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"}'

# Stop service
pkill -f "node server.js"
```

### **Test Scalable Service**
```bash
# Start service
./start-scalable.sh &

# Test API
curl -X POST http://localhost:3002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (uf:UserFund) RETURN uf.fund_name LIMIT 3", "tenantId": "fd68d10f-0780-4140-b393-3adf8109df4f"}'

# Test schema stats
curl http://localhost:3002/api/schema-stats

# Stop service
pkill -f "node scalable-server.js"
```

## 🔄 **Running Both Services Simultaneously**

You can run both services at the same time on different ports:

```bash
# Terminal 1: Original Service
cd graphrag-llm-component
./start.sh

# Terminal 2: Scalable Service  
cd graphrag-llm-component
./start-scalable.sh
```

**Access:**
- Original: http://localhost:3001
- Scalable: http://localhost:3002

## 🎯 **Which Service Should You Use?**

### **Use Original Service When:**
- ✅ Small database schema (< 20 node types)
- ✅ Simple queries
- ✅ Testing basic functionality
- ✅ Learning GraphRAG concepts

### **Use Scalable Service When:**
- ✅ Large database schema (20+ node types)
- ✅ Production deployment
- ✅ Need automatic schema discovery
- ✅ Want better performance and caching
- ✅ Planning for future growth

## 🚀 **Recommended Workflow**

### **For Development/Testing:**
```bash
# Start with original service
./start.sh
# Test at http://localhost:3001
```

### **For Production:**
```bash
# Use scalable service
./start-scalable.sh
# Deploy at http://localhost:3002
```

## 🔧 **Environment Variables**

Both services use the same environment variables:

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password123
export GEMINI_API_KEY=your-api-key-here  # Optional
export PORT=3001  # Original service
export PORT=3002  # Scalable service
```

## 📊 **Service Comparison**

| Feature | Original | Scalable |
|---------|----------|----------|
| **Schema Discovery** | Static | Dynamic |
| **Schema Caching** | None | 5-minute TTL |
| **Token Usage** | High | 90% reduction |
| **Performance** | Slower | Faster |
| **Maintenance** | Manual | Automatic |
| **Scalability** | Limited | Unlimited |

## 🎉 **Ready to Run!**

Choose your service and start exploring your GraphRAG database:

**Quick Start:**
```bash
cd graphrag-llm-component
./start-scalable.sh  # Recommended for production
# Open http://localhost:3002
```

**Happy GraphRAG-ing!** 🚀
