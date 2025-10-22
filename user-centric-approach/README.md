# User-Centric GraphRAG Approach

This folder contains the **user-centric approach** to the GraphRAG PostgreSQL to Neo4j migration with proper **tenant-centric relationships**.

## 🎯 **Approach Overview**

The user-centric approach structures the graph database around the **tenant-centric model** where every node belongs to a tenant:

```
User → Tenant → Entity → Fund → Subscription
```

### **Key Relationships:**
- **User BELONGS_TO Tenant** - Users belong to tenants
- **Tenant MANAGES Entity** - Tenants manage investment entities
- **Entity INVESTED_IN Fund** - Entities invest in funds (based on subscription data)
- **Fund HAS_SUBSCRIPTION Subscription** - Funds have subscription details
- **Entity HAS_SUBSCRIPTION Subscription** - Entities have subscription details
- **Tenant INTEREST Fund** - Tenants have interest in funds without subscriptions

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

## 🚀 **Complete Setup Guide**

### **Prerequisites**
- Node.js 18+ installed
- Docker installed (for Neo4j)
- PostgreSQL database with your data
- Access to your PostgreSQL credentials

### **1. Install Dependencies**
```bash
cd user-centric-approach
npm install
```

### **2. Set Up Environment Variables**
Create a `.env` file in the `user-centric-approach` directory:
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# PostgreSQL Configuration
POSTGRES_HOST=your-postgres-host.com
POSTGRES_PORT=5432
POSTGRES_DATABASE=your-database-name
POSTGRES_USER=your-username
POSTGRES_PASSWORD=your-password
```

### **3. Start Neo4j Database**
```bash
# Start Neo4j container
npm run neo4j:start

# Check if Neo4j is running
docker ps | grep neo4j
```

**Neo4j Browser Access:**
- URL: http://localhost:7474
- Username: `neo4j`
- Password: `password123`

### **4. Test Database Connections**
```bash
# Test PostgreSQL connection
npm run db:list-tables

# Test Neo4j connection
npm run test:neo4j
```

### **5. Run Migration**

#### **Option A: Full Migration (Recommended)**
```bash
# Complete migration with all data
ts-node migrations/user-centric-migration.ts
```

#### **Option B: Test Migration First**
```bash
# Test with limited data
ts-node migrations/user-centric-migration.ts --limit=50

# Test with even smaller dataset
ts-node migrations/user-centric-migration.ts --limit=10
```

#### **Option C: Skip Schema Creation (if already exists)**
```bash
ts-node migrations/user-centric-migration.ts --skip-schema
```

### **6. Verify Migration Results**
```bash
# Verify data integrity
ts-node scripts/verify-graph.ts

# View connected data
ts-node scripts/view-connected-data.ts
```

### **7. Access Your Graph**
Open Neo4j Browser at http://localhost:7474 and run queries like:
```cypher
MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50
```

## 📊 **Database Schema**

### **Node Types:**
- **User** - Individual users with login credentials
- **Tenant** - Organizations/tenants that own resources
- **UserEntity** - Investment entities (IRAs, LLCs, Trusts, etc.)
- **UserFund** - Investment funds and opportunities
- **Subscription** - Subscription details and commitments

### **Relationship Types:**
- **BELONGS_TO** - User belongs to Tenant
- **MANAGES** - Tenant manages Entity
- **INVESTED_IN** - Entity invests in Fund (based on subscription data)
- **HAS_SUBSCRIPTION** - Fund/Entity has Subscription details
- **INTEREST** - Tenant has interest in Fund (investment opportunities)

### **Tenant-Centric Model:**
Every node in the graph belongs to a tenant, ensuring proper data isolation and multi-tenancy support.

## 🔍 **Key Queries**

### **Complete User Journey:**
```cypher
// Show complete user investment journey
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)-[:HAS_SUBSCRIPTION]->(s:Subscription)
WHERE u.email = 'user@example.com'
RETURN u.first_name, ue.investment_entity, uf.fund_name, s.commitment_amount

// Find all entities managed by a tenant
MATCH (t:Tenant)-[:MANAGES]->(ue:UserEntity)
WHERE t.id = 'tenant-id'
RETURN ue.investment_entity, ue.entity_allias

// Find all funds an entity has invested in
MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
WHERE ue.id = 'entity-id'
RETURN uf.fund_name, uf.stage, uf.investment_type
```

### **Investment Opportunities:**
```cypher
// Find funds a tenant is interested in (not invested)
MATCH (t:Tenant)-[:INTEREST]->(uf:UserFund)
WHERE t.id = 'tenant-id'
RETURN uf.fund_name, uf.stage, uf.investment_type

// Compare invested vs interested funds
MATCH (t:Tenant)
OPTIONAL MATCH (t)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf_invested:UserFund)
OPTIONAL MATCH (t)-[:INTEREST]->(uf_interest:UserFund)
RETURN t.id, count(uf_invested) as invested_count, count(uf_interest) as interested_count
```

### **Analytics Queries:**
```cypher
// Total investments per user
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)-[:HAS_SUBSCRIPTION]->(s:Subscription)
WITH u, sum(toFloat(s.commitment_amount)) as total_investment
RETURN u.first_name, u.last_name, total_investment
ORDER BY total_investment DESC

