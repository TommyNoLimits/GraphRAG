import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class PostgreSQLConnection {
  private pool: Pool;

  constructor() {
    // Azure PostgreSQL requires SSL
    const isAzurePostgres = process.env.POSTGRES_HOST?.includes('postgres.database.azure.com');
    
    // Use connection string if available, otherwise use individual parameters
    const config = process.env.POSTGRES_URL ? {
      connectionString: process.env.POSTGRES_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Azure PostgreSQL SSL configuration
      ssl: isAzurePostgres ? {
        rejectUnauthorized: false,
        require: true
      } : false,
    } : {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Azure PostgreSQL SSL configuration
      ssl: isAzurePostgres ? {
        rejectUnauthorized: false,
        require: true
      } : false,
    };
    
    this.pool = new Pool(config);
  }

  /**
   * Execute a query and return results
   */
  async query(text: string, params: any[] = []): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries: Array<{text: string, params: any[]}>): Promise<any[][]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const {text, params} of queries) {
        const result = await client.query(text, params);
        results.push(result.rows);
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test the database connection with detailed diagnostics
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing PostgreSQL connection...');
      console.log(`   Host: ${process.env.POSTGRES_HOST}`);
      console.log(`   Port: ${process.env.POSTGRES_PORT}`);
      console.log(`   Database: ${process.env.POSTGRES_DB}`);
      console.log(`   User: ${process.env.POSTGRES_USER}`);
      
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      console.log(`✅ PostgreSQL connection successful!`);
      console.log(`   Time: ${result[0].current_time}`);
      console.log(`   Version: ${result[0].version}`);
      return true;
    } catch (error: any) {
      console.error('❌ PostgreSQL connection failed:');
      console.error(`   Error Code: ${error.code}`);
      console.error(`   Error Message: ${error.message}`);
      
      // Provide specific guidance based on error type
      if (error.code === '28000') {
        console.error('\n🔧 Connection Issue: Authentication failed');
        console.error('   Possible solutions:');
        console.error('   1. Check username and password in .env file');
        console.error('   2. Verify the user exists in PostgreSQL');
        console.error('   3. Check if the user has proper permissions');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('\n🔧 Connection Issue: Cannot reach server');
        console.error('   Possible solutions:');
        console.error('   1. Check if PostgreSQL server is running');
        console.error('   2. Verify host and port in .env file');
        console.error('   3. Check firewall settings');
        console.error('   4. For Azure PostgreSQL: Add your IP to firewall rules');
      } else if (error.message.includes('no pg_hba.conf entry')) {
        console.error('\n🔧 Connection Issue: IP address not allowed');
        console.error('   This is likely an Azure PostgreSQL firewall issue');
        console.error('   Solutions:');
        console.error('   1. Add your current IP to Azure PostgreSQL firewall');
        console.error('   2. Enable "Allow access to Azure services"');
        console.error('   3. Check Azure PostgreSQL server firewall settings');
      }
      
      return false;
    }
  }

  /**
   * Get table counts for migration verification
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const tables = [
      'tenants',
      'funds', 
      'documents',
      'navs',
      'transactions',
      'movements',
      'subscriptions',
      'email_attachment_documents'
    ];

    const counts: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result[0].count);
      } catch (error) {
        console.warn(`⚠️ Could not count table ${table}:`, error);
        counts[table] = 0;
      }
    }

    return counts;
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 PostgreSQL connection pool closed');
  }
}
