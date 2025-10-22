# GraphRAG - PostgreSQL to Neo4j Migration

A production-ready system for migrating PostgreSQL data to Neo4j for GraphRAG applications with clean separation between testing and production environments.

## 🎯 Overview

This project provides a clean, organized system for:
- Migrating PostgreSQL data to Neo4j with tenant constraints
- Creating user nodes, entities, and relationships
- Centralized schema management
- Visualizing graph data
- Managing production vs testing environments
- Real-time data synchronization

## 📁 Project Structure

```
GraphRAG/
├── testing/                 # 🧪 Testing & Development
│   ├── database/           # Database connections (dev)
│   ├── migrations/        # Sample migrations
│   ├── scripts/           # Testing scripts
│   ├── types/             # TypeScript types
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
│   └── guides/            # Setup and usage guides
├── scripts/                # 🛠️ Utility Scripts
│   └── visualization/     # Data visualization
├── config/                 # ⚙️ Configuration
│   ├── docker-compose.yml # Neo4j Docker setup
│   ├── env.example        # Environment template
│   ├── jest.config.js     # Testing config
│   └── .eslintrc.js       # Linting config
├── reference/              # 📋 Reference Data
│   └── schema.sql         # PostgreSQL schema
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Setup Environment
```bash
cp config/env.example .env
# Edit .env with your database credentials
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Neo4j
```bash
docker-compose -f config/docker-compose.yml up -d
```

### 4. Test Connections
```bash
npm run test:neo4j
```

### 5. Run Migration (Testing)
```bash
npm run migrate:users:limit=5
```

### 6. Visualize Data
```bash
npm run visualize
# Or open scripts/visualization/graphrag-visualization.html
```

## 📋 Available Commands

### Testing Commands
```bash
npm run test:neo4j          # Test Neo4j connection
npm run demo:users          # Create sample users
npm run visualize           # Show data visualization
npm run show:nodes          # Display all nodes
npm run queries:sample      # Run sample queries
```

### Migration Commands
```bash
npm run migrate:users       # Migrate all users
npm run migrate:users:limit 5 # Test with 5 users
```

### Production Commands
```bash
cd production
npm install
npm run migrate:users       # Migrate real users
npm run migrate:entities    # Migrate user entities
npm run schema:create       # Create complete schema
npm run schema:verify       # Verify schema integrity
npm run db:test-postgres    # Test PostgreSQL
npm run db:list-tables      # List all tables
```

## 🎨 Visualization

### Neo4j Browser
- **URL**: http://localhost:7474
- **Username**: `neo4j`
- **Password**: `password`

### Web Visualization
- **File**: `scripts/visualization/graphrag-visualization.html`
- **Features**: Interactive cards, statistics, tenant breakdown

### Command Line
```bash
npm run visualize           # Structured data overview
npm run show:nodes          # Complete node listing
```

## 📚 Documentation

- **[Migration Guide](docs/guides/MIGRATION_GUIDE.md)** - Complete migration setup
- **[Database Management](docs/guides/DATABASE_MANAGEMENT.md)** - Managing multiple databases
- **[Neo4j Queries](docs/guides/NEO4J_QUERIES.md)** - Sample queries and examples
- **[Production Setup](docs/guides/PRODUCTION_SEPARATION.md)** - Production vs testing

## 🔧 Configuration

### Environment Variables
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# PostgreSQL Configuration
POSTGRES_URL=postgresql://user:pass@host:port/db?sslmode=require
POSTGRES_HOST=your_host
POSTGRES_PORT=5432
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
```

## 🛡️ Safety Features

### Testing Environment
- ✅ Sample data only
- ✅ Local Neo4j instance
- ✅ Safe to experiment
- ✅ No production data risk

### Production Environment
- ✅ Real data migration
- ✅ Comprehensive error handling
- ✅ Batch processing
- ✅ Migration verification
- ✅ Rollback capabilities

## 🎯 Current Status

**✅ Completed**:
- User node migration (24 users, 25 tenants)
- User entity migration (81 entities with tenant constraints)
- Centralized schema management system
- Data visualization and querying
- Production/testing environment separation
- Comprehensive documentation
- Data cleaning and duplicate removal
- Tenant-constrained data integrity

**🚧 Next Steps**:
- Document migration (1,150 documents)
- NAV migration (6,536 records)
- Transaction migration (2,901 records)
- Real-time synchronization setup
- Advanced GraphRAG queries
- Portfolio analysis features

## 🤝 Contributing

1. Use `testing/` folder for development
2. Test with limited data first
3. Update documentation
4. Follow the established folder structure

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 Your GraphRAG system is ready for production use!**