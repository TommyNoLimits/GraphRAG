import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
  console.log('🔍 Checking PostgreSQL for duplicate entities within tenants...');
  const postgres = new PostgreSQLConnection();

  try {
    await postgres.testConnection();
    
    // Check for duplicates within tenants
    const duplicates = await postgres.query(`
      SELECT tenant_id, investment_entity, COUNT(*) as count
      FROM user_entities 
      GROUP BY tenant_id, investment_entity
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    console.log(`📊 Found ${duplicates.length} duplicate entity-tenant combinations:`);
    duplicates.forEach((dup: any, index: number) => {
      console.log(`   ${index + 1}. Tenant: ${dup.tenant_id.substring(0, 8)}... Entity: ${dup.investment_entity} (Count: ${dup.count})`);
    });
    
    if (duplicates.length > 0) {
      console.log('\n🔍 Sample duplicate records:');
      for (const dup of duplicates.slice(0, 3)) {
        const samples = await postgres.query(`
          SELECT id, investment_entity, entity_allias, created_at
          FROM user_entities 
          WHERE tenant_id = $1 AND investment_entity = $2
          ORDER BY created_at DESC
        `, [dup.tenant_id, dup.investment_entity]);
        
        console.log(`\n   Tenant: ${dup.tenant_id.substring(0, 8)}... Entity: ${dup.investment_entity}`);
        samples.forEach((sample: any, i: number) => {
          console.log(`     ${i + 1}. ID: ${sample.id}, Alias: ${sample.entity_allias || 'N/A'}, Created: ${sample.created_at}`);
        });
      }
    } else {
      console.log('✅ No duplicates found - data is clean!');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await postgres.close();
  }
}

checkDuplicates();
