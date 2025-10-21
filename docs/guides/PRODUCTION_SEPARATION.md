# Production vs Testing Environment Guide

This guide explains the clean separation between testing and production environments in your GraphRAG system.

## 📁 Current Project Structure

```
GraphRAG/
├── testing/                 # 🧪 Testing & Development
│   ├── database/           # Database connections (dev)
│   ├── migrations/        # Sample migrations
│   ├── scripts/           # Testing scripts
│   ├── types/             # Type definitions
│   └── utils/             # Utility functions
├── production/             # 🚨 Production Code
│   ├── database/          # Production database connections
│   ├── migrations/        # Production migrations
│   ├── scripts/           # Production scripts
│   ├── schema/            # Centralized schema management
│   ├── services/          # Business logic services
│   ├── data/              # Data access layer
│   └── types/             # Production types
├── docs/                   # 📚 Documentation
└── scripts/                # 🛠️ Utility Scripts
```

## 🎯 Environment Purposes

### 🧪 Testing Environment (`testing/` folder)
- **Purpose**: Safe development and learning
- **Data**: Sample/mock data only
- **Databases**: Local Neo4j with test data
- **Safety**: No real data, safe to experiment
- **Use Case**: Learning GraphRAG concepts, testing queries

### 🚨 Production Environment (`production/` folder)
- **Purpose**: Real data migration and business logic
- **Data**: Actual PostgreSQL database
- **Databases**: Production Neo4j with real data
- **Safety**: ⚠️ **REAL DATA** - Use with extreme caution
- **Use Case**: Production migrations, business operations

## 🚀 Using Each Environment

### 🧪 Testing Environment Usage
```bash
# From root directory
npm run demo:users          # Create sample users
npm run test:neo4j         # Test Neo4j connection
npm run visualize          # Visualize sample data
npm run queries:sample     # Run sample queries
npm run show:nodes         # Show all nodes
```

### 🚨 Production Environment Usage
```bash
# Navigate to production folder
cd production

# Setup production environment
cp env.example .env
# Edit .env with real database credentials

# Install production dependencies
npm install

# Test connections
npm run db:test-postgres    # Test PostgreSQL
npm run test:neo4j         # Test Neo4j
npm run db:list-tables     # List all tables

# Schema management
npm run schema:create      # Create complete schema
npm run schema:verify      # Verify schema integrity
npm run schema:info        # Show schema information

# Data migration
npm run migrate:users      # Migrate all users
npm run migrate:entities  # Migrate user entities
npm run migrate:users:limit=5    # Test with 5 users
npm run migrate:entities:limit=10 # Test with 10 entities

# Data cleaning
npx ts-node scripts/check-duplicates.ts
npx ts-node scripts/clean-duplicates.ts
npx ts-node scripts/clear-user-entities.ts
```

## 🛡️ Safety Features

### Production Safeguards
- ✅ **Separate Codebase**: Prevents accidental production runs
- ✅ **Centralized Schema**: Managed schema with constraints
- ✅ **Data Cleaning**: Duplicate detection and removal
- ✅ **Tenant Constraints**: Data integrity enforcement
- ✅ **Batch Processing**: Safe data migration
- ✅ **Comprehensive Error Handling**: Detailed error reporting
- ✅ **Migration Verification**: Post-migration validation
- ✅ **Business Logic Services**: Production-ready services

### Testing Safeguards
- ✅ **Sample Data Only**: No real data risk
- ✅ **Local Databases**: Isolated from production
- ✅ **Safe Experimentation**: Modify without consequences
- ✅ **Learning Environment**: Perfect for GraphRAG education

## 📊 Current Status

### ✅ Completed in Production
- **24 Users** migrated from PostgreSQL
- **25 Tenants** with proper relationships
- **81 User Entities** with tenant constraints
- **105 Relationships** created
- **Centralized Schema** with 5 constraints and 12 indexes
- **Data Cleaning** scripts for duplicate removal
- **Business Logic Services** for user operations

### 🧪 Testing Environment Ready
- **Sample Data** scripts for learning
- **Visualization** tools for exploration
- **Query Examples** for GraphRAG concepts
- **Safe Environment** for experimentation

## 🔧 Configuration Differences

### Testing Environment
```env
# Neo4j (Local)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# PostgreSQL (Optional)
POSTGRES_URL=postgresql://user:pass@localhost:5432/test_db
```

### Production Environment
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

## 📚 Documentation Structure

- **[Main README](../README.md)** - Project overview
- **[Testing README](../testing/README.md)** - Testing environment guide
- **[Production README](../production/README.md)** - Production environment guide
- **[Migration Guide](MIGRATION_GUIDE.md)** - Complete migration instructions
- **[Database Management](DATABASE_MANAGEMENT.md)** - Neo4j database management
- **[Schema Management](../production/schema/README.md)** - Centralized schema system

## 🎯 Next Steps

### Immediate Actions
1. **Use Testing Environment**: Learn GraphRAG concepts safely
2. **Configure Production**: Set up real database connections
3. **Test Migrations**: Start with limited data (`--limit=5`)
4. **Full Migration**: Migrate all data when ready

### Future Development
1. **Document Migration**: Migrate 1,150 documents
2. **NAV Migration**: Migrate 6,536 NAV records
3. **Transaction Migration**: Migrate 2,901 transactions
4. **Real-time Sync**: Set up PostgreSQL triggers
5. **Advanced Analytics**: Build portfolio analysis features

## ⚠️ Important Safety Notes

### Testing Environment
- ✅ **Safe to modify** - No real data risk
- ✅ **Experiment freely** - Learn GraphRAG concepts
- ✅ **Use for development** - Perfect for testing

### Production Environment
- 🚨 **REAL DATA ONLY** - Never use for testing
- 🚨 **Backup before changes** - Always backup data
- 🚨 **Test with limits first** - Use `--limit` flags
- 🚨 **Verify connections** - Test before migration
- 🚨 **Monitor resources** - Ensure sufficient memory/disk

---

**🎉 Your GraphRAG system now has clean separation between testing and production environments!**
