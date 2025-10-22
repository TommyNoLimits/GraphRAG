import { Neo4jConnection } from '../database/neo4j-connection';
import dotenv from 'dotenv';

dotenv.config();

async function fixTenantRelationships() {
  const neo4j = new Neo4jConnection();
  
  try {
    console.log('🔍 Connecting to Neo4j...');
    await neo4j.connect();
    
    const session = neo4j['driver']!.session({ database: 'neo4j' });
    
    try {
      console.log('🔧 Fixing tenant relationships to use consistent BELONGS_TO...');
      
      // Fix UserEntity relationships
      console.log('📝 Updating UserEntity relationships...');
      const userEntityResult = await session.run(`
        MATCH (ue:UserEntity)-[r:BELONGS_TO_TENANT]->(t:Tenant)
        CREATE (ue)-[:BELONGS_TO]->(t)
        DELETE r
        RETURN count(ue) as updated
      `);
      console.log(`✅ Updated ${userEntityResult.records[0].get('updated')} UserEntity relationships`);
      
      // Fix UserFund relationships
      console.log('📝 Updating UserFund relationships...');
      const userFundResult = await session.run(`
        MATCH (uf:UserFund)-[r:BELONGS_TO_TENANT]->(t:Tenant)
        CREATE (uf)-[:BELONGS_TO]->(t)
        DELETE r
        RETURN count(uf) as updated
      `);
      console.log(`✅ Updated ${userFundResult.records[0].get('updated')} UserFund relationships`);
      
      // Fix Subscription relationships
      console.log('📝 Updating Subscription relationships...');
      const subscriptionResult = await session.run(`
        MATCH (s:Subscription)-[r:BELONGS_TO_TENANT]->(t:Tenant)
        CREATE (s)-[:BELONGS_TO]->(t)
        DELETE r
        RETURN count(s) as updated
      `);
      console.log(`✅ Updated ${subscriptionResult.records[0].get('updated')} Subscription relationships`);
      
      // Verify the changes
      console.log('\n🔍 Verifying tenant relationships...');
      const verificationResult = await session.run(`
        MATCH ()-[r]->(:Tenant)
        RETURN type(r) as RelationshipType, count(r) as Count
        ORDER BY Count DESC
      `);
      
      console.log('📊 Current tenant relationships:');
      verificationResult.records.forEach(record => {
        console.log(`   ${record.get('RelationshipType')}: ${record.get('Count')}`);
      });
      
      // Check for any remaining BELONGS_TO_TENANT relationships
      const remainingResult = await session.run(`
        MATCH ()-[r:BELONGS_TO_TENANT]->()
        RETURN count(r) as remaining
      `);
      
      const remaining = remainingResult.records[0].get('remaining');
      if (remaining === 0) {
        console.log('✅ All BELONGS_TO_TENANT relationships have been converted to BELONGS_TO');
      } else {
        console.log(`⚠️  ${remaining} BELONGS_TO_TENANT relationships still remain`);
      }
      
    } finally {
      await session.close();
    }
    
  } catch (error: any) {
    console.error('❌ Error fixing tenant relationships:', error.message);
  } finally {
    await neo4j.close();
  }
}

fixTenantRelationships();
