#!/usr/bin/env node

/**
 * NAV Structure Test Script
 * 
 * This script demonstrates the new consolidated NAV structure
 * and tests various query patterns.
 */

const neo4j = require('neo4j-driver');
require('dotenv').config();

class NAVStructureTest {
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
   * Create sample consolidated NAV nodes for testing
   */
  async createSampleNAVs() {
    console.log('📊 Creating sample consolidated NAV nodes...');
    
    const session = this.driver.session();
    
    try {
      // Sample NAV data for testing
      const sampleNavs = [
        {
          id: 'nav_fund_a_entity_1',
          tenant_id: 'fd68d10f-0780-4140-b393-3adf8109df4f',
          fund_name: 'Fund A',
          investment_entity: 'Entity 1',
          nav_values: JSON.stringify({
            '2023-01-01': '100.00',
            '2023-02-01': '105.00',
            '2023-03-01': '110.00',
            '2023-04-01': '108.00',
            '2023-05-01': '115.00'
          }),
          latest_nav: '115.00',
          latest_date: '2023-05-01',
          nav_count: 5,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-05-01T00:00:00Z'
        },
        {
          id: 'nav_fund_b_entity_2',
          tenant_id: 'fd68d10f-0780-4140-b393-3adf8109df4f',
          fund_name: 'Fund B',
          investment_entity: 'Entity 2',
          nav_values: JSON.stringify({
            '2023-01-01': '200.00',
            '2023-02-01': '210.00',
            '2023-03-01': '205.00'
          }),
          latest_nav: '205.00',
          latest_date: '2023-03-01',
          nav_count: 3,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-03-01T00:00:00Z'
        }
      ];

      // Clear existing NAV nodes first
      await session.run('MATCH (n:NAV) DETACH DELETE n');
      console.log('🗑️  Cleared existing NAV nodes');

      // Create sample NAV nodes
      for (const nav of sampleNavs) {
        await session.run(`
          CREATE (n:NAV {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            nav_values: $nav_values,
            latest_nav: $latest_nav,
            latest_date: $latest_date,
            nav_count: $nav_count,
            created_at: $created_at,
            updated_at: $updated_at
          })
        `, nav);
      }

      console.log(`✅ Created ${sampleNavs.length} sample NAV nodes`);
      
    } catch (error) {
      console.error('❌ Failed to create sample NAVs:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Test various query patterns with the new NAV structure
   */
  async testQueryPatterns() {
    console.log('\n🧪 Testing NAV Query Patterns...\n');
    
    const session = this.driver.session();
    
    try {
      const testQueries = [
        {
          name: 'Get Latest NAV for All Funds',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN n.fund_name, n.latest_nav, n.latest_date
            ORDER BY n.fund_name
          `
        },
        {
          name: 'Get NAV for Specific Date (using latest_nav as example)',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN n.fund_name, n.latest_nav, n.latest_date
            ORDER BY n.fund_name
          `
        },
        {
          name: 'Get All Historical NAVs for Fund A',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
              AND n.fund_name = 'Fund A'
            RETURN n.fund_name, n.nav_values, n.nav_count
          `
        },
        {
          name: 'Calculate Average Latest NAV',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN AVG(toFloat(n.latest_nav)) AS average_latest_nav
          `
        },
        {
          name: 'Get NAV Count Statistics',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              COUNT(n) AS total_funds,
              AVG(n.nav_count) AS avg_nav_entries,
              MAX(n.nav_count) AS max_nav_entries,
              MIN(n.nav_count) AS min_nav_entries
          `
        },
        {
          name: 'Get NAV Values for Date Range (simplified)',
          query: `
            MATCH (n:NAV)
            WHERE n.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              n.fund_name,
              n.latest_nav,
              n.latest_date,
              n.nav_count
            ORDER BY n.fund_name
          `
        }
      ];

      for (const test of testQueries) {
        console.log(`🔍 ${test.name}:`);
        console.log(`   Query: ${test.query.trim()}`);
        
        const result = await session.run(test.query);
        const records = result.records.map(record => {
          const obj = {};
          record.keys.forEach(key => {
            const value = record.get(key);
            obj[key] = this.convertNeo4jValue(value);
          });
          return obj;
        });
        
        console.log(`   Results (${records.length} records):`);
        records.forEach((record, index) => {
          console.log(`     ${index + 1}:`, JSON.stringify(record, null, 2));
        });
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ Query test failed:', error.message);
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
      await this.createSampleNAVs();
      await this.testQueryPatterns();
      console.log('✅ All tests completed successfully!');
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
  const test = new NAVStructureTest();
  test.runTests();
}

module.exports = NAVStructureTest;
