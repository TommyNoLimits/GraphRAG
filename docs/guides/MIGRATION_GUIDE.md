# GraphRAG Migration Guide

This guide covers migrating PostgreSQL data to Neo4j for GraphRAG applications using the cleaned-up system.

## 🎯 Overview

The migration system is organized into two environments:
- **Testing**: Safe development with sample data
- **Production**: Real data migration with comprehensive schema management

## 📋 Prerequisites

1. **PostgreSQL Database**: Azure PostgreSQL with your data
2. **Neo4j Database**: Local Neo4j instance (Docker or local install)
3. **Environment Variables**: Configured `.env` file
4. **Node.js**: Version 16+ with npm

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Copy environment template
cp env.example .env

# Edit .env with your credentials
# PostgreSQL: Azure connection string
# Neo4j: Local instance credentials
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Production dependencies
cd production
npm install
```

### 3. Start Neo4j
```bash
# Using Docker (recommended)
docker-compose up -d

# Or using local Neo4j
# Follow Neo4j installation guide
```

## 🧪 Testing Environment

### Purpose
- Safe experimentation with sample data
- Learning GraphRAG concepts
- Testing queries and visualizations

### Commands
```bash
# Create sample users
npm run demo:users

# Visualize sample data
npm run visualize

# Test Neo4j connection
npm run test:neo4j

# Run sample queries
npm run queries:sample
```

### What Testing Creates
- **5 Sample Users** with mock data
- **Sample Tenants** for demonstration
- **Basic Relationships** for learning
- **Safe Environment** for experimentation

## 🚨 Production Environment

### Purpose
- Real data migration from PostgreSQL to Neo4j
- Production-ready schema management
- Business logic services
- Tenant-constrained data integrity

### Schema Management
```bash
cd production

# Create complete schema
npm run schema:create

# Verify schema integrity
npm run schema:verify

# Generate Cypher script
npm run schema:generate

# Show schema information
npm run schema:info
```

### Data Migration
```bash
# Migrate users and tenants
npm run migrate:users

# Migrate user entities
npm run migrate:entities

# Test with limited data
npm run migrate:users:limit=5
npm run migrate:entities:limit=10
```

### Data Cleaning
```bash
# Check for duplicates in PostgreSQL
npx ts-node scripts/check-duplicates.ts

# Clean duplicates from PostgreSQL
npx ts-node scripts/clean-duplicates.ts

# Clear Neo4j data (if needed)
npx ts-node scripts/clear-user-entities.ts
```

## 📊 Current Migration Status

### ✅ Completed Migrations
- **Users**: 24 users migrated
- **Tenants**: 25 tenants migrated  
- **User Entities**: 81 entities migrated
- **Relationships**: 105 relationships created
- **Schema**: Complete with constraints and indexes

### 🚧 Pending Migrations
- **Documents**: 1,150 documents
- **NAV Records**: 6,536 records
- **Transactions**: 2,901 records
- **Funds**: Fund entities and relationships

## 🔍 Schema Components

### Node Types
- **User**: User accounts with tenant relationships
- **Tenant**: Tenant organizations
- **UserEntity**: Investment entities (tenant-constrained)
- **Fund**: Fund entities
- **Document**: Document entities
- **NAV**: Net Asset Value records
- **Transaction**: Transaction records

### Constraints
- **Unique Constraints**: IDs, tenant-constrained entities
- **Existence Constraints**: Required properties
- **Composite Constraints**: Multi-property uniqueness

### Indexes
- **Performance Indexes**: Common query patterns
- **Text Indexes**: Full-text search capabilities
- **Composite Indexes**: Multi-property queries

## 🔧 Environment Configuration

### Testing Environment Variables
```env
# Neo4j (Local)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# PostgreSQL (Optional for testing)
POSTGRES_URL=postgresql://user:pass@localhost:5432/test_db
```

### Production Environment Variables
```env
# Neo4j (Production)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_production_password
NEO4J_DATABASE=neo4j

# PostgreSQL (Azure)
POSTGRES_URL=postgresql://appuser:password@host.postgres.database.azure.com:5432/database?sslmode=require
POSTGRES_HOST=host.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=database
POSTGRES_USER=appuser
POSTGRES_PASSWORD=password
```

## ✅ Verification

### Testing Environment Verification
```bash
# Check sample data
npm run show:nodes

# Visualize data
npm run visualize

# Test queries
npm run queries:sample
```

### Production Environment Verification
```bash
cd production

# Verify schema
npm run schema:verify

# Check data counts
npx ts-node scripts/check-neo4j-data.ts

# Test connections
npm run db:test-postgres
npm run test:neo4j
```

### Neo4j Browser Verification
1. **Open Neo4j Browser**: http://localhost:7474
2. **Login**: Username `neo4j`, Password `password`
3. **Run Verification Queries**:
   ```cypher
   # Count all nodes
   MATCH (n) RETURN labels(n)[0] as node_type, count(n) as count
   
   # Check tenant constraints
   MATCH (ue:UserEntity)
   WITH ue.tenant_id, ue.investment_entity, count(*) as count
   WHERE count > 1
   RETURN ue.tenant_id, ue.investment_entity, count
   
   # Verify relationships
   MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
   RETURN count(*) as user_tenant_relationships
   ```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Check `.env` file credentials
   - Verify database services are running
   - Test individual connections

2. **Schema Errors**:
   - Run `npm run schema:verify`
   - Clear and recreate schema if needed
   - Check constraint conflicts

3. **Migration Errors**:
   - Start with `--limit=5` for testing
   - Check PostgreSQL data integrity
   - Verify Neo4j has sufficient memory

4. **Duplicate Entity Errors**:
   - Run data cleaning scripts
   - Check tenant constraints
   - Verify PostgreSQL data

### Debug Commands
```bash
# Test connections
npm run test:neo4j
npm run test:postgres

# Check data integrity
npx ts-node scripts/check-duplicates.ts
npx ts-node scripts/check-neo4j-data.ts

# Clear and restart
npx ts-node scripts/clear-user-entities.ts
npm run schema:create
```

## 🎯 Next Steps

### Immediate Next Steps
1. **Document Migration**: Migrate 1,150 documents
2. **NAV Migration**: Migrate 6,536 NAV records
3. **Transaction Migration**: Migrate 2,901 transactions
4. **Fund Migration**: Create fund entities and relationships

### Advanced Features
1. **Real-time Sync**: Set up PostgreSQL triggers
2. **Advanced Analytics**: Build portfolio analysis
3. **Graph Algorithms**: Implement centrality measures
4. **Performance Optimization**: Add more indexes

## 📚 Additional Resources

- **[Database Management](DATABASE_MANAGEMENT.md)** - Managing Neo4j databases
- **[Neo4j Queries](NEO4J_QUERIES.md)** - Sample queries and examples
- **[Production Separation](PRODUCTION_SEPARATION.md)** - Environment management
- **[Schema Management](../production/schema/README.md)** - Centralized schema system

---

**🎉 Your GraphRAG migration system is ready for production use!**
