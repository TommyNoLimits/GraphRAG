# Neo4j Queries for GraphRAG System

This guide contains comprehensive Cypher queries for exploring your migrated GraphRAG data in Neo4j.

## 📊 System Overview Queries

### 1. Complete System Statistics
```cypher
MATCH (n) 
RETURN labels(n)[0] as node_type, count(n) as count
ORDER BY count DESC
```

### 2. Relationship Overview
```cypher
MATCH (n)-[r]->(m)
RETURN labels(n)[0] as from_node, type(r) as relationship, labels(m)[0] as to_node, count(*) as count
ORDER BY count DESC
```

### 3. Tenant Distribution
```cypher
MATCH (t:Tenant)
OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(t)
OPTIONAL MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t)
RETURN t.id as tenant_id, 
       count(DISTINCT u) as user_count, 
       count(DISTINCT ue) as entity_count
ORDER BY user_count DESC
```

## 👥 User Queries

### 4. All Users with Details
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN u.id, u.username, u.email, u.first_name, u.last_name, 
       u.created_at, u.email_confirmed, t.id as tenant_id
ORDER BY u.created_at DESC
LIMIT 20
```

### 5. Users by Tenant
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
WHERE t.id = 'your-tenant-id-here'
RETURN u.first_name, u.last_name, u.email, u.username
ORDER BY u.last_name
```

### 6. User Count per Tenant
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN t.id as tenant_id, count(u) as user_count
ORDER BY user_count DESC
```

### 7. Users with Unconfirmed Emails
```cypher
MATCH (u:User) 
WHERE u.email_confirmed = false
RETURN u.username, u.email, u.first_name, u.last_name, u.created_at
ORDER BY u.created_at DESC
```

### 8. Recent User Registrations
```cypher
MATCH (u:User)
WHERE u.created_at > datetime() - duration("P30D")
RETURN u.first_name, u.last_name, u.email, u.created_at
ORDER BY u.created_at DESC
```

## 🏢 User Entity Queries

### 9. All User Entities
```cypher
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN ue.id, ue.investment_entity, ue.entity_allias, 
       ue.created_at, ue.updated_at, t.id as tenant_id
ORDER BY ue.created_at DESC
LIMIT 20
```

### 10. Entities by Tenant
```cypher
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
WHERE t.id = 'your-tenant-id-here'
RETURN ue.investment_entity, ue.entity_allias, ue.created_at
ORDER BY ue.investment_entity
```

### 11. Entity Count per Tenant
```cypher
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN t.id as tenant_id, count(ue) as entity_count
ORDER BY entity_count DESC
```

### 12. Popular Investment Entities
```cypher
MATCH (ue:UserEntity)
RETURN ue.investment_entity, count(*) as usage_count
ORDER BY usage_count DESC
LIMIT 10
```

### 13. Entities with Aliases
```cypher
MATCH (ue:UserEntity)
WHERE ue.entity_allias IS NOT NULL AND ue.entity_allias <> ''
RETURN ue.investment_entity, ue.entity_allias, ue.created_at
ORDER BY ue.investment_entity
```

## 🔍 Tenant Constraint Verification

### 14. Verify Tenant Constraints (Should return empty)
```cypher
MATCH (ue:UserEntity)
WITH ue.tenant_id as tenant, ue.investment_entity as entity, count(*) as count
WHERE count > 1
RETURN tenant, entity, count
```

### 15. Cross-Tenant Entity Analysis
```cypher
MATCH (ue:UserEntity)
WHERE ue.investment_entity CONTAINS "Robinhood"
RETURN ue.tenant_id, count(ue) as entity_count
ORDER BY entity_count DESC
```

### 16. Orphaned Entities Check
```cypher
MATCH (ue:UserEntity)
WHERE NOT (ue)-[:BELONGS_TO_TENANT]->()
RETURN count(ue) as orphaned_entities
```

## 🔗 Relationship Queries

### 17. Complete User-Tenant Network
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN u.first_name, u.last_name, u.email, t.id as tenant_id
ORDER BY t.id, u.last_name
```

### 18. Tenant-Entity Network
```cypher
MATCH (t:Tenant)<-[:BELONGS_TO_TENANT]-(ue:UserEntity)
RETURN t.id as tenant_id, collect(ue.investment_entity) as entities
ORDER BY t.id
```

### 19. User-Entity Relationships (Future)
```cypher
// This query will be useful when user-entity relationships are added
MATCH (u:User)-[:HAS_ENTITY]->(ue:UserEntity)
RETURN u.first_name, u.last_name, ue.investment_entity
LIMIT 10
```

