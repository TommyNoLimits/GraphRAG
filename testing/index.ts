import { Neo4jConnection } from './neo4j-connection';
import { PostgreSQLConnection } from './postgres-connection';
import { SimpleDataMigration } from './simple-migration';

/**
 * Simple Step-by-Step GraphRAG Migration
 * Builds knowledge graph step by step: Users → NAVs → Subscriptions → Transactions → Movements → Calculations
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Simple Step-by-Step GraphRAG Migration...\n');

  // Initialize migration
  const migration = new SimpleDataMigration();

  try {
    // Run all steps in sequence
    const result = await migration.runAllSteps();
    
    if (!result.success) {
      console.log('❌ Migration failed:', result.error);
      return;
    }

    console.log('\n🔍 Testing Graph Queries...\n');

    // Test some simple queries
    const neo4jConn = new Neo4jConnection();
    await neo4jConn.connect();

    // Query 1: Show all users and their data counts
    console.log('👥 Users and their data:');
    const userData = await neo4jConn.executeQuery(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:HAS_NAV]->(n:NAV)
      OPTIONAL MATCH (u)-[:HAS_SUBSCRIPTION]->(s:Subscription)
      OPTIONAL MATCH (u)-[:HAS_TRANSACTION]->(t:Transaction)
      OPTIONAL MATCH (u)-[:HAS_MOVEMENT]->(m:Movement)
      RETURN u.first_name, u.last_name, u.email,
             count(DISTINCT n) as nav_count,
             count(DISTINCT s) as subscription_count,
             count(DISTINCT t) as transaction_count,
             count(DISTINCT m) as movement_count
      ORDER BY nav_count DESC
    `);

    userData.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`    NAVs: ${user.nav_count}, Subscriptions: ${user.subscription_count}`);
      console.log(`    Transactions: ${user.transaction_count}, Movements: ${user.movement_count}`);
    });

    // Query 2: Show calculations for each user
    console.log('\n🧮 User calculations:');
    const calculations = await neo4jConn.executeQuery(`
      MATCH (u:User)-[:HAS_CALCULATION]->(c:Calculation)
      RETURN u.first_name, u.last_name, c.calculation_name, c.value, c.description
      ORDER BY u.first_name, c.calculation_name
    `);

    calculations.forEach(calc => {
      console.log(`  - ${calc.first_name} ${calc.last_name}: ${calc.calculation_name} = $${calc.value.toLocaleString()}`);
      console.log(`    ${calc.description}`);
    });

    // Query 3: Show fund activity
    console.log('\n💰 Fund activity summary:');
    const fundActivity = await neo4jConn.executeQuery(`
      MATCH (n:NAV)
      WITH n.fund_name as fund_name, 
           count(n) as nav_count, 
           avg(n.nav_value) as avg_nav,
           max(n.nav_value) as max_nav,
           min(n.nav_value) as min_nav
      RETURN fund_name, nav_count, avg_nav, max_nav, min_nav
      ORDER BY nav_count DESC
      LIMIT 10
    `);

    fundActivity.forEach(fund => {
      console.log(`  - ${fund.fund_name}: ${fund.nav_count} NAVs`);
      console.log(`    Avg: $${fund.avg_nav.toFixed(2)}, Max: $${fund.max_nav.toFixed(2)}, Min: $${fund.min_nav.toFixed(2)}`);
    });

    console.log('\n✅ Simple GraphRAG demonstration completed!');
    console.log('\n💡 What was built:');
    console.log('  ✅ User nodes with profile information');
    console.log('  ✅ NAV nodes connected to users');
    console.log('  ✅ Subscription nodes connected to users');
    console.log('  ✅ Transaction nodes connected to users');
    console.log('  ✅ Movement nodes connected to users');
    console.log('  ✅ Calculation nodes with formulas and results');

    console.log('\n🔍 Next steps:');
    console.log('  - Explore data in Neo4j Browser: http://localhost:7474');
    console.log('  - Add more sophisticated calculations (IRR, Multiple, etc.)');
    console.log('  - Create LLM query interface');
    console.log('  - Build fund-to-fund relationships');
    console.log('  - Add time-series analysis');

    await neo4jConn.close();

  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };

