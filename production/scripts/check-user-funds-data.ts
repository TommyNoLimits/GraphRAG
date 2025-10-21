import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserFundsData() {
  console.log('🔍 Checking user_funds data...');
  const postgres = new PostgreSQLConnection();

  try {
    await postgres.testConnection();
    console.log('✅ PostgreSQL connection successful!');

    // Get count
    const countResult = await postgres.query('SELECT COUNT(*) as count FROM user_funds');
    const count = countResult[0].count;
    console.log(`📊 Total user_funds records: ${count}`);

    if (count > 0) {
      // Get sample data
      const sampleData = await postgres.query(`
        SELECT id, tenant_id, fund_name, fund_name_allias, investment_type, fund_type, 
               investment_manager_name, created_at
        FROM user_funds 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log('\n📋 Sample user_funds data:');
      sampleData.forEach((fund: any, index: number) => {
        console.log(`   ${index + 1}. ID: ${fund.id}`);
        console.log(`      Fund Name: ${fund.fund_name}`);
        console.log(`      Alias: ${fund.fund_name_allias || 'N/A'}`);
        console.log(`      Investment Type: ${fund.investment_type || 'N/A'}`);
        console.log(`      Fund Type: ${fund.fund_type || 'N/A'}`);
        console.log(`      Manager: ${fund.investment_manager_name || 'N/A'}`);
        console.log(`      Tenant ID: ${fund.tenant_id}`);
        console.log(`      Created: ${fund.created_at}`);
        console.log('');
      });

      // Check tenant distribution
      const tenantDistribution = await postgres.query(`
        SELECT tenant_id, COUNT(*) as fund_count
        FROM user_funds
        GROUP BY tenant_id
        ORDER BY fund_count DESC
        LIMIT 10
      `);

      console.log('📊 Funds by Tenant (Top 10):');
      tenantDistribution.forEach((tenant: any, index: number) => {
        console.log(`   ${index + 1}. Tenant: ${tenant.tenant_id.substring(0, 8)}... - ${tenant.fund_count} funds`);
      });

      // Check fund name distribution
      const fundNameDistribution = await postgres.query(`
        SELECT fund_name, COUNT(*) as count
        FROM user_funds
        GROUP BY fund_name
        ORDER BY count DESC
        LIMIT 10
      `);

      console.log('\n📊 Most Common Fund Names:');
      fundNameDistribution.forEach((fund: any, index: number) => {
        console.log(`   ${index + 1}. ${fund.fund_name} - ${fund.count} occurrences`);
      });

      // Check for potential duplicates within tenants
      const duplicates = await postgres.query(`
        SELECT tenant_id, fund_name, COUNT(*) as count
        FROM user_funds
        GROUP BY tenant_id, fund_name
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `);

      if (duplicates.length > 0) {
        console.log('\n⚠️ Potential Duplicates (same fund name within tenant):');
        duplicates.forEach((dup: any, index: number) => {
          console.log(`   ${index + 1}. Tenant: ${dup.tenant_id.substring(0, 8)}... Fund: ${dup.fund_name} - ${dup.count} records`);
        });
      } else {
        console.log('\n✅ No duplicate fund names within tenants found');
      }

    } else {
      console.log('ℹ️ No user_funds data found');
    }

  } catch (error: any) {
    console.error('❌ Error checking user_funds data:', error.message);
  } finally {
    await postgres.close();
    console.log('🔌 PostgreSQL connection closed');
  }
}

checkUserFundsData();