### 7. Find Users by Email Domain
```cypher
MATCH (u:User)
WHERE u.email CONTAINS '@example.com'
RETURN u.first_name, u.last_name, u.email
```

### 8. Users with Specific Notification Preferences
```cypher
MATCH (u:User)
WHERE u.call_notifications = true AND u.distribution_notifications = true
RETURN u.first_name, u.last_name, u.email, u.phone_number
```

### 9. Find Users by Name Pattern
```cypher
MATCH (u:User)
WHERE u.first_name STARTS WITH 'J' OR u.last_name STARTS WITH 'S'
RETURN u.first_name, u.last_name, u.email
ORDER BY u.last_name
```

### 10. Users with MFA Enabled
```cypher
MATCH (u:User)
WHERE u.is_mfa_enabled = true OR u.two_factor_enabled = true
RETURN u.username, u.email, u.first_name, u.last_name
```

## Relationship Queries

### 11. User-Tenant Relationships
```cypher
MATCH (u:User)-[r:BELONGS_TO]->(t:Tenant)
RETURN u.username, u.email, t.id as tenant_id, type(r) as relationship_type
LIMIT 10
```

### 12. Find Orphaned Users (No Tenant)
```cypher
MATCH (u:User)
WHERE NOT (u)-[:BELONGS_TO]->()
RETURN u.id, u.username, u.email
```

### 13. Tenant Summary with User Counts
```cypher
MATCH (t:Tenant)
OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(t)
RETURN t.id as tenant_id, 
       count(u) as user_count,
       collect(u.username)[0..3] as sample_users
ORDER BY user_count DESC
```

## Data Quality Queries

### 14. Find Users with Missing Data
```cypher
MATCH (u:User)
WHERE u.email IS NULL OR u.first_name IS NULL OR u.last_name IS NULL
RETURN u.id, u.username, u.email, u.first_name, u.last_name
```

### 15. Duplicate Email Check
```cypher
MATCH (u:User)
WHERE u.email IS NOT NULL
WITH u.email as email, collect(u) as users
WHERE size(users) > 1
RETURN email, size(users) as duplicate_count, 
       [user IN users | user.username] as usernames
```

### 16. Users with Invalid Email Format
```cypher
MATCH (u:User)
WHERE u.email IS NOT NULL AND NOT u.email CONTAINS '@'
RETURN u.id, u.username, u.email
```

## Analytics Queries

### 17. User Activity Summary
```cypher
MATCH (u:User)
RETURN 
  count(u) as total_users,
  count(CASE WHEN u.email_confirmed = true THEN 1 END) as confirmed_users,
  count(CASE WHEN u.is_mfa_enabled = true THEN 1 END) as mfa_enabled_users,
  count(CASE WHEN u.lockout_enabled = true THEN 1 END) as lockout_enabled_users
```

### 18. Notification Preferences Summary
```cypher
MATCH (u:User)
RETURN 
  count(CASE WHEN u.call_notifications = true THEN 1 END) as call_notifications_enabled,
  count(CASE WHEN u.distribution_notifications = true THEN 1 END) as distribution_notifications_enabled,
  count(CASE WHEN u.statement_notifications = true THEN 1 END) as statement_notifications_enabled,
  count(CASE WHEN u.new_investment_notifications = true THEN 1 END) as investment_notifications_enabled
```

### 19. User Registration by Day of Week
```cypher
MATCH (u:User)
RETURN 
  u.created_at.weekday as day_of_week,
  count(u) as registrations
ORDER BY day_of_week
```

### 20. Top Email Domains
```cypher
MATCH (u:User)
WHERE u.email IS NOT NULL
WITH split(u.email, '@')[1] as domain, count(u) as user_count
RETURN domain, user_count
ORDER BY user_count DESC
LIMIT 10
```

## Sample Data Queries (for testing)

If you're using the sample data created by the demo script, try these:

### Sample Query 1: Find all users in tenant-001
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant {id: "tenant-001"})
RETURN u.first_name, u.last_name, u.email
```

### Sample Query 2: Find users with unconfirmed emails
```cypher
MATCH (u:User) WHERE u.email_confirmed = false
RETURN u.username, u.email
```

### Sample Query 3: Count users per tenant
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN t.id as tenant_id, count(u) as user_count
ORDER BY user_count DESC
```

## How to Use These Queries

1. **Open Neo4j Browser**: Go to http://localhost:7474
2. **Login**: Use username `neo4j` and password `password` (or your configured password)
3. **Copy and paste** any query into the query box
4. **Click the play button** to execute
5. **View results** in the table or graph visualization

## Tips

- Use `LIMIT` with large queries to avoid overwhelming results
- Add `ORDER BY` clauses to sort results meaningfully
- Use `WHERE` clauses to filter data effectively
- The graph visualization is great for exploring relationships
- Use `EXPLAIN` or `PROFILE` before queries to understand performance

