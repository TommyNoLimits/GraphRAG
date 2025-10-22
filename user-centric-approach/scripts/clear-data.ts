#!/usr/bin/env ts-node

/**
 * Clear Neo4j Data
 * 
 * This script clears all data from Neo4j database
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function clearData() {
  console.log('🗑️ Clearing Neo4j data...');
  
  const neo4j = new Neo4jConnection();
  
  try {
    await neo4j.connect();
    console.log('✅ Connected to Neo4j');
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      // Get count before deletion
      const countResult = await session.run(`
        MATCH (n)
        RETURN count(n) as total_nodes
      `);
      const totalNodes = countResult.records[0].get('total_nodes');
      console.log(`📊 Found ${totalNodes} nodes to delete`);
      
      if (totalNodes === 0) {
        console.log('✅ Database is already empty');
        return;
      }
      
      // Delete all nodes and relationships
      console.log('🗑️ Deleting all nodes and relationships...');
      await session.run(`
        MATCH (n)
        DETACH DELETE n
      `);
      
      console.log('✅ All data cleared successfully');
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error clearing data:', error.message);
  } finally {
    await neo4j.close();
  }
}

// Run the clear operation
clearData().catch(console.error);
