import { Neo4jConnection } from '../database/neo4j-connection';
import { NEO4J_SCHEMA, getAllConstraints, getAllIndexes, generateSchemaCypher } from './neo4j-schema';
import { writeFileSync } from 'fs';
import { join } from 'path';

export class SchemaManager {
  private neo4j: Neo4jConnection;
  private database: string;

  constructor(database: string = 'neo4j') {
    this.neo4j = new Neo4jConnection();
    this.database = database;
  }

  /**
   * Create the complete Neo4j schema
   */
  async createCompleteSchema(): Promise<boolean> {
    console.log(`🏗️ Creating complete Neo4j schema for database: ${this.database}`);
    
    try {
      await this.neo4j.connect();
      const session = this.neo4j['driver']!.session({ database: this.database });

      // Create all constraints
      console.log('📋 Creating constraints...');
      const constraints = getAllConstraints();
      for (const constraint of constraints) {
        try {
          await session.run(constraint.cypher);
          console.log(`   ✅ ${constraint.name}`);
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️ ${constraint.name} (already exists)`);
          } else {
            console.error(`   ❌ ${constraint.name}: ${error.message}`);
          }
        }
      }

      // Create all indexes
      console.log('📊 Creating indexes...');
      const indexes = getAllIndexes();
      for (const index of indexes) {
        try {
          await session.run(index.cypher);
          console.log(`   ✅ ${index.name}`);
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️ ${index.name} (already exists)`);
          } else {
            console.error(`   ❌ ${index.name}: ${error.message}`);
          }
        }
      }

