# GraphRAG Testing & Development Code

This folder contains **testing and development code only** - safe to experiment with sample data.

## ⚠️ Important Note

**This is NOT for production use!** This folder contains:
- Sample/mock data only
- Development and testing scripts
- Local Neo4j with test data
- Safe to experiment and modify

For production code, see the `../production/` folder.

## 📁 Folder Structure

```
testing/
├── __tests__/           # Test files
│   └── neo4j-connection.test.ts
├── database/            # Database connection classes (dev)
│   ├── index.ts
│   ├── neo4j-connection.ts
│   └── postgres-connection.ts
├── migrations/          # Sample migration scripts
│   ├── index.ts
│   └── simple-user-migration.ts
├── scripts/             # Testing and demo scripts
│   ├── create-sample-users.ts
│   ├── test-neo4j.ts
│   ├── run-sample-queries.ts
│   └── show-all-nodes.ts
├── types/               # TypeScript type definitions
│   ├── index.ts
│   └── types.ts
├── utils/               # Utility functions and helpers
│   ├── index.ts
│   ├── graphrag-utils.ts
│   └── llm-query-engine.ts
└── index.ts             # Main entry point
```

## 🎯 Folder Purposes

### `database/`
Contains database connection classes for development:
- `PostgreSQLConnection` - PostgreSQL database connection
- `Neo4jConnection` - Neo4j graph database connection

### `migrations/`
Contains sample migration scripts:
- `SimpleUserMigration` - Basic user migration (sample database)
- Other migration scripts for testing different data types

### `scripts/`
Contains testing and demo scripts:
- `create-sample-users.ts` - Creates sample user data
- `test-neo4j.ts` - Tests Neo4j connection
- `run-sample-queries.ts` - Runs sample queries
- `show-all-nodes.ts` - Shows all nodes and relationships

### `types/`
Contains TypeScript type definitions:
- `types.ts` - Main type definitions

### `utils/`
Contains utility functions:
- `graphrag-utils.ts` - GraphRAG utility functions
- `llm-query-engine.ts` - LLM query engine utilities

## 🚀 Usage

### Import from organized folders:
```typescript
// Database connections
import { PostgreSQLConnection, Neo4jConnection } from './database';

// Migrations
import { SimpleUserMigration } from './migrations';

// Types
import { UserData, FundPerformance } from './types';

// Utils
import { GraphRAGUtils } from './utils';
```

### Run testing scripts:
```bash
# Database testing
npm run test:neo4j

# Sample data
npm run demo:users
npm run queries:sample
npm run show:nodes

# Sample migrations
npm run migrate:users
```

## 🛡️ Safety Features

- **Sample Data Only**: No real production data
- **Local Databases**: Uses local Neo4j instance
- **Safe to Experiment**: Modify without risk
- **Clear Separation**: Distinct from production code

## 📋 Benefits of This Structure

1. **Clear Separation**: Testing code separate from production
2. **Easy Navigation**: Find files quickly by category
3. **Better Imports**: Clean import paths with index files
4. **Scalability**: Easy to add new testing files
5. **Maintainability**: Related files are grouped together
6. **Safety**: No risk of affecting production data

## 🔧 Adding New Files

When adding new testing files, place them in the appropriate folder:

- **Database connections** → `database/`
- **Migration scripts** → `migrations/`
- **Testing scripts** → `scripts/`
- **Type definitions** → `types/`
- **Helper functions** → `utils/`
- **Test files** → `__tests__/`

Remember to update the corresponding `index.ts` file to export new modules!

## 🚨 Production vs Testing

| Testing (this folder) | Production (`../production/`) |
|----------------------|-------------------------------|
| Sample data only | Real data |
| Local Neo4j | Production Neo4j |
| Safe to experiment | Use with caution |
| Development scripts | Production scripts |
| Mock migrations | Real migrations |

---

**Remember**: This is testing code only. For production use, see `../production/README.md`
