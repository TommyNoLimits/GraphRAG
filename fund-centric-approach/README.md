# GraphRAG Production Migration

This folder contains production-ready code for migrating PostgreSQL data to Neo4j for GraphRAG applications.

## 🚨 Production Use Only

This code is designed for production environments and will:
- Connect to your actual PostgreSQL database
- Create real data in Neo4j
- Perform actual data migrations

## 📁 Structure

```
production/
├── database/           # Database connection classes
│   ├── postgres-connection.ts
│   ├── neo4j-connection.ts
│   └── index.ts
├── migrations/         # Data migration scripts
│   ├── production-user-migration.ts
│   └── index.ts
├── scripts/           # Utility and setup scripts
│   ├── create-production-db.ts
│   ├── test-postgres.ts
│   └── list-tables.ts
├── types/             # TypeScript type definitions
│   ├── types.ts
│   ├── data-focused-types.ts
│   └── index.ts
├── package.json       # Production dependencies
├── tsconfig.json      # Production TypeScript config
└── env.example        # Environment template
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd production
cp env.example .env
# Edit .env with your production database credentials
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test Connections

```bash
# Test PostgreSQL connection
npm run db:test-postgres

# List all tables
npm run db:list-tables

# Create production Neo4j database
npm run db:create-production
```

### 4. Run Migrations

```bash
# Test with limited data first
npm run migrate:users:limit=5

# Full migration
npm run migrate:users
```

## 📋 Available Commands

### Database Management
- `npm run db:create-production` - Create production Neo4j database
- `npm run db:test-postgres` - Test PostgreSQL connection
- `npm run db:list-tables` - List all PostgreSQL tables

### Migrations
- `npm run migrate:users` - Migrate all users
- `npm run migrate:users:limit=N` - Migrate N users (for testing)

### Neo4j Management
- `npm run neo4j:start` - Start Neo4j with Docker
- `npm run neo4j:stop` - Stop Neo4j
- `npm run neo4j:logs` - View Neo4j logs

## 🔧 Configuration

### Environment Variables

Required in your `.env` file:

```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# PostgreSQL Configuration
POSTGRES_URL=postgresql://user:pass@host:port/db?sslmode=require
POSTGRES_HOST=your_host
POSTGRES_PORT=5432
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
```

### Migration Settings

- **Batch Size**: 100 records per batch (configurable)
- **Timeout**: 30 seconds per operation
- **Retry Attempts**: 3 attempts on failure
- **SSL**: Required for Azure PostgreSQL

## 🛡️ Safety Features

### Production Safeguards

1. **Database Validation**: Tests connections before migration
2. **Batch Processing**: Processes data in small batches
3. **Error Handling**: Comprehensive error handling and rollback
4. **Logging**: Detailed logging of all operations
5. **Verification**: Post-migration verification and reporting

### Data Integrity

- **MERGE Operations**: Prevents duplicate data
- **Transaction Safety**: Uses transactions for data consistency
- **Constraint Validation**: Enforces data constraints
- **Schema Validation**: Validates data before insertion

## 📊 Migration Process

### User Migration Flow

1. **Connect** to PostgreSQL and Neo4j
2. **Create Schema** in Neo4j (constraints, indexes)
3. **Fetch Users** from PostgreSQL in batches
4. **Transform Data** to Neo4j format
5. **Create Nodes** and relationships
6. **Verify** migration success
7. **Report** results and statistics

### Data Mapping

PostgreSQL → Neo4j:
- `users` table → `User` nodes
- `tenants` table → `Tenant` nodes
- `user.tenant_id` → `BELONGS_TO` relationships

## 🔍 Monitoring

### Logs

All operations are logged with:
- Timestamps
- Operation details
- Success/failure status
- Performance metrics
- Error details

### Verification

Post-migration verification includes:
- Node counts
- Relationship counts
- Data integrity checks
- Sample data display

## 🚨 Important Notes

### Before Running

1. **Backup your data** - Always backup before migration
2. **Test first** - Use `--limit` flag for testing
3. **Check credentials** - Verify database access
4. **Monitor resources** - Ensure sufficient disk/memory

### During Migration

1. **Don't interrupt** - Let migrations complete
2. **Monitor logs** - Watch for errors
3. **Check Neo4j** - Monitor Neo4j browser
4. **Verify data** - Check migration results

### After Migration

1. **Verify data** - Check node counts and relationships
2. **Test queries** - Run sample queries
3. **Monitor performance** - Check query performance
4. **Document results** - Record migration statistics

## 🆘 Troubleshooting

### Common Issues

1. **Connection Errors**: Check credentials and network
2. **SSL Errors**: Verify SSL configuration
3. **Timeout Errors**: Increase timeout settings
4. **Memory Errors**: Reduce batch size

### Getting Help

1. Check logs for detailed error messages
2. Verify environment configuration
3. Test individual components
4. Review migration statistics

## 📈 Performance

### Optimization

- **Batch Processing**: Configurable batch sizes
- **Connection Pooling**: Efficient database connections
- **Index Creation**: Automatic index creation
- **Parallel Processing**: Concurrent operations where safe

### Monitoring

- **Migration Speed**: Records per second
- **Memory Usage**: Peak memory consumption
- **Error Rates**: Success/failure ratios
- **Database Load**: Connection and query metrics

---

**⚠️ Remember**: This is production code. Always test thoroughly and backup your data before running migrations.
