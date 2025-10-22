// production/examples/user-service-example.ts
import { UserService } from '../services/UserService';

async function demonstrateUserService() {
  const userService = new UserService();
  
  try {
    await userService.initialize();
    console.log('✅ UserService initialized');

    // 1. Get all users from PostgreSQL
    console.log('\n📊 All Users (PostgreSQL):');
    const allUsers = await userService.getAllUsers(5);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // 2. Get users from Neo4j with tenant relationships
    console.log('\n🕸️ Users with Tenants (Neo4j):');
    const usersWithTenants = await userService.getUsersFromGraph(5);
    usersWithTenants.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Tenant: ${user.tenant.id}`);
      console.log(`      Email: ${user.email}`);
    });

    // 3. Search users by pattern
    console.log('\n🔍 Search Users by Pattern:');
    const searchResults = await userService.searchUsers('test');
    console.log(`Found ${searchResults.length} users matching 'test'`);

    // 4. Get tenant statistics
    console.log('\n📈 Tenant Statistics:');
    const tenantStats = await userService.getTenantStatistics();
    tenantStats.forEach(stat => {
      console.log(`   Tenant ${stat.tenantId}: ${stat.userCount} users`);
    });

    // 5. Get users by tenant
    if (tenantStats.length > 0) {
      const firstTenant = tenantStats[0].tenantId;
      console.log(`\n👥 Users in Tenant ${firstTenant}:`);
      const tenantUsers = await userService.findUsersByTenant(firstTenant);
      tenantUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      });
    }

    // 6. GraphRAG queries
    if (allUsers.length > 0) {
      const firstUser = allUsers[0];
      console.log(`\n🔗 User Network for ${firstUser.first_name} ${firstUser.last_name}:`);
      
      try {
        const userNetwork = await userService.getUserNetwork(firstUser.id, 1);
        console.log(`   Network depth 1: ${userNetwork.length} connections`);
      } catch (error) {
        console.log('   No network data available yet');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await userService.cleanup();
    console.log('\n🔌 UserService cleaned up');
  }
}

// Run the example
if (require.main === module) {
  demonstrateUserService().catch(console.error);
}
