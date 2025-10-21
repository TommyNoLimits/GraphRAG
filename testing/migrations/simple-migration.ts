import { Neo4jConnection } from './neo4j-connection';
import { PostgreSQLConnection } from './postgres-connection';

export interface SimpleUser {
  id: string;
  tenant_id: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SimpleNAV {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  nav: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SimpleSubscription {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  commitment_amount: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SimpleTransaction {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  transaction_amount: number;
  transaction_type: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SimpleMovement {
  id: number;
  tenant_id: string;
  fund_name: string;
  investment_entity: string;
  as_of_date: Date;
  transaction_amount: number;
  transaction_type: string;
  created_at?: Date;
  updated_at?: Date;
}

export class SimpleDataMigration {
  private neo4jConn: Neo4jConnection;
  private postgresConn: PostgreSQLConnection;

  constructor() {
    this.neo4jConn = new Neo4jConnection();
    this.postgresConn = new PostgreSQLConnection();
  }

  /**
   * Step 1: Create simple user nodes only
   */
  async createUserNodes(): Promise<{ success: boolean; userCount: number; error?: string }> {
    try {
      console.log('👤 Step 1: Creating user nodes...');

      // Test connections
      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, userCount: 0, error: 'Connection test failed' };
      }

      // Clear existing user data
      await this.neo4jConn.executeQuery('MATCH (u:User) DETACH DELETE u');

      // Get all users from PostgreSQL
      const users = await this.postgresConn.query(`
        SELECT id, tenant_id, username, email, first_name, last_name, created_at, updated_at
        FROM users 
        LIMIT 10
      `);

      console.log(`Found ${users.length} users in database`);

      // Create user nodes in Neo4j
      for (const user of users) {
        await this.neo4jConn.executeQuery(`
          CREATE (u:User {
            id: $id,
            tenant_id: $tenant_id,
            username: $username,
            email: $email,
            first_name: $first_name,
            last_name: $last_name,
            created_at: $created_at,
            updated_at: $updated_at
          })
        `, {
          id: user.id.toString(),
          tenant_id: user.tenant_id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
          updated_at: user.updated_at
        });

        console.log(`✅ Created user: ${user.first_name} ${user.last_name} (${user.email})`);
      }

      console.log(`✅ Step 1 Complete: Created ${users.length} user nodes`);
      return { success: true, userCount: users.length };

    } catch (error) {
      console.error('❌ Step 1 failed:', error);
      return { success: false, userCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Step 2: Add NAV nodes and connect to users
   */
  async addNAVNodes(): Promise<{ success: boolean; navCount: number; error?: string }> {
    try {
      console.log('📊 Step 2: Adding NAV nodes...');

      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, navCount: 0, error: 'Connection test failed' };
      }

      // Get NAVs from PostgreSQL
      const navs = await this.postgresConn.query(`
        SELECT id, tenant_id, fund_name, investment_entity, as_of_date, nav, created_at, updated_at
        FROM navs 
        LIMIT 50
      `);

      console.log(`Found ${navs.length} NAVs in database`);

      // Create NAV nodes and connect to users
      for (const nav of navs) {
        await this.neo4jConn.executeQuery(`
          MATCH (u:User {tenant_id: $tenant_id})
          CREATE (n:NAV {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            as_of_date: $as_of_date,
            nav_value: $nav_value,
            created_at: $created_at,
            updated_at: $updated_at
          })
          CREATE (u)-[:HAS_NAV]->(n)
        `, {
          id: nav.id,
          tenant_id: nav.tenant_id.toString(),
          fund_name: nav.fund_name,
          investment_entity: nav.investment_entity,
          as_of_date: nav.as_of_date,
          nav_value: parseFloat(nav.nav),
          created_at: nav.created_at,
          updated_at: nav.updated_at
        });
      }

      console.log(`✅ Step 2 Complete: Created ${navs.length} NAV nodes`);
      return { success: true, navCount: navs.length };

    } catch (error) {
      console.error('❌ Step 2 failed:', error);
      return { success: false, navCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Step 3: Add subscription nodes and connect to users
   */
  async addSubscriptionNodes(): Promise<{ success: boolean; subscriptionCount: number; error?: string }> {
    try {
      console.log('💰 Step 3: Adding subscription nodes...');

      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, subscriptionCount: 0, error: 'Connection test failed' };
      }

      // Get subscriptions from PostgreSQL
      const subscriptions = await this.postgresConn.query(`
        SELECT id, tenant_id, fund_name, investment_entity, as_of_date, commitment_amount, created_at, updated_at
        FROM subscriptions 
        LIMIT 50
      `);

      console.log(`Found ${subscriptions.length} subscriptions in database`);

      // Create subscription nodes and connect to users
      for (const sub of subscriptions) {
        await this.neo4jConn.executeQuery(`
          MATCH (u:User {tenant_id: $tenant_id})
          CREATE (s:Subscription {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            as_of_date: $as_of_date,
            commitment_amount: $commitment_amount,
            created_at: $created_at,
            updated_at: $updated_at
          })
          CREATE (u)-[:HAS_SUBSCRIPTION]->(s)
        `, {
          id: sub.id,
          tenant_id: sub.tenant_id.toString(),
          fund_name: sub.fund_name,
          investment_entity: sub.investment_entity,
          as_of_date: sub.as_of_date,
          commitment_amount: parseFloat(sub.commitment_amount),
          created_at: sub.created_at,
          updated_at: sub.updated_at
        });
      }

      console.log(`✅ Step 3 Complete: Created ${subscriptions.length} subscription nodes`);
      return { success: true, subscriptionCount: subscriptions.length };

    } catch (error) {
      console.error('❌ Step 3 failed:', error);
      return { success: false, subscriptionCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Step 4: Add transaction nodes and connect to users
   */
  async addTransactionNodes(): Promise<{ success: boolean; transactionCount: number; error?: string }> {
    try {
      console.log('💸 Step 4: Adding transaction nodes...');

      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, transactionCount: 0, error: 'Connection test failed' };
      }

      // Get transactions from PostgreSQL
      const transactions = await this.postgresConn.query(`
        SELECT id, tenant_id, fund_name, investment_entity, as_of_date, transaction_amount, transaction_type, created_at, updated_at
        FROM transactions 
        LIMIT 50
      `);

      console.log(`Found ${transactions.length} transactions in database`);

      // Create transaction nodes and connect to users
      for (const tx of transactions) {
        await this.neo4jConn.executeQuery(`
          MATCH (u:User {tenant_id: $tenant_id})
          CREATE (t:Transaction {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            as_of_date: $as_of_date,
            transaction_amount: $transaction_amount,
            transaction_type: $transaction_type,
            created_at: $created_at,
            updated_at: $updated_at
          })
          CREATE (u)-[:HAS_TRANSACTION]->(t)
        `, {
          id: tx.id,
          tenant_id: tx.tenant_id.toString(),
          fund_name: tx.fund_name,
          investment_entity: tx.investment_entity,
          as_of_date: tx.as_of_date,
          transaction_amount: parseFloat(tx.transaction_amount),
          transaction_type: tx.transaction_type,
          created_at: tx.created_at,
          updated_at: tx.updated_at
        });
      }

      console.log(`✅ Step 4 Complete: Created ${transactions.length} transaction nodes`);
      return { success: true, transactionCount: transactions.length };

    } catch (error) {
      console.error('❌ Step 4 failed:', error);
      return { success: false, transactionCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Step 5: Add movement nodes and connect to users
   */
  async addMovementNodes(): Promise<{ success: boolean; movementCount: number; error?: string }> {
    try {
      console.log('🔄 Step 5: Adding movement nodes...');

      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, movementCount: 0, error: 'Connection test failed' };
      }

      // Get movements from PostgreSQL
      const movements = await this.postgresConn.query(`
        SELECT id, tenant_id, fund_name, investment_entity, as_of_date, transaction_amount, transaction_type, created_at, updated_at
        FROM movements 
        LIMIT 50
      `);

      console.log(`Found ${movements.length} movements in database`);

      // Create movement nodes and connect to users
      for (const mov of movements) {
        await this.neo4jConn.executeQuery(`
          MATCH (u:User {tenant_id: $tenant_id})
          CREATE (m:Movement {
            id: $id,
            tenant_id: $tenant_id,
            fund_name: $fund_name,
            investment_entity: $investment_entity,
            as_of_date: $as_of_date,
            transaction_amount: $transaction_amount,
            transaction_type: $transaction_type,
            created_at: $created_at,
            updated_at: $updated_at
          })
          CREATE (u)-[:HAS_MOVEMENT]->(m)
        `, {
          id: mov.id,
          tenant_id: mov.tenant_id.toString(),
          fund_name: mov.fund_name,
          investment_entity: mov.investment_entity,
          as_of_date: mov.as_of_date,
          transaction_amount: parseFloat(mov.transaction_amount),
          transaction_type: mov.transaction_type,
          created_at: mov.created_at,
          updated_at: mov.updated_at
        });
      }

      console.log(`✅ Step 5 Complete: Created ${movements.length} movement nodes`);
      return { success: true, movementCount: movements.length };

    } catch (error) {
      console.error('❌ Step 5 failed:', error);
      return { success: false, movementCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Step 6: Create simple calculations from the data
   */
  async createSimpleCalculations(): Promise<{ success: boolean; calculationCount: number; error?: string }> {
    try {
      console.log('🧮 Step 6: Creating simple calculations...');

      const neo4jConnected = await this.neo4jConn.connect();
      const postgresConnected = await this.postgresConn.testConnection();

      if (!neo4jConnected || !postgresConnected) {
        return { success: false, calculationCount: 0, error: 'Connection test failed' };
      }

      // Get user summary data
      const userSummaries = await this.neo4jConn.executeQuery(`
        MATCH (u:User)
        OPTIONAL MATCH (u)-[:HAS_NAV]->(n:NAV)
        OPTIONAL MATCH (u)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        OPTIONAL MATCH (u)-[:HAS_TRANSACTION]->(t:Transaction)
        OPTIONAL MATCH (u)-[:HAS_MOVEMENT]->(m:Movement)
        RETURN u.id as user_id,
               u.first_name,
               u.last_name,
               count(DISTINCT n) as nav_count,
               sum(n.nav_value) as total_nav,
               count(DISTINCT s) as subscription_count,
               sum(s.commitment_amount) as total_commitments,
               count(DISTINCT t) as transaction_count,
               sum(t.transaction_amount) as total_transactions,
               count(DISTINCT m) as movement_count,
               sum(m.transaction_amount) as total_movements
      `);

      let calculationCount = 0;

      for (const summary of userSummaries) {
        // Create calculation nodes for each user
        const calculations = [
          {
            name: 'total_nav',
            formula: 'SUM(nav_value)',
            value: summary.total_nav || 0,
            description: 'Total Net Asset Value across all funds'
          },
          {
            name: 'total_commitments',
            formula: 'SUM(commitment_amount)',
            value: summary.total_commitments || 0,
            description: 'Total fund commitments'
          },
          {
            name: 'total_transactions',
            formula: 'SUM(transaction_amount)',
            value: summary.total_transactions || 0,
            description: 'Total transaction volume'
          },
          {
            name: 'total_movements',
            formula: 'SUM(movement_amount)',
            value: summary.total_movements || 0,
            description: 'Total movement volume'
          }
        ];

        for (const calc of calculations) {
          await this.neo4jConn.executeQuery(`
            MATCH (u:User {id: $user_id})
            CREATE (c:Calculation {
              id: $calc_id,
              calculation_name: $name,
              formula: $formula,
              value: $value,
              description: $description,
              calculated_at: datetime()
            })
            CREATE (u)-[:HAS_CALCULATION]->(c)
          `, {
            user_id: summary.user_id,
            calc_id: `calc_${summary.user_id}_${calc.name}`,
            name: calc.name,
            formula: calc.formula,
            value: calc.value,
            description: calc.description
          });

          calculationCount++;
        }

        console.log(`✅ Created calculations for ${summary.first_name} ${summary.last_name}:`);
        console.log(`   - Total NAV: $${(summary.total_nav || 0).toLocaleString()}`);
        console.log(`   - Total Commitments: $${(summary.total_commitments || 0).toLocaleString()}`);
        console.log(`   - Total Transactions: $${(summary.total_transactions || 0).toLocaleString()}`);
        console.log(`   - Total Movements: $${(summary.total_movements || 0).toLocaleString()}`);
      }

      console.log(`✅ Step 6 Complete: Created ${calculationCount} calculation nodes`);
      return { success: true, calculationCount };

    } catch (error) {
      console.error('❌ Step 6 failed:', error);
      return { success: false, calculationCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      await this.neo4jConn.close();
      await this.postgresConn.close();
    }
  }

  /**
   * Run all steps in sequence
   */
  async runAllSteps(): Promise<{
    success: boolean;
    summary: {
      users: number;
      navs: number;
      subscriptions: number;
      transactions: number;
      movements: number;
      calculations: number;
    };
    error?: string;
  }> {
    console.log('🚀 Starting Simple Data Migration - Step by Step\n');

    const results = {
      users: 0,
      navs: 0,
      subscriptions: 0,
      transactions: 0,
      movements: 0,
      calculations: 0
    };

    try {
      // Step 1: Users
      const userResult = await this.createUserNodes();
      if (!userResult.success) {
        return { success: false, summary: results, error: userResult.error || 'User migration failed' };
      }
      results.users = userResult.userCount;

      // Step 2: NAVs
      const navResult = await this.addNAVNodes();
      if (!navResult.success) {
        return { success: false, summary: results, error: navResult.error || 'NAV migration failed' };
      }
      results.navs = navResult.navCount;

      // Step 3: Subscriptions
      const subResult = await this.addSubscriptionNodes();
      if (!subResult.success) {
        return { success: false, summary: results, error: subResult.error || 'Subscription migration failed' };
      }
      results.subscriptions = subResult.subscriptionCount;

      // Step 4: Transactions
      const txResult = await this.addTransactionNodes();
      if (!txResult.success) {
        return { success: false, summary: results, error: txResult.error || 'Transaction migration failed' };
      }
      results.transactions = txResult.transactionCount;

      // Step 5: Movements
      const movResult = await this.addMovementNodes();
      if (!movResult.success) {
        return { success: false, summary: results, error: movResult.error || 'Movement migration failed' };
      }
      results.movements = movResult.movementCount;

      // Step 6: Calculations
      const calcResult = await this.createSimpleCalculations();
      if (!calcResult.success) {
        return { success: false, summary: results, error: calcResult.error || 'Calculation creation failed' };
      }
      results.calculations = calcResult.calculationCount;

      console.log('\n✅ All Steps Complete!');
      console.log('📊 Migration Summary:');
      console.log(`   - Users: ${results.users}`);
      console.log(`   - NAVs: ${results.navs}`);
      console.log(`   - Subscriptions: ${results.subscriptions}`);
      console.log(`   - Transactions: ${results.transactions}`);
      console.log(`   - Movements: ${results.movements}`);
      console.log(`   - Calculations: ${results.calculations}`);

      return { success: true, summary: results };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, summary: results, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
