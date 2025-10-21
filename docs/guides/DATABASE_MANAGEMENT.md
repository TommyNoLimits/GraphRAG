# Neo4j Database Management Guide

This guide covers managing your Neo4j databases in the cleaned-up GraphRAG system.

## 📊 Current Database Setup

You have **one main database** with comprehensive data:

1. **🏭 Production Database (`neo4j`)** - Contains real migrated data
   - **24 Users** from PostgreSQL
   - **25 Tenants** with proper relationships
   - **81 User Entities** with tenant constraints
   - **Centralized Schema** with constraints and indexes

## 🔍 Database Status

| Component | Count | Status |
|-----------|-------|--------|
| **Users** | 24 | ✅ Migrated |
| **Tenants** | 25 | ✅ Migrated |
| **User Entities** | 81 | ✅ Migrated |
| **Relationships** | 105 | ✅ Active |
| **Constraints** | 5 | ✅ Applied |
| **Indexes** | 12 | ✅ Created |

## 🚀 Schema Management

### Centralized Schema System
```bash
cd production
npm run schema:info          # Show schema information
npm run schema:create        # Create complete schema
npm run schema:verify        # Verify schema integrity
npm run schema:generate      # Generate Cypher file
```

### Schema Components
- **Constraints**: Unique constraints for IDs and tenant-constrained entities
- **Indexes**: Performance indexes for common queries
- **Node Types**: User, Tenant, UserEntity, Fund, Document, NAV, Transaction
- **Relationships**: Tenant-based relationships with proper constraints

## 🔍 Data Querying

### Basic Queries
```cypher
# Count all nodes by type
MATCH (n) RETURN labels(n)[0] as node_type, count(n) as count

# Find users by tenant
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
WHERE t.id = 'tenant-id-here'
RETURN u.first_name, u.last_name, u.email

# Find entities for a tenant
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
WHERE t.id = 'tenant-id-here'
RETURN ue.investment_entity, ue.entity_allias
```

### Tenant-Constrained Queries
```cypher
# Find duplicate entities within tenants (should return empty)
MATCH (ue:UserEntity)
WITH ue.tenant_id as tenant, ue.investment_entity as entity, count(*) as count
WHERE count > 1
RETURN tenant, entity, count

# Cross-tenant entity analysis
MATCH (ue:UserEntity)
WHERE ue.investment_entity = "Robinhood"
RETURN ue.tenant_id, count(ue) as entity_count
```

## 🛠️ Data Management Commands

### Migration Commands
```bash
cd production

# Migrate users and tenants
npm run migrate:users

# Migrate user entities
npm run migrate:entities

# Test with limited data
npm run migrate:users:limit=5
npm run migrate:entities:limit=10
```

### Data Cleaning Commands
```bash
# Check for duplicates in PostgreSQL
npx ts-node scripts/check-duplicates.ts

# Clean duplicates from PostgreSQL
npx ts-node scripts/clean-duplicates.ts

# Clear Neo4j data
npx ts-node scripts/clear-user-entities.ts
```

## 🔧 Troubleshooting

### Common Issues
1. **Schema Verification Fails**: Run `npm run schema:verify` to check constraints
2. **Duplicate Entity Errors**: Use data cleaning scripts to remove duplicates
3. **Connection Issues**: Check `.env` file and database credentials
4. **Memory Issues**: Reduce batch size in migration scripts

### Verification Queries
```cypher
# Verify tenant constraints
MATCH (ue:UserEntity)
WITH ue.tenant_id, ue.investment_entity, count(*) as count
WHERE count > 1
RETURN ue.tenant_id, ue.investment_entity, count

# Check relationship integrity
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN count(ue) as entities_with_tenants

# Verify all entities have tenants
MATCH (ue:UserEntity)
WHERE NOT (ue)-[:BELONGS_TO_TENANT]->()
RETURN count(ue) as orphaned_entities
```

## 🎯 Next Steps

1. **Document Migration**: Migrate 1,150 documents from PostgreSQL
2. **NAV Migration**: Migrate 6,536 NAV records
3. **Transaction Migration**: Migrate 2,901 transaction records
4. **Real-time Sync**: Set up PostgreSQL triggers for live updates
5. **Advanced Analytics**: Build portfolio analysis queries

## 💡 Best Practices

1. **Always Verify**: Use `npm run schema:verify` after changes
2. **Test First**: Use `--limit` flags for testing migrations
3. **Clean Data**: Remove duplicates before migration
4. **Monitor Performance**: Check Neo4j Browser for query performance
5. **Backup Regularly**: Export data before major changes

Your Neo4j database is now clean, organized, and ready for advanced GraphRAG operations!
