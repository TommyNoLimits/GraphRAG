# User Funds Migration Guide

This guide covers migrating the `user_funds` table from PostgreSQL to Neo4j with tenant-constrained relationships.

## 🎯 Overview

The `user_funds` migration creates:
- **UserFund nodes** with comprehensive fund information
- **Tenant relationships** using `BELONGS_TO_TENANT`
- **Tenant-constrained uniqueness** for fund names
- **Performance indexes** for common queries

## 📊 UserFund Node Structure

Each UserFund node contains **80+ properties** including:

### Core Properties
- `id`: Unique fund identifier
- `tenant_id`: Tenant identifier
- `fund_name`: Fund name (tenant-constrained unique)
- `fund_name_allias`: Fund alias

### Investment Details
- `investment_type`: Type of investment
- `fund_type`: Fund category
- `investment_manager_name`: Manager name
- `general_partner`: GP information
- `investment_summary`: Fund description

### Financial Terms
- `management_fee`: Management fee percentage
- `carry_fee`: Carry fee percentage
- `preferred_return`: Preferred return rate
- `investment_minimum`: Minimum investment amount

### Operational Details
- `inception_year`: Fund inception year
- `lockup_period_duration`: Lockup period
- `withdrawal_terms`: Withdrawal conditions
- `stage`: Current fund stage

## 🔧 Migration Commands

### 1. Check UserFunds Data First
```bash
cd production
npm run check:user-funds
```

### 2. Test Migration with Limited Data
```bash
npm run migrate:user-funds:limit=10
```

### 3. Full Migration
```bash
npm run migrate:user-funds
```

### 4. Schema Management
```bash
# Create complete schema (includes UserFund)
npm run schema:create

# Verify schema
npm run schema:verify

# Show schema info
npm run schema:info
```

## 🏗️ Schema Constraints

### Unique Constraints
- **`user_fund_id_unique`**: Each fund has unique ID
- **`user_fund_tenant_fund_unique`**: Same fund name can exist across tenants, but not within same tenant

### Performance Indexes
- **`user_fund_tenant_id`**: Fast tenant-based queries
- **`user_fund_name`**: Fast fund name searches
- **`user_fund_investment_type`**: Investment type filtering
- **`user_fund_fund_type`**: Fund type filtering

## 🔍 Verification Queries

### Check Migration Results
```cypher
// Count all UserFund nodes
MATCH (uf:UserFund)
RETURN count(uf) as total_funds

// Check tenant relationships
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN count(*) as fund_tenant_relationships

// Verify tenant constraints (should return empty)
MATCH (uf:UserFund)
WITH uf.tenant_id as tenant, uf.fund_name as fund_name, count(*) as count
WHERE count > 1
RETURN tenant, fund_name, count
```

### Sample Fund Data
```cypher
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN uf.fund_name, uf.investment_type, uf.fund_type, 
       uf.investment_manager_name, t.id as tenant_id
ORDER BY uf.created_at DESC
LIMIT 10
```

## 🎨 Visualization Queries

### Fund-Tenant Network
```cypher
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN uf, t
LIMIT 25
```

### Funds by Investment Type
```cypher
MATCH (uf:UserFund)
WHERE uf.investment_type IS NOT NULL
RETURN uf.investment_type, collect(uf.fund_name)[0..5] as sample_funds, count(uf) as fund_count
ORDER BY fund_count DESC
```

### Complete Network (Funds + Entities + Users)
```cypher
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)<-[:BELONGS_TO_TENANT]-(ue:UserEntity)
MATCH (u:User)-[:BELONGS_TO]->(t)
RETURN uf, t, ue, u
LIMIT 15
```

## 📈 Analytics Queries

### Fund Distribution by Tenant
```cypher
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN t.id as tenant_id, count(uf) as fund_count
ORDER BY fund_count DESC
```

### Investment Type Analysis
```cypher
MATCH (uf:UserFund)
WHERE uf.investment_type IS NOT NULL
RETURN uf.investment_type, count(*) as count
ORDER BY count DESC
```

### Fund Manager Analysis
```cypher
MATCH (uf:UserFund)
WHERE uf.investment_manager_name IS NOT NULL
RETURN uf.investment_manager_name, count(*) as fund_count
ORDER BY fund_count DESC
LIMIT 10
```

## 🔗 Relationship to Entities

**Important**: Currently, UserFund nodes are only connected to Tenants. To connect funds to specific entities (as requested), you would need to:

1. **Add Entity Relationships**: Create relationships between UserFund and UserEntity
2. **Update Migration**: Modify the migration to include entity connections
3. **Add Constraints**: Ensure fund-entity relationships are tenant-constrained

### Example Entity-Fund Relationship Query (Future)
```cypher
MATCH (uf:UserFund)-[:BELONGS_TO_TENANT]->(t:Tenant)<-[:BELONGS_TO_TENANT]-(ue:UserEntity)
MATCH (uf)-[:MANAGED_BY_ENTITY]->(ue)
RETURN uf.fund_name, ue.investment_entity, t.id as tenant_id
```

## 🚨 Important Notes

### Tenant Constraints
- **Same fund name** can exist across different tenants
- **Same fund name** cannot exist twice within the same tenant
- **All funds** must be connected to a tenant

### Data Integrity
- **80+ properties** per fund node
- **Batch processing** with 50 records per batch
- **Comprehensive verification** after migration

### Performance Considerations
- **Large property set** may impact query performance
- **Indexes** created for common query patterns
- **Batch size** optimized for memory usage

## 🎯 Next Steps

1. **Run Data Check**: `npm run check:user-funds`
2. **Test Migration**: `npm run migrate:user-funds:limit=10`
3. **Full Migration**: `npm run migrate:user-funds`
4. **Verify Results**: Use verification queries above
5. **Add Entity Relationships**: If needed for specific entity-fund connections

## 🔧 Troubleshooting

### Common Issues
1. **Memory Issues**: Reduce batch size in migration script
2. **Constraint Errors**: Check for duplicate fund names within tenants
3. **Connection Issues**: Verify PostgreSQL and Neo4j connections
4. **Schema Errors**: Run `npm run schema:verify` to check constraints

### Debug Commands
```bash
# Check data before migration
npm run check:user-funds

# Verify schema
npm run schema:verify

# Check Neo4j data
npx ts-node scripts/check-neo4j-data.ts
```

---

**🎉 Your UserFund migration system is ready! Each fund will be properly tied to its tenant with comprehensive fund information.**
