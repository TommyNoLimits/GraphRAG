import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

dotenv.config();

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate entities within tenants...');
  const postgres = new PostgreSQLConnection();

  try {
    await postgres.testConnection();
    
    // Find duplicates
    const duplicates = await postgres.query(`
      SELECT tenant_id, investment_entity, COUNT(*) as count
      FROM user_entities 
      GROUP BY tenant_id, investment_entity
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    console.log(`📊 Found ${duplicates.length} duplicate entity-tenant combinations to clean`);
    
    for (const dup of duplicates) {
      console.log(`\n🔍 Cleaning: ${dup.investment_entity} in tenant ${dup.tenant_id.substring(0, 8)}...`);
      
      // Get all records for this duplicate
      const records = await postgres.query(`
        SELECT id, investment_entity, entity_allias, created_at, updated_at
        FROM user_entities 
        WHERE tenant_id = $1 AND investment_entity = $2
        ORDER BY created_at DESC, updated_at DESC
      `, [dup.tenant_id, dup.investment_entity]);
      
      console.log(`   Found ${records.length} records, keeping the most recent one`);
      
      // Keep the first (most recent) record, delete the rest
      const keepRecord = records[0];
      const deleteRecords = records.slice(1);
      
      console.log(`   Keeping: ID ${keepRecord.id} (created: ${keepRecord.created_at})`);
      
      for (const deleteRecord of deleteRecords) {
        console.log(`   Deleting: ID ${deleteRecord.id} (created: ${deleteRecord.created_at})`);
        await postgres.query(`
          DELETE FROM user_entities 
          WHERE id = $1
        `, [deleteRecord.id]);
      }
    }
    
    // Verify cleanup
    const remainingDuplicates = await postgres.query(`
      SELECT tenant_id, investment_entity, COUNT(*) as count
      FROM user_entities 
      GROUP BY tenant_id, investment_entity
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDuplicates.length === 0) {
      console.log('\n✅ All duplicates cleaned successfully!');
    } else {
      console.log(`\n⚠️ ${remainingDuplicates.length} duplicates still remain`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await postgres.close();
  }
}

cleanDuplicates();
