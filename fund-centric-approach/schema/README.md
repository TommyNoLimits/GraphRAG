# Neo4j Schema Management

This directory contains the centralized Neo4j schema management system for the GraphRAG application.

## 📁 Files

- **`neo4j-schema.ts`** - Centralized schema definition with all node types, constraints, and indexes
- **`schema-manager.ts`** - Service class for managing schema operations
- **`index.ts`** - Module exports
- **`neo4j-schema.cypher`** - Generated Cypher script for manual schema creation

## 🏗️ Schema Overview

### Node Types
- **User** (24 properties) - User accounts with tenant relationships
- **Tenant** (4 properties) - Multi-tenant organization units
- **UserEntity** (6 properties) - Investment entities per tenant
- **Fund** (4 properties) - Investment funds
- **Document** (6 properties) - Financial documents
- **NAV** (5 properties) - Net Asset Value records
- **Transaction** (6 properties) - Financial transactions

### Key Constraints
- **Tenant-constrained uniqueness**: `(tenant_id, investment_entity)` must be unique
- **Global uniqueness**: User IDs, Tenant IDs, Fund names, Document IDs
- **Performance indexes**: Email, username, dates, classifications

## 🚀 Usage

### Schema Management Commands

```bash
# Show schema information
npm run schema:info

# Create complete schema
npm run schema:create

# Create schema for specific nodes
npm run schema:create-nodes User Tenant UserEntity

# Drop schema for specific nodes
npm run schema:drop-nodes UserEntity

# Verify schema exists and is correct
npm run schema:verify

# Generate Cypher file
npm run schema:generate

# Show help
npm run schema:help
```

### Programmatic Usage

```typescript
import { SchemaManager } from './schema/schema-manager';

const schemaManager = new SchemaManager('neo4j');

// Create complete schema
await schemaManager.createCompleteSchema();

// Create schema for specific nodes
await schemaManager.createNodeSchema(['User', 'Tenant']);

// Verify schema
const isValid = await schemaManager.verifySchema();

// Get schema information
const info = schemaManager.getSchemaInfo();
```

## 🔧 Schema Definition

The schema is defined in `neo4j-schema.ts` with:

- **Node definitions** with properties, constraints, and indexes
- **Relationship definitions** between node types
- **Type-safe interfaces** for schema management
- **Cypher generation** for manual execution

## 📊 Current Schema Stats

- **7 Node Types**: User, Tenant, UserEntity, Fund, Document, NAV, Transaction
- **6 Constraints**: Unique constraints for IDs and tenant-constrained entities
- **10 Indexes**: Performance indexes for common queries
- **5 Relationships**: Tenant-based relationships

## 🎯 Key Features

1. **Centralized Management**: All schema definitions in one place
2. **Type Safety**: TypeScript interfaces for schema validation
3. **Version Control**: Schema versioning for migration tracking
4. **Flexible Operations**: Create/drop schema for specific node types
5. **Cypher Generation**: Export schema as executable Cypher scripts
6. **Verification**: Validate existing schema against definitions

## 🔄 Migration Strategy

1. **Schema Evolution**: Update `neo4j-schema.ts` with new constraints/indexes
2. **Version Bumping**: Increment `SCHEMA_VERSION` for tracking
3. **Migration Scripts**: Use schema manager to apply changes
4. **Verification**: Always verify schema after changes

## 📝 Best Practices

- Always use `IF NOT EXISTS` in constraint/index creation
- Test schema changes in development first
- Use `schema:verify` before and after migrations
- Keep schema definitions synchronized across environments
- Document schema changes in commit messages