      await session.close();
      console.log('✅ Complete schema created successfully!');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to create schema:', error.message);
      return false;
    } finally {
      await this.neo4j.close();
    }
  }

  /**
   * Create schema for specific node types
   */
  async createNodeSchema(nodeLabels: string[]): Promise<boolean> {
    console.log(`🏗️ Creating schema for nodes: ${nodeLabels.join(', ')}`);
    
    try {
      await this.neo4j.connect();
      const session = this.neo4j['driver']!.session({ database: this.database });

      for (const label of nodeLabels) {
        const nodeSchema = NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes];
        if (!nodeSchema) {
          console.warn(`⚠️ No schema found for node label: ${label}`);
          continue;
        }

        console.log(`📋 Creating schema for ${label}...`);

        // Create constraints
        for (const constraint of nodeSchema.constraints) {
          try {
            await session.run(constraint.cypher);
            console.log(`   ✅ ${constraint.name}`);
          } catch (error: any) {
            if (error.message.includes('already exists')) {
              console.log(`   ⚠️ ${constraint.name} (already exists)`);
            } else {
              console.error(`   ❌ ${constraint.name}: ${error.message}`);
            }
          }
        }

        // Create indexes
        for (const index of nodeSchema.indexes) {
          try {
            await session.run(index.cypher);
            console.log(`   ✅ ${index.name}`);
          } catch (error: any) {
            if (error.message.includes('already exists')) {
              console.log(`   ⚠️ ${index.name} (already exists)`);
            } else {
              console.error(`   ❌ ${index.name}: ${error.message}`);
            }
          }
        }
      }

      await session.close();
      console.log('✅ Node schemas created successfully!');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to create node schemas:', error.message);
      return false;
    } finally {
      await this.neo4j.close();
    }
  }

  /**
   * Drop schema for specific node types
   */
  async dropNodeSchema(nodeLabels: string[]): Promise<boolean> {
    console.log(`🗑️ Dropping schema for nodes: ${nodeLabels.join(', ')}`);
    
    try {
      await this.neo4j.connect();
      const session = this.neo4j['driver']!.session({ database: this.database });

      for (const label of nodeLabels) {
        const nodeSchema = NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes];
        if (!nodeSchema) {
          console.warn(`⚠️ No schema found for node label: ${label}`);
          continue;
        }

        console.log(`🗑️ Dropping schema for ${label}...`);

        // Drop indexes first
        for (const index of nodeSchema.indexes) {
          try {
            await session.run(`DROP INDEX ${index.name} IF EXISTS`);
            console.log(`   ✅ Dropped index ${index.name}`);
          } catch (error: any) {
            console.error(`   ❌ Failed to drop index ${index.name}: ${error.message}`);
          }
        }

        // Drop constraints
        for (const constraint of nodeSchema.constraints) {
          try {
            await session.run(`DROP CONSTRAINT ${constraint.name} IF EXISTS`);
            console.log(`   ✅ Dropped constraint ${constraint.name}`);
          } catch (error: any) {
            console.error(`   ❌ Failed to drop constraint ${constraint.name}: ${error.message}`);
          }
        }
      }

      await session.close();
      console.log('✅ Node schemas dropped successfully!');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to drop node schemas:', error.message);
      return false;
    } finally {
      await this.neo4j.close();
    }
  }

  /**
   * Verify schema exists
   */
  async verifySchema(): Promise<boolean> {
    console.log('🔍 Verifying Neo4j schema...');
    
    try {
      await this.neo4j.connect();
      const session = this.neo4j['driver']!.session({ database: this.database });

      // Check constraints
      const constraintsResult = await session.run('SHOW CONSTRAINTS');
      const constraints = constraintsResult.records.map(record => record.get('name'));
      
      // Check indexes
      const indexesResult = await session.run('SHOW INDEXES');
      const indexes = indexesResult.records.map(record => record.get('name'));

      console.log(`📊 Found ${constraints.length} constraints and ${indexes.length} indexes`);

      // Verify expected constraints exist
      const expectedConstraints = getAllConstraints();
      const missingConstraints = expectedConstraints.filter(c => !constraints.includes(c.name));
      
      if (missingConstraints.length > 0) {
        console.log('⚠️ Missing constraints:');
        missingConstraints.forEach(c => console.log(`   - ${c.name}`));
      }

      // Verify expected indexes exist
      const expectedIndexes = getAllIndexes();
      const missingIndexes = expectedIndexes.filter(i => !indexes.includes(i.name));
      
      if (missingIndexes.length > 0) {
        console.log('⚠️ Missing indexes:');
        missingIndexes.forEach(i => console.log(`   - ${i.name}`));
      }

      await session.close();
      
      const isValid = missingConstraints.length === 0 && missingIndexes.length === 0;
      console.log(isValid ? '✅ Schema verification passed!' : '⚠️ Schema verification found issues');
      return isValid;

    } catch (error: any) {
      console.error('❌ Failed to verify schema:', error.message);
      return false;
    } finally {
      await this.neo4j.close();
    }
  }

  /**
   * Generate and save schema Cypher to file
   */
  async generateSchemaFile(outputPath?: string): Promise<string> {
    const cypherLines = generateSchemaCypher();
    const cypherContent = cypherLines.join('\n');
    
    const filePath = outputPath || join(process.cwd(), 'schema', 'neo4j-schema.cypher');
    
    try {
      writeFileSync(filePath, cypherContent, 'utf8');
      console.log(`📄 Schema Cypher saved to: ${filePath}`);
      return filePath;
    } catch (error: any) {
      console.error('❌ Failed to save schema file:', error.message);
      throw error;
    }
  }

  /**
   * Get schema information
   */
  getSchemaInfo(): any {
    const constraints = getAllConstraints();
    const indexes = getAllIndexes();
    const nodeLabels = Object.keys(NEO4J_SCHEMA.nodes);
    const relationships = NEO4J_SCHEMA.relationships;

    return {
      version: '1.0.0',
      nodeLabels,
      relationships: relationships.length,
      constraints: constraints.length,
      indexes: indexes.length,
      nodes: Object.keys(NEO4J_SCHEMA.nodes).map(label => ({
        label,
        properties: NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes].properties.length,
        constraints: NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes].constraints.length,
        indexes: NEO4J_SCHEMA.nodes[label as keyof typeof NEO4J_SCHEMA.nodes].indexes.length
      }))
    };
  }
}
