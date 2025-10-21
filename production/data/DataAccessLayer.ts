// production/data/DataAccessLayer.ts
import { PostgreSQLConnection } from '../database/postgres-connection';
import { Neo4jConnection } from '../database/neo4j-connection';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  email_confirmed: boolean;
  phone_number?: string;
  phone_number_confirmed: boolean;
  two_factor_enabled: boolean;
  lockout_enabled: boolean;
  access_failed_count: number;
  is_mfa_enabled: boolean;
  call_notifications: boolean;
  distribution_notifications: boolean;
  statement_notifications: boolean;
  new_investment_notifications: boolean;
  new_opportunity_notifications: boolean;
  pipeline_notifications: boolean;
  forwarding_email?: string;
  plaid_consent: boolean;
  plaid_consent_date?: string;
}

export interface Tenant {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserWithTenant extends User {
  tenant: Tenant;
}

export class DataAccessLayer {
  private postgres: PostgreSQLConnection;
  private neo4j: Neo4jConnection;

  constructor() {
    this.postgres = new PostgreSQLConnection();
    this.neo4j = new Neo4jConnection();
  }

  async connect() {
    await this.postgres.connect();
    await this.neo4j.connect();
  }

  async close() {
    await this.postgres.close();
    await this.neo4j.close();
  }

  // PostgreSQL Operations
  async getUsers(limit?: number): Promise<User[]> {
    const query = limit 
      ? `SELECT * FROM users ORDER BY created_at DESC LIMIT $1`
      : `SELECT * FROM users ORDER BY created_at DESC`;
    
    const params = limit ? [limit] : [];
    return await this.postgres.query(query, params);
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.postgres.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return users[0] || null;
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const query = `
      INSERT INTO users (username, email, first_name, last_name, tenant_id, email_confirmed, phone_number, phone_number_confirmed, two_factor_enabled, lockout_enabled, access_failed_count, is_mfa_enabled, call_notifications, distribution_notifications, statement_notifications, new_investment_notifications, new_opportunity_notifications, pipeline_notifications, forwarding_email, plaid_consent, plaid_consent_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    
    const result = await this.postgres.query(query, [
      user.username, user.email, user.first_name, user.last_name, user.tenant_id,
      user.email_confirmed, user.phone_number, user.phone_number_confirmed,
      user.two_factor_enabled, user.lockout_enabled, user.access_failed_count,
      user.is_mfa_enabled, user.call_notifications, user.distribution_notifications,
      user.statement_notifications, user.new_investment_notifications,
      user.new_opportunity_notifications, user.pipeline_notifications,
      user.forwarding_email, user.plaid_consent, user.plaid_consent_date
    ]);
    
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const params = [id, ...fields.map(field => updates[field as keyof User])];
    const result = await this.postgres.query(query, params);
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.postgres.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // Neo4j Operations
  async getUsersFromGraph(limit?: number): Promise<UserWithTenant[]> {
    const query = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      RETURN u, t
      ORDER BY u.created_at DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    
    const results = await this.neo4j.executeQuery(query);
    return results.map(record => ({
      ...record.u,
      tenant: record.t
    }));
  }

  async getUserFromGraphById(id: string): Promise<UserWithTenant | null> {
    const query = `
      MATCH (u:User {id: $id})-[:BELONGS_TO]->(t:Tenant)
      RETURN u, t
    `;
    
    const results = await this.neo4j.executeQuery(query, { id });
    if (results.length === 0) return null;
    
    const record = results[0];
    return {
      ...record.u,
      tenant: record.t
    };
  }

  async createUserInGraph(user: User): Promise<void> {
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
    
    await this.neo4j.executeQuery(query, user);
  }

  async updateUserInGraph(id: string, updates: Partial<User>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `u.${field} = $${field}`).join(', ');
    
    const query = `
      MATCH (u:User {id: $id})
      SET ${setClause}, u.updated_at = $updated_at
    `;
    
    const params = { id, ...updates, updated_at: new Date().toISOString() };
    await this.neo4j.executeQuery(query, params);
  }

  async deleteUserFromGraph(id: string): Promise<void> {
    const query = `MATCH (u:User {id: $id}) DETACH DELETE u`;
    await this.neo4j.executeQuery(query, { id });
  }

  // GraphRAG Operations
  async findUsersByTenant(tenantId: string): Promise<User[]> {
    const query = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant {id: $tenantId})
      RETURN u
      ORDER BY u.created_at DESC
    `;
    
    const results = await this.neo4j.executeQuery(query, { tenantId });
    return results.map(record => record.u);
  }

  async findUsersByPattern(pattern: string): Promise<UserWithTenant[]> {
    const query = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
      WHERE u.first_name CONTAINS $pattern 
         OR u.last_name CONTAINS $pattern 
         OR u.email CONTAINS $pattern
         OR u.username CONTAINS $pattern
      RETURN u, t
      ORDER BY u.created_at DESC
    `;
    
    const results = await this.neo4j.executeQuery(query, { pattern });
    return results.map(record => ({
      ...record.u,
      tenant: record.t
    }));
  }

  async getTenantUserCounts(): Promise<{tenantId: string, userCount: number}[]> {
    const query = `
      MATCH (t:Tenant)
      OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(t)
      RETURN t.id AS tenantId, count(u) AS userCount
      ORDER BY userCount DESC
    `;
    
    return await this.neo4j.executeQuery(query);
  }

  // Sync Operations
  async syncUserToGraph(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error(`User ${userId} not found in PostgreSQL`);
    
    await this.createUserInGraph(user);
  }

  async syncAllUsersToGraph(): Promise<number> {
    const users = await this.getUsers();
    let synced = 0;
    
    for (const user of users) {
      await this.createUserInGraph(user);
      synced++;
    }
    
    return synced;
  }
}
