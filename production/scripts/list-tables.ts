import { PostgreSQLConnection } from '../database/postgres-connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listAllTables() {
  console.log('📋 Listing All Tables in PostgreSQL Database...');
  console.log('');
  
  const postgres = new PostgreSQLConnection();
  
  try {
    // Test connection first
    console.log('🔍 Testing connection...');
    const connected = await postgres.testConnection();
    
    if (!connected) {
      console.log('❌ Cannot connect to PostgreSQL');
      return;
    }
    
    console.log('');
    console.log('📊 Fetching all tables...');
    
    // Get all tables with their row counts
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schemaname, tablename
    `;
    
    const tables = await postgres.query(tablesQuery);
    
    console.log(`✅ Found ${tables.length} tables:`);
    console.log('');
    
    // Group tables by schema
    const tablesBySchema: Record<string, any[]> = {};
    tables.forEach(table => {
      if (!tablesBySchema[table.schemaname]) {
        tablesBySchema[table.schemaname] = [];
      }
      tablesBySchema[table.schemaname].push(table);
    });
    
    // Display tables grouped by schema
    Object.entries(tablesBySchema).forEach(([schema, schemaTables]) => {
      console.log(`📁 Schema: ${schema}`);
      schemaTables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.tablename} (owner: ${table.tableowner})`);
      });
      console.log('');
    });
    
    // Get row counts for each table
    console.log('📊 Table Row Counts:');
    console.log('');
    
    for (const table of tables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${table.schemaname}"."${table.tablename}"`;
        const result = await postgres.query(countQuery);
        const count = parseInt(result[0].count);
        console.log(`   ${table.schemaname}.${table.tablename}: ${count.toLocaleString()} rows`);
      } catch (error) {
        console.log(`   ${table.schemaname}.${table.tablename}: Error counting rows`);
      }
    }
    
    console.log('');
    console.log('🔍 Detailed Table Information:');
    console.log('');
    
    // Get detailed information about each table
    for (const table of tables) {
      try {
        console.log(`📋 Table: ${table.schemaname}.${table.tablename}`);
        
        // Get column information
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `;
        
        const columns = await postgres.query(columnsQuery, [table.schemaname, table.tablename]);
        
        console.log('   Columns:');
        columns.forEach((column, index) => {
          const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = column.column_default ? ` DEFAULT ${column.column_default}` : '';
          console.log(`     ${index + 1}. ${column.column_name} (${column.data_type}) ${nullable}${defaultVal}`);
        });
        
        // Get sample data (first 3 rows)
        try {
          const sampleQuery = `SELECT * FROM "${table.schemaname}"."${table.tablename}" LIMIT 3`;
          const sampleData = await postgres.query(sampleQuery);
          
          if (sampleData.length > 0) {
            console.log('   Sample Data:');
            sampleData.forEach((row, index) => {
              const rowData = Object.entries(row)
                .slice(0, 5) // Show first 5 columns
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              console.log(`     Row ${index + 1}: ${rowData}${Object.keys(row).length > 5 ? '...' : ''}`);
            });
          }
        } catch (error) {
          console.log('   Sample Data: Unable to fetch sample data');
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`   Error getting details for ${table.schemaname}.${table.tablename}`);
        console.log('');
      }
    }
    
    console.log('🎉 Table listing completed!');
    
  } catch (error) {
    console.error('❌ Error listing tables:', error);
  } finally {
    await postgres.close();
  }
}

// Run the script
listAllTables().catch(console.error);
