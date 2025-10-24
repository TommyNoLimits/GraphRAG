#!/usr/bin/env node

/**
 * Test Migrate Tenant with New NAV Structure
 * 
 * This script tests the updated migrate-tenant functionality
 * with the new consolidated NAV structure.
 */

const neo4j = require('neo4j-driver');
require('dotenv').config();

class MigrateTenantTest {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );
  }

  async connect() {
    try {
      await this.driver.verifyConnectivity();
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error.message);
      throw error;
    }
  }

  async close() {
    await this.driver.close();
  }

  /**
   * Test the new NAV structure by checking existing NAV nodes
   */
  async testNAVStructure() {
    console.log('🧪 Testing NAV Structure...\n');
    
    const session = this.driver.session();
    
    try {
      // Check if we have any NAV nodes
      const countQuery = `
        MATCH (n:NAV)
        RETURN count(n) as nav_count
      `;
      
      const countResult = await session.run(countQuery);
      const navCount = countResult.records[0].get('nav_count').toNumber();
      
      console.log(`📊 Found ${navCount} NAV nodes in database`);
      
      if (navCount === 0) {
        console.log('⚠️  No NAV nodes found. Run migrate-tenant script first.');
        return;
      }
      
      // Check NAV structure
      const structureQuery = `
        MATCH (n:NAV)
        RETURN 
          n.id,
          n.fund_name,
          n.investment_entity,
          n.latest_nav,
          n.latest_date,
          n.nav_count,
          size(keys(n)) as property_count
        LIMIT 3
      `;
      
      const structureResult = await session.run(structureQuery);
      console.log('\n📋 NAV Structure Sample:');
      
      structureResult.records.forEach((record, index) => {
        console.log(`\n${index + 1}. NAV Node:`);
        console.log(`   ID: ${record.get('n.id')}`);
        console.log(`   Fund: ${record.get('n.fund_name')}`);
        console.log(`   Entity: ${record.get('n.investment_entity')}`);
        console.log(`   Latest NAV: ${record.get('n.latest_nav')}`);
        console.log(`   Latest Date: ${record.get('n.latest_date')}`);
        console.log(`   NAV Count: ${record.get('n.nav_count')}`);
        console.log(`   Properties: ${record.get('property_count')}`);
      });
      
      // Check for old NAV structure (should be empty)
      const oldStructureQuery = `
        MATCH (n:NAV)
        WHERE n.as_of_date IS NOT NULL AND n.nav IS NOT NULL
        RETURN count(n) as old_structure_count
      `;
      
      const oldStructureResult = await session.run(oldStructureQuery);
      const oldStructureCount = oldStructureResult.records[0].get('old_structure_count').toNumber();
      
      if (oldStructureCount > 0) {
        console.log(`\n⚠️  Found ${oldStructureCount} NAV nodes with old structure`);
      } else {
        console.log('\n✅ No NAV nodes with old structure found');
      }
      
      // Test query patterns
      console.log('\n🔍 Testing Query Patterns:');
      
      const testQueries = [
        {
          name: 'Latest NAVs',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN n.fund_name, n.latest_nav, n.latest_date
            ORDER BY n.fund_name
            LIMIT 3
          `
        },
        {
          name: 'NAV Statistics',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              count(n) as total_funds,
              avg(toFloat(n.latest_nav)) as avg_nav,
              max(toFloat(n.latest_nav)) as max_nav,
              min(toFloat(n.latest_nav)) as min_nav
          `
        }
      ];
      
      for (const test of testQueries) {
        console.log(`\n   ${test.name}:`);
        const result = await session.run(test.query);
        const records = result.records.map(record => {
          const obj = {};
          record.keys.forEach(key => {
            const value = record.get(key);
            obj[key] = this.convertNeo4jValue(value);
          });
          return obj;
        });
        
        records.forEach((record, index) => {
          console.log(`     ${index + 1}:`, JSON.stringify(record, null, 2));
        });
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Convert Neo4j values to plain JavaScript objects
   */
  convertNeo4jValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (neo4j.isInt(value)) {
      return value.toNumber();
    }
    
    if (neo4j.isDate(value)) {
      return value.toString();
    }
    
    if (neo4j.isDateTime(value)) {
      return value.toString();
    }
    
    if (neo4j.isTime(value)) {
      return value.toString();
    }
    
    if (neo4j.isDuration(value)) {
      return value.toString();
    }
    
    if (neo4j.isPoint(value)) {
      return value.toString();
    }
    
    if (typeof value === 'bigint') {
      return Number(value);
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => this.convertNeo4jValue(item));
      } else {
        const obj = {};
        for (const [key, val] of Object.entries(value)) {
          obj[key] = this.convertNeo4jValue(val);
        }
        return obj;
      }
    }
    
    return value;
  }

  /**
   * Run all tests
   */
  async runTests() {
    try {
      await this.connect();
      await this.testNAVStructure();
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Tests failed:', error.message);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const test = new MigrateTenantTest();
  test.runTests();
}

module.exports = MigrateTenantTest;
