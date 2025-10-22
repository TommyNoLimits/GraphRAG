import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function viewConnectedData() {
  const neo4j = new Neo4jConnection();
  
  try {
    console.log('🔍 Connecting to Neo4j...');
    await neo4j.connect();
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      console.log('\n📊 1. All Node Types and Counts:');
      const nodeCounts = await session.run(`
        MATCH (n) 
        RETURN labels(n) as NodeType, count(n) as Count 
        ORDER BY Count DESC
      `);
      nodeCounts.records.forEach(record => {
        console.log(`   ${record.get('NodeType')}: ${record.get('Count')}`);
      });
      
      console.log('\n🔗 2. All Relationship Types and Counts:');
      const relCounts = await session.run(`
        MATCH ()-[r]->() 
        RETURN type(r) as RelationshipType, count(r) as Count 
        ORDER BY Count DESC
      `);
      relCounts.records.forEach(record => {
        console.log(`   ${record.get('RelationshipType')}: ${record.get('Count')}`);
      });
      
      console.log('\n👥 3. User-Centric Connected Data:');
      const userData = await session.run(`
        MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        OPTIONAL MATCH (u)-[:BELONGS_TO]->(t:Tenant)
        RETURN 
          u.first_name + ' ' + u.last_name as User,
          ue.investment_entity as Entity,
          uf.fund_name as Fund,
          uf.stage as FundStage,
          s.commitment_amount as Commitment,
          s.as_of_date as SubscriptionDate,
          t.name as Tenant
        ORDER BY User, Entity, Fund
        LIMIT 20
      `);
      
      console.log('   User | Entity | Fund | Stage | Commitment | Date | Tenant');
      console.log('   ' + '-'.repeat(100));
      userData.records.forEach(record => {
        const user = record.get('User') || 'N/A';
        const entity = record.get('Entity') || 'N/A';
        const fund = record.get('Fund') || 'N/A';
        const stage = record.get('FundStage') || 'N/A';
        const commitment = record.get('Commitment') || 'N/A';
        const date = record.get('SubscriptionDate') || 'N/A';
        const tenant = record.get('Tenant') || 'N/A';
        
        console.log(`   ${user} | ${entity} | ${fund} | ${stage} | ${commitment} | ${date} | ${tenant}`);
      });
      
      console.log('\n🏢 4. Tenant Data Summary:');
      const tenantData = await session.run(`
        MATCH (t:Tenant)
        OPTIONAL MATCH (t)<-[:BELONGS_TO]-(u:User)
        OPTIONAL MATCH (t)<-[:BELONGS_TO]-(ue:UserEntity)
        OPTIONAL MATCH (t)<-[:BELONGS_TO]-(uf:UserFund)
        OPTIONAL MATCH (t)<-[:BELONGS_TO]-(s:Subscription)
        RETURN t.name as Tenant,
               count(DISTINCT u) as Users,
               count(DISTINCT ue) as Entities,
               count(DISTINCT uf) as Funds,
               count(DISTINCT s) as Subscriptions
        ORDER BY Users DESC
        LIMIT 10
      `);
      
      console.log('   Tenant | Users | Entities | Funds | Subscriptions');
      console.log('   ' + '-'.repeat(60));
      tenantData.records.forEach(record => {
        const tenant = record.get('Tenant') || 'N/A';
        const users = record.get('Users') || 0;
        const entities = record.get('Entities') || 0;
        const funds = record.get('Funds') || 0;
        const subscriptions = record.get('Subscriptions') || 0;
        
        console.log(`   ${tenant} | ${users} | ${entities} | ${funds} | ${subscriptions}`);
      });
      
      console.log('\n💰 5. Investment Summary:');
      const investmentData = await session.run(`
        MATCH (u:User)-[:CONTROLS]->(ue:UserEntity)-[:INVESTS_IN]->(uf:UserFund)
        OPTIONAL MATCH (uf)-[:HAS_SUBSCRIPTION]->(s:Subscription)
        RETURN u.first_name + ' ' + u.last_name as User,
               count(DISTINCT ue) as Entities,
               count(DISTINCT uf) as Funds,
               sum(toFloat(s.commitment_amount)) as TotalCommitment
        ORDER BY TotalCommitment DESC
        LIMIT 10
      `);
      
      console.log('   User | Entities | Funds | Total Commitment');
      console.log('   ' + '-'.repeat(50));
      investmentData.records.forEach(record => {
        const user = record.get('User') || 'N/A';
        const entities = record.get('Entities') || 0;
        const funds = record.get('Funds') || 0;
        const commitment = record.get('TotalCommitment') || 0;
        
        console.log(`   ${user} | ${entities} | ${funds} | $${commitment}`);
      });
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error viewing connected data:', error.message);
  } finally {
    await neo4j.close();
  }
}

viewConnectedData();
