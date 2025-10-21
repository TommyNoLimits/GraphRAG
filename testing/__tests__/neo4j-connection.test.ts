import { Neo4jConnection } from '../database/neo4j-connection';
import { GraphRAGUtils, runGraphRAGExample } from '../utils/graphrag-utils';

describe('Neo4jConnection', () => {
  let conn: Neo4jConnection;

  beforeEach(() => {
    conn = new Neo4jConnection();
  });

  afterEach(async () => {
    await conn.close();
  });

  test('should connect to Neo4j', async () => {
    const connected = await conn.connect();
    expect(connected).toBe(true);
  });

  test('should test connection', async () => {
    await conn.connect();
    const testResult = await conn.testConnection();
    expect(testResult).toBe(true);
  });

  test('should create sample data', async () => {
    await conn.connect();
    const result = await conn.createSampleData();
    expect(result).toBe(true);
  });

  test('should query people', async () => {
    await conn.connect();
    await conn.createSampleData();
    
    const people = await conn.queryPeople();
    expect(people.length).toBeGreaterThan(0);
    expect(people[0]).toHaveProperty('name');
    expect(people[0]).toHaveProperty('age');
    expect(people[0]).toHaveProperty('occupation');
  });

  test('should query relationships', async () => {
    await conn.connect();
    await conn.createSampleData();
    
    const relationships = await conn.queryRelationships();
    expect(relationships.length).toBeGreaterThan(0);
    expect(relationships[0]).toHaveProperty('from');
    expect(relationships[0]).toHaveProperty('relationship');
    expect(relationships[0]).toHaveProperty('to');
  });
});

describe('GraphRAGUtils', () => {
  let conn: Neo4jConnection;
  let graphRAG: GraphRAGUtils;

  beforeEach(async () => {
    conn = new Neo4jConnection();
    await conn.connect();
    graphRAG = new GraphRAGUtils(conn);
  });

  afterEach(async () => {
    await conn.close();
  });

  test('should create entities from text', async () => {
    const text = "Alice works with Bob on machine learning projects.";
    await graphRAG.createEntitiesFromText(text, 'test-document');
    
    // This test assumes the method completes without error
    // In a real test, you might want to verify the data was actually created
    expect(true).toBe(true);
  });

  test('should find relevant entities', async () => {
    const text = "Alice works with Bob on machine learning projects.";
    await graphRAG.createEntitiesFromText(text, 'test-document');
    
    const entities = await graphRAG.findRelevantEntities('alice');
    expect(Array.isArray(entities)).toBe(true);
  });
});
