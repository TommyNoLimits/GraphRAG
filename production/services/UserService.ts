// production/services/UserService.ts
import { DataAccessLayer, User, UserWithTenant } from '../data/DataAccessLayer';

export class UserService {
  private dal: DataAccessLayer;

  constructor() {
    this.dal = new DataAccessLayer();
  }

  async initialize() {
    await this.dal.connect();
  }

  async cleanup() {
    await this.dal.close();
  }

  // CRUD Operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    // Create in PostgreSQL (source of truth)
    const user = await this.dal.createUser(userData);
    
    // Sync to Neo4j
    await this.dal.createUserInGraph(user);
    
    return user;
  }

  async getUserById(id: string, useGraph: boolean = false): Promise<UserWithTenant | null> {
    if (useGraph) {
      return await this.dal.getUserFromGraphById(id);
    } else {
      const user = await this.dal.getUserById(id);
      if (!user) return null;
      
      // Get tenant info from graph
      const usersWithTenant = await this.dal.findUsersByTenant(user.tenant_id);
      const tenant = usersWithTenant[0]?.tenant;
      
      return { ...user, tenant: tenant || { id: user.tenant_id } };
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // Update in PostgreSQL (source of truth)
    const user = await this.dal.updateUser(id, updates);
    
    // Sync to Neo4j
    await this.dal.updateUserInGraph(id, updates);
    
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Delete from PostgreSQL
    const deleted = await this.dal.deleteUser(id);
    
    if (deleted) {
      // Delete from Neo4j
      await this.dal.deleteUserFromGraph(id);
    }
    
    return deleted;
  }

  // Query Operations
  async getAllUsers(limit?: number): Promise<User[]> {
    return await this.dal.getUsers(limit);
  }

  async getUsersFromGraph(limit?: number): Promise<UserWithTenant[]> {
    return await this.dal.getUsersFromGraph(limit);
  }

  async findUsersByTenant(tenantId: string): Promise<User[]> {
    return await this.dal.findUsersByTenant(tenantId);
  }

  async searchUsers(pattern: string): Promise<UserWithTenant[]> {
    return await this.dal.findUsersByPattern(pattern);
  }

  async getTenantStatistics(): Promise<{tenantId: string, userCount: number}[]> {
    return await this.dal.getTenantUserCounts();
  }

  // Sync Operations
  async syncUserToGraph(userId: string): Promise<void> {
    await this.dal.syncUserToGraph(userId);
  }

  async syncAllUsersToGraph(): Promise<number> {
    return await this.dal.syncAllUsersToGraph();
  }

  // GraphRAG-specific queries
  async getUsersWithRelationships(userId: string): Promise<any> {
    const query = `
      MATCH (u:User {id: $userId})-[:BELONGS_TO]->(t:Tenant)
      OPTIONAL MATCH (u)-[r]->(related)
      RETURN u, t, collect({rel: r, node: related}) AS relationships
    `;
    
    return await this.dal['neo4j'].executeQuery(query, { userId });
  }

  async getUserNetwork(userId: string, depth: number = 2): Promise<any> {
    const query = `
      MATCH path = (u:User {id: $userId})-[*1..${depth}]-(connected)
      RETURN path
      LIMIT 100
    `;
    
    return await this.dal['neo4j'].executeQuery(query, { userId });
  }

  async getTenantCollaborationNetwork(tenantId: string): Promise<any> {
    const query = `
      MATCH (u:User)-[:BELONGS_TO]->(t:Tenant {id: $tenantId})
      OPTIONAL MATCH (u)-[r]-(other)
      WHERE other:User OR other:Tenant
      RETURN u, t, collect({rel: r, node: other}) AS network
    `;
    
    return await this.dal['neo4j'].executeQuery(query, { tenantId });
  }
}
