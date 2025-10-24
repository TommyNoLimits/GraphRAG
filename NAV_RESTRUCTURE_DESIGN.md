# NAV Data Structure Restructuring Design

## Problem Statement
Currently, we have one NAV node per date, which creates many duplicate nodes for the same fund/entity combination. This is inefficient and makes queries more complex.

## Proposed Solution: Consolidated NAV Nodes

### New NAV Node Structure
```cypher
{
  id: "nav_{fund_name}_{investment_entity}",  // Composite key
  tenant_id: "tenant_id",
  fund_name: "Fund Name",
  investment_entity: "Entity Name",
  
  // Historical NAV data as key-value pairs
  nav_values: {
    "2023-01-01": "100.00",
    "2023-02-01": "105.00",
    "2023-03-01": "110.00"
  },
  
  // Quick access fields
  latest_nav: "110.00",
  latest_date: "2023-03-01",
  nav_count: 3,
  
  // Metadata
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-03-01T00:00:00Z"
}
```

## Benefits

### 1. **Storage Efficiency**
- Reduces node count from N dates to 1 node per fund/entity
- Eliminates duplicate fund_name and investment_entity data
- Reduces relationship complexity

### 2. **Query Performance**
- Single node lookup instead of multiple MATCH operations
- Easier aggregation queries
- Better indexing strategy

### 3. **LLM Understanding**
- Clearer data structure for AI to interpret
- Easier to generate focused queries
- More intuitive for natural language processing

## Query Patterns

### Current Queries (Multiple Nodes)
```cypher
// Get all NAVs for a fund
MATCH (n:NAV) 
WHERE n.fund_name = "Fund A" 
RETURN n.as_of_date, n.nav 
ORDER BY n.as_of_date

// Get latest NAV
MATCH (n:NAV) 
WHERE n.fund_name = "Fund A" 
RETURN n.nav, n.as_of_date 
ORDER BY n.as_of_date DESC 
LIMIT 1
```

### New Queries (Consolidated Node)
```cypher
// Get all NAVs for a fund
MATCH (n:NAV) 
WHERE n.fund_name = "Fund A" 
RETURN n.nav_values, n.latest_nav, n.latest_date

// Get NAV for specific date
MATCH (n:NAV) 
WHERE n.fund_name = "Fund A" 
RETURN n.nav_values["2023-02-01"] as nav_value

// Get latest NAV
MATCH (n:NAV) 
WHERE n.fund_name = "Fund A" 
RETURN n.latest_nav, n.latest_date
```

## LLM Schema Description

### Updated Schema for AI
```
NAV: {
  id: "unique identifier",
  tenant_id: "tenant identifier", 
  fund_name: "fund name",
  investment_entity: "entity name",
  nav_values: "object with date->value pairs (e.g., {'2023-01-01': '100.00'})",
  latest_nav: "most recent NAV value",
  latest_date: "most recent NAV date", 
  nav_count: "number of historical NAV entries",
  created_at: "creation timestamp",
  updated_at: "last update timestamp"
}

IMPORTANT NAV QUERY PATTERNS:
- Use n.nav_values["YYYY-MM-DD"] to get NAV for specific date
- Use n.latest_nav for most recent NAV value
- Use n.latest_date for most recent NAV date
- Use n.nav_count to know how many historical entries exist
- nav_values is a map/object, not a simple property
```

## Migration Strategy

### Phase 1: Schema Update
1. Update schema definitions
2. Create new NAV node structure
3. Update GraphRAG service prompts

### Phase 2: Data Migration
1. Group existing NAV nodes by fund_name + investment_entity
2. Consolidate into new structure
3. Preserve all historical data

### Phase 3: Testing & Validation
1. Test all existing queries work with new structure
2. Validate LLM generates correct queries
3. Performance testing

## Implementation Plan

1. **Design Phase** ✅ (Current)
2. **Schema Updates** (Next)
3. **Migration Script** 
4. **GraphRAG Updates**
5. **Testing & Validation**

## Considerations

### Pros
- More efficient storage
- Simpler queries
- Better LLM understanding
- Easier maintenance

### Cons
- Migration complexity
- Need to update all existing queries
- Potential performance impact on large nav_values objects

### Mitigation
- Gradual migration approach
- Comprehensive testing
- Fallback to old structure if needed
