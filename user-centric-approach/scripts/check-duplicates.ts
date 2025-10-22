#!/usr/bin/env ts-node
/**
 * Check for Duplicate Relationships
 */

import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
  const neo4j = new Neo4jConnection();
  await neo4j.connect();
  const session = neo4j['driver']!.session({ database: 'neo4j' });
  
  console.log('🔍 Final Duplicate Check...');
  
  const duplicateQuery = `
    MATCH (n)-[r]->(m)
    WITH n, m, type(r) as rel_type, count(r) as rel_count
    WHERE rel_count > 1
    RETURN labels(n)[0] as from_type, rel_type, labels(m)[0] as to_type, rel_count
    ORDER BY rel_count DESC
  `;
  
  const duplicateResult = await session.run(duplicateQuery);
  
  if (duplicateResult.records.length === 0) {
    console.log('✅ NO DUPLICATES FOUND! All relationships are unique.');
  } else {
    console.log('⚠️  Found duplicates:');
    duplicateResult.records.forEach((record: any) => {
      console.log(`   ${record.get('from_type')} -[:${record.get('rel_type')}]-> ${record.get('to_type')}: ${record.get('rel_count')} relationships`);
    });
  }
  
  await session.close();
  await neo4j.close();
}

if (require.main === module) {
  checkDuplicates().catch(console.error);
}
