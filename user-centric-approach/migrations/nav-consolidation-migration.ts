import { Neo4jConnection } from '../database/neo4j-connection';

/**
 * NAV Consolidation Migration
 * 
 * This migration consolidates multiple NAV nodes (one per date) into single NAV nodes
 * per fund/entity combination with date-value pairs stored as properties.
 * 
 * Before: Multiple NAV nodes per fund/entity
 * After: Single NAV node per fund/entity with nav_values object
 */

export class NAVConsolidationMigration {
  private neo4jConn: Neo4jConnection;

  constructor() {
    this.neo4jConn = new Neo4jConnection();
  }

  /**
   * Run the complete NAV consolidation migration
   */
  async migrate(): Promise<{ success: boolean; consolidatedCount: number; error?: string }> {
    try {
      console.log('🚀 Starting NAV Consolidation Migration...');
      
      const connected = await this.neo4jConn.connect();
      if (!connected) {
        return { success: false, consolidatedCount: 0, error: 'Failed to connect to Neo4j' };
      }

      // Step 1: Get all unique fund/entity combinations
      const combinations = await this.getFundEntityCombinations();
      console.log(`📊 Found ${combinations.length} unique fund/entity combinations`);

      // Step 2: Consolidate NAVs for each combination
      let consolidatedCount = 0;
      for (const combo of combinations) {
        const success = await this.consolidateNAVsForCombination(combo);
        if (success) {
          consolidatedCount++;
        }
      }

      console.log(`✅ Migration complete: Consolidated ${consolidatedCount} fund/entity combinations`);
      return { success: true, consolidatedCount };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { 
        success: false, 
        consolidatedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      await this.neo4jConn.close();
    }
  }

  /**
   * Get all unique fund_name + investment_entity + tenant_id combinations
   */
  private async getFundEntityCombinations(): Promise<Array<{fund_name: string, investment_entity: string, tenant_id: string}>> {
    const query = `
      MATCH (n:NAV)
      RETURN DISTINCT n.fund_name, n.investment_entity, n.tenant_id
      ORDER BY n.fund_name, n.investment_entity
    `;

    const result = await this.neo4jConn.executeQuery(query);
    return result.map(record => ({
      fund_name: record.get('n.fund_name'),
      investment_entity: record.get('n.investment_entity'),
      tenant_id: record.get('n.tenant_id')
    }));
  }

  /**
   * Consolidate all NAV nodes for a specific fund/entity combination
   */
  private async consolidateNAVsForCombination(combo: {fund_name: string, investment_entity: string, tenant_id: string}): Promise<boolean> {
    try {
      console.log(`🔄 Consolidating NAVs for ${combo.fund_name} / ${combo.investment_entity}`);

      // Get all NAV nodes for this combination
      const navQuery = `
        MATCH (n:NAV)
        WHERE n.fund_name = $fund_name 
          AND n.investment_entity = $investment_entity 
          AND n.tenant_id = $tenant_id
        RETURN n.id, n.as_of_date, n.nav, n.created_at, n.updated_at
        ORDER BY n.as_of_date ASC
      `;

      const navs = await this.neo4jConn.executeQuery(navQuery, combo);
      
      if (navs.length === 0) {
        console.log(`⚠️  No NAVs found for ${combo.fund_name} / ${combo.investment_entity}`);
        return false;
      }

      // Build nav_values object
      const navValues: Record<string, string> = {};
      let latestNav = '';
      let latestDate = '';
      let earliestCreatedAt = '';
      let latestUpdatedAt = '';

      for (const nav of navs) {
        const dateStr = nav.get('n.as_of_date');
        const navValue = nav.get('n.nav');
        
        navValues[dateStr] = navValue;
        
        // Track latest values
        if (!latestDate || dateStr > latestDate) {
          latestDate = dateStr;
          latestNav = navValue;
        }
        
        // Track timestamps
        const createdAt = nav.get('n.created_at');
        const updatedAt = nav.get('n.updated_at');
        
        if (!earliestCreatedAt || createdAt < earliestCreatedAt) {
          earliestCreatedAt = createdAt;
        }
        
        if (!latestUpdatedAt || updatedAt > latestUpdatedAt) {
          latestUpdatedAt = updatedAt;
        }
      }

      // Create consolidated NAV node
      const consolidatedId = `nav_${combo.fund_name.replace(/[^a-zA-Z0-9]/g, '_')}_${combo.investment_entity.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const createQuery = `
        CREATE (n:NAV {
          id: $id,
          tenant_id: $tenant_id,
          fund_name: $fund_name,
          investment_entity: $investment_entity,
          nav_values: $nav_values,
          latest_nav: $latest_nav,
          latest_date: $latest_date,
          nav_count: $nav_count,
          created_at: $created_at,
          updated_at: $updated_at
        })
        RETURN n.id
      `;

      await this.neo4jConn.executeQuery(createQuery, {
        id: consolidatedId,
        tenant_id: combo.tenant_id,
        fund_name: combo.fund_name,
        investment_entity: combo.investment_entity,
        nav_values: navValues,
        latest_nav: latestNav,
        latest_date: latestDate,
        nav_count: navs.length,
        created_at: earliestCreatedAt,
        updated_at: latestUpdatedAt
      });

      // Delete old NAV nodes
      const deleteQuery = `
        MATCH (n:NAV)
        WHERE n.fund_name = $fund_name 
          AND n.investment_entity = $investment_entity 
          AND n.tenant_id = $tenant_id
          AND n.id <> $new_id
        DETACH DELETE n
      `;

      await this.neo4jConn.executeQuery(deleteQuery, {
        ...combo,
        new_id: consolidatedId
      });

      console.log(`✅ Consolidated ${navs.length} NAV entries into single node: ${consolidatedId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to consolidate NAVs for ${combo.fund_name} / ${combo.investment_entity}:`, error);
      return false;
    }
  }

  /**
   * Verify the migration was successful
   */
  async verifyMigration(): Promise<{ success: boolean; stats: any; error?: string }> {
    try {
      const connected = await this.neo4jConn.connect();
      if (!connected) {
        return { success: false, stats: null, error: 'Failed to connect to Neo4j' };
      }

      // Get statistics about the new NAV structure
      const statsQuery = `
        MATCH (n:NAV)
        RETURN 
          count(n) as total_nav_nodes,
          avg(n.nav_count) as avg_nav_entries_per_node,
          max(n.nav_count) as max_nav_entries_per_node,
          min(n.nav_count) as min_nav_entries_per_node,
          collect(DISTINCT n.fund_name)[0..5] as sample_funds
      `;

      const result = await this.neo4jConn.executeQuery(statsQuery);
      const stats = result[0];

      console.log('📊 Migration Verification Results:');
      console.log(`   Total NAV nodes: ${stats.get('total_nav_nodes')}`);
      console.log(`   Average NAV entries per node: ${stats.get('avg_nav_entries_per_node')}`);
      console.log(`   Max NAV entries per node: ${stats.get('max_nav_entries_per_node')}`);
      console.log(`   Min NAV entries per node: ${stats.get('min_nav_entries_per_node')}`);
      console.log(`   Sample funds: ${stats.get('sample_funds')}`);

      return { success: true, stats };

    } catch (error) {
      console.error('❌ Verification failed:', error);
      return { 
        success: false, 
        stats: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      await this.neo4jConn.close();
    }
  }

  /**
   * Rollback the migration (restore original structure)
   */
  async rollback(): Promise<{ success: boolean; restoredCount: number; error?: string }> {
    try {
      console.log('🔄 Rolling back NAV consolidation...');
      
      const connected = await this.neo4jConn.connect();
      if (!connected) {
        return { success: false, restoredCount: 0, error: 'Failed to connect to Neo4j' };
      }

      // Get all consolidated NAV nodes
      const consolidatedQuery = `
        MATCH (n:NAV)
        WHERE n.nav_values IS NOT NULL
        RETURN n.id, n.tenant_id, n.fund_name, n.investment_entity, n.nav_values, n.created_at, n.updated_at
      `;

      const consolidatedNavs = await this.neo4jConn.executeQuery(consolidatedQuery);
      let restoredCount = 0;

      for (const nav of consolidatedNavs) {
        const navValues = nav.get('n.nav_values');
        const fundName = nav.get('n.fund_name');
        const investmentEntity = nav.get('n.investment_entity');
        const tenantId = nav.get('n.tenant_id');
        const createdAt = nav.get('n.created_at');
        const updatedAt = nav.get('n.updated_at');

        // Create individual NAV nodes for each date
        for (const [dateStr, navValue] of Object.entries(navValues)) {
          const individualId = `${nav.get('n.id')}_${dateStr}`;
          
          const createQuery = `
            CREATE (n:NAV {
              id: $id,
              tenant_id: $tenant_id,
              fund_name: $fund_name,
              investment_entity: $investment_entity,
              as_of_date: $as_of_date,
              nav: $nav,
              created_at: $created_at,
              updated_at: $updated_at
            })
          `;

          await this.neo4jConn.executeQuery(createQuery, {
            id: individualId,
            tenant_id: tenantId,
            fund_name: fundName,
            investment_entity: investmentEntity,
            as_of_date: dateStr,
            nav: navValue,
            created_at: createdAt,
            updated_at: updatedAt
          });

          restoredCount++;
        }

        // Delete the consolidated node
        const deleteQuery = `
          MATCH (n:NAV {id: $id})
          DETACH DELETE n
        `;

        await this.neo4jConn.executeQuery(deleteQuery, {
          id: nav.get('n.id')
        });
      }

      console.log(`✅ Rollback complete: Restored ${restoredCount} individual NAV nodes`);
      return { success: true, restoredCount };

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return { 
        success: false, 
        restoredCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      await this.neo4jConn.close();
    }
  }
}

// CLI execution
if (require.main === module) {
  const migration = new NAVConsolidationMigration();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migration.migrate()
        .then(result => {
          console.log('Migration result:', result);
          process.exit(result.success ? 0 : 1);
        });
      break;
      
    case 'verify':
      migration.verifyMigration()
        .then(result => {
          console.log('Verification result:', result);
          process.exit(result.success ? 0 : 1);
        });
      break;
      
    case 'rollback':
      migration.rollback()
        .then(result => {
          console.log('Rollback result:', result);
          process.exit(result.success ? 0 : 1);
        });
      break;
      
    default:
      console.log('Usage: node nav-consolidation-migration.js [migrate|verify|rollback]');
      process.exit(1);
  }
}
