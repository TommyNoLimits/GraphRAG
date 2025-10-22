import { Client } from 'pg';
import { Neo4jConnection } from '../database/neo4j-connection';

interface UserChangeEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  old?: any;
  new?: any;
  timestamp: number;
}

export class PostgresListener {
  private client: Client;
  private neo4j: Neo4jConnection;
  private isListening = false;

  constructor() {
    this.client = new Client({
      connectionString: process.env.POSTGRES_URL,
    });
    this.neo4j = new Neo4jConnection();
  }

  async startListening() {
    try {
      await this.client.connect();
      await this.neo4j.connect();
      
      console.log('🎧 Starting PostgreSQL change listener...');
      
      // Listen for user changes
      this.client.on('notification', async (msg) => {
        if (msg.channel === 'user_changes') {
          await this.handleUserChange(JSON.parse(msg.payload!));
        }
      });
      
      await this.client.query('LISTEN user_changes');
      this.isListening = true;
      
      console.log('✅ PostgreSQL listener started successfully!');
      console.log('📡 Listening for user changes...');
      
    } catch (error) {
      console.error('❌ Failed to start listener:', error);
      throw error;
    }
  }

  async stopListening() {
    if (this.isListening) {
      await this.client.query('UNLISTEN user_changes');
      await this.client.end();
      await this.neo4j.close();
      this.isListening = false;
      console.log('🔌 PostgreSQL listener stopped');
    }
  }

  private async handleUserChange(payload: UserChangeEvent) {
    const { operation, new: newData, old: oldData } = payload;
    
    console.log(`📡 Received ${operation} event for user`);
    
    try {
      switch (operation) {
        case 'INSERT':
          await this.createUserInNeo4j(newData);
          break;
        case 'UPDATE':
          await this.updateUserInNeo4j(newData);
          break;
        case 'DELETE':
          await this.deleteUserFromNeo4j(oldData);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${operation} event:`, error);
    }
  }

  private async createUserInNeo4j(userData: any) {
    const query = `
      MERGE (u:User {id: $id})
      SET u.username = $username,
          u.email = $email,
          u.first_name = $first_name,
          u.last_name = $last_name,
          u.created_at = $created_at,
          u.updated_at = $updated_at,
          u.email_confirmed = $email_confirmed,
          u.phone_number = $phone_number,
          u.phone_number_confirmed = $phone_number_confirmed,
          u.two_factor_enabled = $two_factor_enabled,
          u.lockout_enabled = $lockout_enabled,
          u.access_failed_count = $access_failed_count,
          u.is_mfa_enabled = $is_mfa_enabled,
          u.call_notifications = $call_notifications,
          u.distribution_notifications = $distribution_notifications,
          u.statement_notifications = $statement_notifications,
          u.new_investment_notifications = $new_investment_notifications,
          u.new_opportunity_notifications = $new_opportunity_notifications,
          u.pipeline_notifications = $pipeline_notifications,
          u.forwarding_email = $forwarding_email,
          u.plaid_consent = $plaid_consent,
          u.plaid_consent_date = $plaid_consent_date,
          u.tenant_id = $tenant_id
      MERGE (t:Tenant {id: $tenant_id})
      MERGE (u)-[:BELONGS_TO]->(t)
    `;
    
    await this.neo4j.executeQuery(query, userData);
    console.log(`✅ Created user ${userData.id} in Neo4j`);
  }

  private async updateUserInNeo4j(userData: any) {
    const query = `
      MATCH (u:User {id: $id})
      SET u.username = $username,
          u.email = $email,
          u.first_name = $first_name,
          u.last_name = $last_name,
          u.updated_at = $updated_at,
          u.email_confirmed = $email_confirmed,
          u.phone_number = $phone_number,
          u.phone_number_confirmed = $phone_number_confirmed,
          u.two_factor_enabled = $two_factor_enabled,
          u.lockout_enabled = $lockout_enabled,
          u.access_failed_count = $access_failed_count,
          u.is_mfa_enabled = $is_mfa_enabled,
          u.call_notifications = $call_notifications,
          u.distribution_notifications = $distribution_notifications,
          u.statement_notifications = $statement_notifications,
          u.new_investment_notifications = $new_investment_notifications,
          u.new_opportunity_notifications = $new_opportunity_notifications,
          u.pipeline_notifications = $pipeline_notifications,
          u.forwarding_email = $forwarding_email,
          u.plaid_consent = $plaid_consent,
          u.plaid_consent_date = $plaid_consent_date
    `;
    
    await this.neo4j.executeQuery(query, userData);
    console.log(`🔄 Updated user ${userData.id} in Neo4j`);
  }

  private async deleteUserFromNeo4j(userData: any) {
    const query = `MATCH (u:User {id: $id}) DETACH DELETE u`;
    await this.neo4j.executeQuery(query, userData);
    console.log(`🗑️ Deleted user ${userData.id} from Neo4j`);
  }
}

// CLI usage
async function main() {
  const listener = new PostgresListener();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down listener...');
    await listener.stopListening();
    process.exit(0);
  });
  
  await listener.startListening();
  
  // Keep the process alive
  console.log('🔄 Listener is running. Press Ctrl+C to stop.');
  setInterval(() => {}, 1000);
}

if (require.main === module) {
  main().catch(console.error);
}