// Investment distribution by fund type
MATCH (ue:UserEntity)-[:INVESTED_IN]->(uf:UserFund)
RETURN uf.fund_type, count(*) as entity_count
ORDER BY entity_count DESC

// Tenant investment pipeline
MATCH (t:Tenant)
OPTIONAL MATCH (t)-[:MANAGES]->(ue:UserEntity)-[:INVESTED_IN]->(uf_invested:UserFund)
OPTIONAL MATCH (t)-[:INTEREST]->(uf_interest:UserFund)
RETURN t.id, count(uf_invested) as invested, count(uf_interest) as opportunities
ORDER BY invested DESC
```

## 🎯 **Benefits of Tenant-Centric Approach**

### **1. Multi-Tenant Architecture**
- **Complete data isolation** between tenants
- **Scalable** for multiple organizations
- **Secure** tenant-specific access control

### **2. Natural User Experience**
- **User logs in** → sees their tenant's entities
- **Clicks entity** → sees invested funds
- **Clicks fund** → sees subscription details
- **Follows decision-making flow**

### **3. Investment Pipeline Management**
- **Invested funds** - Actual investments with subscriptions
- **Interest funds** - Investment opportunities without subscriptions
- **Clear separation** between current and potential investments

### **4. Better Query Performance**
- **Tenant-centric queries** are fast and intuitive
- **Natural traversal patterns** from user to investments
- **Optimized for dashboard use cases**

## 🛠️ **Available Scripts**

### **Migration Scripts:**
```bash
# Full migration (recommended)
ts-node migrations/user-centric-migration.ts

# Test migration with limit
ts-node migrations/user-centric-migration.ts --limit=50

# Skip schema creation
ts-node migrations/user-centric-migration.ts --skip-schema
```

### **Database Management:**
```bash
npm run neo4j:start          # Start Neo4j container
npm run neo4j:stop           # Stop Neo4j container
npm run neo4j:reset          # Reset database (clear all data)
npm run neo4j:logs           # View Neo4j logs
```

### **Data Management:**
```bash
npm run data:clean           # Clear all Neo4j data
npm run data:verify          # Verify data integrity
npm run data:export          # Export data to files
npm run data:fix-duplicates  # Fix duplicate relationships
```

### **Utility Scripts:**
```bash
ts-node scripts/verify-graph.ts                    # Quick graph verification
ts-node scripts/view-connected-data.ts             # View connected data
ts-node scripts/fix-tenant-relationships.ts        # Fix relationship issues
ts-node scripts/fix-duplicate-relationships.ts     # Fix duplicate relationships
ts-node scripts/analyze-orphaned-funds.ts          # Analyze funds without subscriptions
ts-node scripts/create-interest-relationships.ts   # Create INTEREST relationships
```

### **Database Testing:**
```bash
npm run db:create            # Create PostgreSQL database
npm run test:neo4j           # Test Neo4j connection
npm run test:postgres        # Test PostgreSQL connection
```

## 📈 **Migration Status**

- ✅ **Schema Definition** - Complete
- ✅ **Migration Script** - Complete & Tested
- ✅ **Database Connections** - Complete
- ✅ **Type Definitions** - Complete
- ✅ **Tenant-Centric Relationships** - Complete
- ✅ **Testing** - Complete

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **1. Neo4j Connection Issues**
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Restart Neo4j if needed
npm run neo4j:stop
npm run neo4j:start

# Check Neo4j logs
npm run neo4j:logs
```

#### **2. PostgreSQL Connection Issues**
```bash
# Test PostgreSQL connection
npm run test:postgres

# Verify environment variables
cat .env | grep POSTGRES
```

#### **3. Migration Errors**
```bash
# Clear data and retry
npm run data:clean
ts-node migrations/user-centric-migration.ts --limit=10

# Check for schema issues
ts-node migrations/user-centric-migration.ts --skip-schema
```

#### **4. Relationship Issues**
```bash
# Fix tenant relationships
ts-node scripts/fix-tenant-relationships.ts

# Fix duplicate relationships
npm run data:fix-duplicates

# Create interest relationships
ts-node scripts/create-interest-relationships.ts

# Verify graph structure
ts-node scripts/verify-graph.ts
```

#### **5. Duplicate Relationships**
```bash
# Check for duplicates
ts-node scripts/verify-graph.ts

# Fix duplicates automatically
npm run data:fix-duplicates

# Verify fix worked
ts-node scripts/verify-graph.ts
```

### **Performance Tips:**
- Start with `--limit=50` for testing
- Use `--skip-schema` for subsequent runs
- Monitor Neo4j memory usage during large migrations

## 🎯 **Next Steps**

1. **✅ Setup Complete** - Ready for production use
2. **Custom Queries** - Build application-specific queries
3. **Performance Optimization** - Add indexes for your use cases
4. **Integration** - Connect to your application

## 🤝 **Contributing**

This tenant-centric approach provides a solid foundation for multi-tenant GraphRAG applications. The relationship structure ensures proper data isolation and scalability.

## 📞 **Support**

For questions about the user-centric approach:
- Check the troubleshooting section above
- Review the example queries
- Test with small datasets first
- Create an issue in the repository for bugs