## 📈 Analytics Queries

### 20. User Registration Trends
```cypher
MATCH (u:User)
RETURN date.truncate('month', u.created_at) as month, count(u) as registrations
ORDER BY month DESC
```

### 21. Entity Creation Trends
```cypher
MATCH (ue:UserEntity)
RETURN date.truncate('month', ue.created_at) as month, count(ue) as entities_created
ORDER BY month DESC
```

### 22. Tenant Growth Analysis
```cypher
MATCH (t:Tenant)
OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(t)
OPTIONAL MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t)
RETURN t.id as tenant_id,
       count(DISTINCT u) as users,
       count(DISTINCT ue) as entities,
       count(DISTINCT u) + count(DISTINCT ue) as total_activity
ORDER BY total_activity DESC
```

## 🔍 Search Queries

### 23. Search Users by Name
```cypher
MATCH (u:User)
WHERE u.first_name CONTAINS 'John' OR u.last_name CONTAINS 'Doe'
RETURN u.first_name, u.last_name, u.email, u.username
```

### 24. Search Entities by Name
```cypher
MATCH (ue:UserEntity)
WHERE ue.investment_entity CONTAINS 'Robinhood'
RETURN ue.investment_entity, ue.entity_allias, ue.tenant_id
```

### 25. Search by Email Domain
```cypher
MATCH (u:User)
WHERE u.email CONTAINS '@gmail.com'
RETURN u.first_name, u.last_name, u.email
ORDER BY u.last_name
```

## 🎨 Visualization Queries

### 26. Graph Visualization (Neo4j Browser)
```cypher
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 50
```

### 27. User-Tenant Visualization
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN u, t
LIMIT 25
```

### 28. Entity-Tenant Visualization
```cypher
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN ue, t
LIMIT 25
```

### 29. Complete Network Visualization
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)<-[:BELONGS_TO_TENANT]-(ue:UserEntity)
RETURN u, t, ue
LIMIT 20
```

## 🛠️ Maintenance Queries

### 30. Schema Information
```cypher
CALL db.schema.visualization()
```

### 31. Constraint Information
```cypher
SHOW CONSTRAINTS
```

### 32. Index Information
```cypher
SHOW INDEXES
```

### 33. Database Statistics
```cypher
CALL db.stats.retrieve('GRAPH COUNTS')
```

## 🚀 Performance Queries

### 34. Query Performance Analysis
```cypher
CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Query execution')
```

### 35. Memory Usage
```cypher
CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Memory')
```

## 📋 Data Export Queries

### 36. Export All Users
```cypher
MATCH (u:User)-[:BELONGS_TO]->(t:Tenant)
RETURN u.id, u.username, u.email, u.first_name, u.last_name, 
       u.created_at, u.updated_at, t.id as tenant_id
ORDER BY u.created_at DESC
```

### 37. Export All Entities
```cypher
MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t:Tenant)
RETURN ue.id, ue.investment_entity, ue.entity_allias,
       ue.created_at, ue.updated_at, t.id as tenant_id
ORDER BY ue.created_at DESC
```

### 38. Export Tenant Summary
```cypher
MATCH (t:Tenant)
OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(t)
OPTIONAL MATCH (ue:UserEntity)-[:BELONGS_TO_TENANT]->(t)
RETURN t.id as tenant_id,
       count(DISTINCT u) as user_count,
       count(DISTINCT ue) as entity_count,
       collect(DISTINCT u.first_name + ' ' + u.last_name)[0..5] as sample_users,
       collect(DISTINCT ue.investment_entity)[0..5] as sample_entities
ORDER BY user_count DESC
```

## 💡 Tips for Using These Queries

1. **Start with Overview**: Use queries 1-3 to understand your data
2. **Verify Constraints**: Always run query 14 to ensure data integrity
3. **Use LIMIT**: Add `LIMIT 10` to large result sets
4. **Test First**: Run queries in testing environment before production
5. **Monitor Performance**: Use queries 34-35 for performance monitoring

## 🔧 Customizing Queries

### Replace Placeholders
- `'your-tenant-id-here'` → Your actual tenant ID
- `'John'` → Your search term
- `'Robinhood'` → Your entity name
- `'@gmail.com'` → Your email domain

### Add Filters
```cypher
// Add date filters
WHERE u.created_at > datetime('2024-01-01')

// Add status filters  
WHERE u.email_confirmed = true

// Add tenant filters
WHERE t.id IN ['tenant-1', 'tenant-2']
```

---

**🎉 These queries will help you explore and analyze your GraphRAG data effectively!**
