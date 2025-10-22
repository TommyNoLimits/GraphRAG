# User-Centric GraphRAG Approach

This folder contains the **user-centric approach** to the GraphRAG PostgreSQL to Neo4j migration.

## 🎯 **Approach Overview**

The user-centric approach structures the graph database around the user journey:

```
User → Entity → Fund → Subscription
```

### **Key Relationships:**
- **User CONTROLS Entity** - Users control investment entities
- **Entity INVESTS_IN Fund** - Entities invest in funds
- **Fund HAS_SUBSCRIPTION Subscription** - Funds have subscription details

## 🗂️ **Folder Structure**

```
user-centric-approach/
├── database/           # Database connection classes
├── migrations/         # Migration scripts
├── schema/            # Neo4j schema definitions
├── types/             # TypeScript type definitions
├── scripts/           # Utility scripts
├── docs/              # Documentation
├── examples/          # Example usage
└── package.json       # Dependencies and scripts
```

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd user-centric-approach
npm install
```

### **2. Set Up Environment**
Copy your `.env` file from the root directory or create one with:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DATABASE=your-database
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password
```

### **3. Start Neo4j**
```bash
npm run neo4j:start
```

### **4. Run Migration**
```bash
# Full migration
npm run migrate:user-centric

# Test with limit
npm run migrate:user-centric:limit 10
```

## 📊 **Database Schema**

### **Node Types:**
- **User** - Individual users
- **Tenant** - Organizations/tenants
- **UserEntity** - Investment entities (IRAs, LLCs, etc.)
- **UserFund** - Investment funds
- **Subscription** - Subscription details

### **Relationship Types:**
- **BELONGS_TO** - User/Entity/Fund/Subscription belongs to Tenant
- **CONTROLS** - User controls Entity
- **INVESTS_IN** - Entity invests in Fund
- **HAS_SUBSCRIPTION** - Fund has Subscription

## 🔍 **Key Queries**

### **User Journey Queries:**
```cypher
// Show complete user investment journey
MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)-[:HAS_SUBSCRIPTION]->(s:Subscription)
WHERE u.id = 'user123'
RETURN u.first_name, ue.investment_entity, uf.fund_name, s.commitment_amount

// Find all entities controlled by a user
MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)
WHERE u.id = 'user123'
RETURN ue.investment_entity, ue.entity_allias

// Find all funds an entity has invested in
MATCH (ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)
WHERE ue.id = 'entity456'
RETURN uf.fund_name, uf.stage, uf.investment_type
```

### **Analytics Queries:**
```cypher
// Total investments per user
MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)-[:HAS_SUBSCRIPTION]->(s:Subscription)
WITH u, sum(s.commitment_amount) as total_investment
RETURN u.first_name, u.last_name, total_investment
ORDER BY total_investment DESC

// Investment distribution by fund type
MATCH (ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)
WHERE uf.stage = 'Invested'
RETURN uf.fund_type, count(*) as entity_count
ORDER BY entity_count DESC
```

## 🎯 **Benefits of User-Centric Approach**

### **1. Natural User Experience**
- **User logs in** → sees their entities
- **Clicks entity** → sees invested funds
- **Clicks fund** → sees subscription details
- **Follows decision-making flow**

### **2. Better Query Performance**
- **User-centric queries** are fast and intuitive
- **Natural traversal patterns** from user to investments
- **Optimized for dashboard use cases**

### **3. Flexible Analytics**
- **Easy user-level reporting**
- **Entity-level analysis**
- **Investment pattern recognition**

## 🔄 **Comparison with Fund-Centric Approach**

| Aspect | User-Centric | Fund-Centric |
|--------|-------------|--------------|
| **Primary Use Case** | User dashboards | Fund management |
| **Query Pattern** | User → Entity → Fund | Fund → Entity → User |
| **Best For** | Investor experience | Fund reporting |
| **Complexity** | Medium | Medium |

## 🛠️ **Available Scripts**

```bash
# Migration
npm run migrate:user-centric              # Full migration
npm run migrate:user-centric:limit 10    # Test migration

# Database Management
npm run neo4j:start                       # Start Neo4j
npm run neo4j:stop                        # Stop Neo4j
npm run neo4j:reset                       # Reset database

# Data Management
npm run data:clean                        # Clean all data
npm run data:verify                       # Verify data integrity
npm run data:export                       # Export data
```

## 📈 **Migration Status**

- ✅ **Schema Definition** - Complete
- ✅ **Migration Script** - Complete
- ✅ **Database Connections** - Complete
- ✅ **Type Definitions** - Complete
- 🔄 **Testing** - In Progress

## 🎯 **Next Steps**

1. **Test Migration** - Run with small limits first
2. **Verify Data** - Check relationships and counts
3. **Performance Testing** - Test query performance
4. **Documentation** - Add more examples and guides

## 🤝 **Contributing**

This approach is designed to complement the fund-centric approach. Both can coexist and serve different use cases.

## 📞 **Support**

For questions about the user-centric approach, refer to the main GraphRAG documentation or create an issue in the repository.
