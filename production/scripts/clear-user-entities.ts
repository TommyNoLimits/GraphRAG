import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function clearUserEntities() {
  console.log('🗑️ Clearing existing user entity data...');
  const neo4j = new Neo4jConnection('neo4j'); // Use the default 'neo4j' database

  try {
    await neo4j.connect();

    // Delete all UserEntity nodes and their relationships
    const deleteQuery = `
      MATCH (ue:UserEntity)
      DETACH DELETE ue
    `;
    await neo4j.executeQuery(deleteQuery);
    console.log('✅ Cleared all UserEntity nodes and relationships');

    // Optionally, delete any orphaned Tenant nodes that no longer have relationships
    const deleteOrphanedTenantsQuery = `
      MATCH (t:Tenant)
      WHERE NOT (t)<-[:BELONGS_TO_TENANT]-() AND NOT (t)<-[:BELONGS_TO]-()
      DETACH DELETE t
    `;
    await neo4j.executeQuery(deleteOrphanedTenantsQuery);
    console.log('✅ Cleared orphaned Tenant nodes');

    console.log('🎉 Data clearing completed successfully!');

  } catch (error: any) {
    console.error('❌ Error clearing user entities:', error.message);
  } finally {
    await neo4j.close();
  }
}

clearUserEntities();
