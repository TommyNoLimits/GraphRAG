#!/usr/bin/env node

/**
 * Test Movements Structure
 * 
 * This script tests the new consolidated Movements structure
 * with combined movement and transaction data.
 */

const neo4j = require('neo4j-driver');
require('dotenv').config();

class MovementsTest {
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
   * Create sample Movements data for testing
   */
  async createSampleData() {
    console.log('🧪 Creating sample Movements data...\n');
    
    const session = this.driver.session();
    
    try {
      // Clear existing test data
      await session.run(`
        MATCH (m:Movements)
        WHERE m.fund_name IN ['Test Fund A', 'Test Fund B']
        DELETE m
      `);
      
      // Sample Movements data
      const movementsData1 = {
        "2023-01-15": {
          "type": "capital_call",
          "amount": "50000.00",
          "source": "movements",
          "created_at": "2023-01-15T14:20:00Z",
          "updated_at": "2023-01-15T14:20:00Z"
        },
        "2023-02-20": {
          "type": "distribution",
          "amount": "25000.00",
          "source": "movements",
          "created_at": "2023-02-20T09:30:00Z",
          "updated_at": "2023-02-20T09:30:00Z"
        },
        "2023-03-10": {
          "type": "capital_contribution",
          "amount": "75000.00",
          "source": "transactions",
          "created_at": "2023-03-10T11:45:00Z",
          "updated_at": "2023-03-10T11:45:00Z"
        },
        "2023-04-15": {
          "type": "distribution_payment",
          "amount": "30000.00",
          "source": "transactions",
          "created_at": "2023-04-15T16:15:00Z",
          "updated_at": "2023-04-15T16:15:00Z"
        },
        "2023-05-20": {
          "type": "management_fee",
          "amount": "5000.00",
          "source": "movements",
          "created_at": "2023-05-20T13:00:00Z",
          "updated_at": "2023-05-20T13:00:00Z"
        }
      };

      const movementsData2 = {
        "2023-02-01": {
          "type": "capital_call",
          "amount": "100000.00",
          "source": "movements",
          "created_at": "2023-02-01T10:00:00Z",
          "updated_at": "2023-02-01T10:00:00Z"
        },
        "2023-03-15": {
          "type": "distribution",
          "amount": "40000.00",
          "source": "movements",
          "created_at": "2023-03-15T15:30:00Z",
          "updated_at": "2023-03-15T15:30:00Z"
        },
        "2023-04-30": {
          "type": "capital_contribution",
          "amount": "120000.00",
          "source": "transactions",
          "created_at": "2023-04-30T12:45:00Z",
          "updated_at": "2023-04-30T12:45:00Z"
        }
      };

      const sampleMovements = [
        {
          id: 'movements_test_fund_a_entity_1',
          tenant_id: 'fd68d10f-0780-4140-b393-3adf8109df4f',
          fund_name: 'Test Fund A',
          investment_entity: 'Entity 1',
          movements: JSON.stringify(movementsData1),
          latest_movement_date: '2023-05-20',
          latest_movement_type: 'management_fee',
          latest_movement_amount: '5000.00',
          movement_count: 5,
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-05-20T00:00:00Z'
        },
        {
          id: 'movements_test_fund_b_entity_2',
          tenant_id: 'fd68d10f-0780-4140-b393-3adf8109df4f',
          fund_name: 'Test Fund B',
          investment_entity: 'Entity 2',
          movements: JSON.stringify(movementsData2),
          latest_movement_date: '2023-04-30',
          latest_movement_type: 'capital_contribution',
          latest_movement_amount: '120000.00',
          movement_count: 3,
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-04-30T00:00:00Z'
        }
      ];
      
      // Create Movements nodes
      for (const movement of sampleMovements) {
        await session.run(`
          CREATE (m:Movements {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            movements: $movements,
            latest_movement_date: $latest_movement_date,
            latest_movement_type: $latest_movement_type,
            latest_movement_amount: $latest_movement_amount,
            movement_count: $movement_count,
            created_at: $created_at,
            updated_at: $updated_at
          })
        `, movement);
      }
      
      console.log(`✅ Created ${sampleMovements.length} sample Movements nodes`);
      
    } catch (error) {
      console.error('❌ Failed to create sample data:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Test Movements queries
   */
  async testMovementsQueries() {
    console.log('🔍 Testing Movements queries...\n');
    
    const session = this.driver.session();
    
    try {
      const testQueries = [
        {
          name: 'Get All Movements',
          query: `
            MATCH (m:Movements)
            WHERE m.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN m.fund_name, m.latest_movement_date, m.latest_movement_type, m.latest_movement_amount
            ORDER BY m.fund_name
          `
        },
        {
          name: 'Get Latest Movements',
          query: `
            MATCH (m:Movements)
            WHERE m.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              m.fund_name,
              m.latest_movement_date,
              m.latest_movement_type,
              m.latest_movement_amount,
              m.movement_count
            ORDER BY m.latest_movement_date DESC
          `
        },
        {
          name: 'Movement Statistics',
          query: `
            MATCH (m:Movements)
            WHERE m.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              count(m) as total_funds,
              sum(m.movement_count) as total_movements,
              avg(toFloat(m.latest_movement_amount)) as avg_latest_amount,
              max(toFloat(m.latest_movement_amount)) as max_latest_amount,
              min(toFloat(m.latest_movement_amount)) as min_latest_amount
          `
        },
        {
          name: 'Movements by Type',
          query: `
            MATCH (m:Movements)
            WHERE m.tenant_id = 'fd68d10f-0780-4140-b393-3adf8109df4f'
            RETURN 
              m.latest_movement_type,
              count(m) as fund_count,
              sum(toFloat(m.latest_movement_amount)) as total_amount
            ORDER BY total_amount DESC
          `
        },
        {
          name: 'Get Specific Movement Data',
          query: `
            MATCH (m:Movements)
            WHERE m.fund_name = 'Test Fund A'
            RETURN 
              m.movements,
              m.movement_count,
              m.latest_movement_date
          `
        }
      ];
      
      for (const test of testQueries) {
        console.log(`📊 ${test.name}:`);
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
          console.log(`   ${index + 1}:`, JSON.stringify(record, null, 2));
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
   * Test JSON parsing of movements data
   */
  async testJSONParsing() {
    console.log('🔍 Testing JSON parsing...\n');
    
    const session = this.driver.session();
    
    try {
      // Test parsing movements JSON
      const result = await session.run(`
        MATCH (m:Movements)
        WHERE m.fund_name = 'Test Fund A'
        RETURN m.movements, m.movement_count
      `);
      
      if (result.records.length > 0) {
        const record = result.records[0];
        const movementsJSON = record.get('m.movements');
        const movementCount = record.get('m.movement_count');
        
        console.log('📋 Raw movements JSON:');
        console.log(movementsJSON);
        console.log('');
        
        console.log('📋 Parsed movements data:');
        const movementsData = JSON.parse(movementsJSON);
        Object.entries(movementsData).forEach(([date, data]) => {
          console.log(`   ${date}: ${data.type} - $${data.amount} (${data.source})`);
        });
        console.log('');
        
        console.log(`📊 Total movements: ${movementCount}`);
        console.log(`📊 Unique dates: ${Object.keys(movementsData).length}`);
        
        // Test filtering by source
        const movementsOnly = Object.entries(movementsData)
          .filter(([_, data]) => data.source === 'movements')
          .length;
        const transactionsOnly = Object.entries(movementsData)
          .filter(([_, data]) => data.source === 'transactions')
          .length;
        
        console.log(`📊 From movements table: ${movementsOnly}`);
        console.log(`📊 From transactions table: ${transactionsOnly}`);
      }
      
    } catch (error) {
      console.error('❌ JSON parsing test failed:', error.message);
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
   * Clean up test data
   */
  async cleanup() {
    console.log('🧹 Cleaning up test data...\n');
    
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (m:Movements)
        WHERE m.fund_name IN ['Test Fund A', 'Test Fund B']
        DELETE m
        RETURN count(m) as deleted_count
      `);
      
      const deletedCount = result.records[0].get('deleted_count').toNumber();
      console.log(`✅ Deleted ${deletedCount} test Movements nodes`);
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    try {
      await this.connect();
      await this.createSampleData();
      await this.testMovementsQueries();
      await this.testJSONParsing();
      await this.cleanup();
      console.log('✅ All Movements tests completed successfully!');
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
  const test = new MovementsTest();
  test.runTests();
}

module.exports = MovementsTest;
