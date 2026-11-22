import neo4j, { type Driver, type Record as Neo4jRecord } from 'neo4j-driver'

export type Neo4jGraphNode = {
  id: string
  type: string
  properties: Record<string, string | number | boolean | null>
  createdAt: string
  updatedAt: string
}

export type Neo4jGraphRelationship = {
  sourceId: string
  targetId: string
  type: string
  properties: Record<string, string | number | boolean | null>
  createdAt?: string
}

export class Neo4jGraphStore {
  private readonly driver: Driver

  constructor(
    uri = process.env.NEO4J_URI ?? 'neo4j://localhost:7687',
    user = process.env.NEO4J_USER ?? 'neo4j',
    password = process.env.NEO4J_PASSWORD ?? '',
  ) {
    if (!password) throw new Error('NEO4J_PASSWORD is required when GRAPH_STORE=neo4j')
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: Number(process.env.NEO4J_MAX_POOL_SIZE ?? 50),
      connectionTimeout: Number(process.env.NEO4J_CONNECTION_TIMEOUT_MS ?? 10000),
      encrypted: process.env.NEO4J_ENCRYPTED === 'true',
    })
  }

  async verifyConnection() {
    await this.driver.verifyConnectivity()
    const session = this.driver.session()
    try {
      await session.run('CREATE CONSTRAINT aria_entity_id IF NOT EXISTS FOR (node:Entity) REQUIRE node.id IS UNIQUE')
      await session.run('CREATE INDEX aria_entity_type IF NOT EXISTS FOR (node:Entity) ON (node.type)')
    } finally {
      await session.close()
    }
    return true
  }

  async listNodes(limit = 100): Promise<Neo4jGraphNode[]> {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (node:Entity)
        RETURN node.id AS id, node.type AS type, node.propertiesJson AS propertiesJson,
          toString(node.createdAt) AS createdAt, toString(node.updatedAt) AS updatedAt
        ORDER BY node.id LIMIT $limit
      `, { limit: neo4j.int(Math.min(Math.max(limit, 1), 500)) })
      return result.records.map((record) => this.toNode(record))
    } finally {
      await session.close()
    }
  }

  async getNode(id: string) {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (node:Entity {id: $id})
        RETURN node.id AS id, node.type AS type, node.propertiesJson AS propertiesJson,
          toString(node.createdAt) AS createdAt, toString(node.updatedAt) AS updatedAt
      `, { id })
      return result.records[0] ? this.toNode(result.records[0]) : null
    } finally {
      await session.close()
    }
  }

  async listRelationships(limit = 500): Promise<Neo4jGraphRelationship[]> {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (source:Entity)-[relationship:RELATES]->(target:Entity)
        RETURN source.id AS sourceId, relationship.type AS type, target.id AS targetId,
          relationship.propertiesJson AS propertiesJson, toString(relationship.createdAt) AS createdAt
        ORDER BY source.id, target.id LIMIT $limit
      `, { limit: neo4j.int(Math.min(Math.max(limit, 1), 1000)) })
      return result.records.map((record) => ({
        sourceId: String(record.get('sourceId')),
        targetId: String(record.get('targetId')),
        type: String(record.get('type')),
        properties: parseProperties(record.get('propertiesJson')),
        createdAt: String(record.get('createdAt') ?? ''),
      }))
    } finally {
      await session.close()
    }
  }

  async upsertNode(input: { id: string; type: string; properties?: Record<string, string | number | boolean | null> }) {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MERGE (node:Entity {id: $id})
        ON CREATE SET node.createdAt = datetime()
        SET node.type = $type, node.propertiesJson = $propertiesJson, node.updatedAt = datetime()
        RETURN node.id AS id, node.type AS type, node.propertiesJson AS propertiesJson,
          toString(node.createdAt) AS createdAt, toString(node.updatedAt) AS updatedAt
      `, { id: input.id, type: input.type, propertiesJson: JSON.stringify(input.properties ?? {}) })
      return this.toNode(result.records[0])
    } finally {
      await session.close()
    }
  }

  async createRelationship(input: Neo4jGraphRelationship) {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (source:Entity {id: $sourceId}), (target:Entity {id: $targetId})
        MERGE (source)-[relationship:RELATES {type: $type}]->(target)
        SET relationship.propertiesJson = $propertiesJson, relationship.createdAt = datetime()
        RETURN source.id AS sourceId, relationship.type AS type, target.id AS targetId,
          relationship.propertiesJson AS propertiesJson, toString(relationship.createdAt) AS createdAt
      `, {
        sourceId: input.sourceId,
        targetId: input.targetId,
        type: input.type,
        propertiesJson: JSON.stringify(input.properties ?? {}),
      })
      if (!result.records[0]) throw new Error('source and target graph nodes must exist')
      return {
        sourceId: String(result.records[0].get('sourceId')),
        targetId: String(result.records[0].get('targetId')),
        type: String(result.records[0].get('type')),
        properties: parseProperties(result.records[0].get('propertiesJson')),
        createdAt: String(result.records[0].get('createdAt') ?? ''),
      }
    } finally {
      await session.close()
    }
  }

  async deleteRelationship(input: { sourceId: string; type: string; targetId: string }) {
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (source:Entity {id: $sourceId})-[relationship:RELATES {type: $type}]->(target:Entity {id: $targetId})
        DELETE relationship
        RETURN count(relationship) AS deleted
      `, input)
      return Number(result.records[0]?.get('deleted') ?? 0) > 0
    } finally {
      await session.close()
    }
  }

  async deleteNode(id: string) {
    const session = this.driver.session()
    try {
      const result = await session.run('MATCH (node:Entity {id: $id}) DETACH DELETE node RETURN count(node) AS deleted', { id })
      return Number(result.records[0]?.get('deleted') ?? 0) > 0
    } finally {
      await session.close()
    }
  }

  async queryPaths(startId: string, maxHops = 2) {
    const depthLimit = Math.min(Math.max(maxHops, 1), 2)
    const relationships = await this.listRelationships()
    const paths: Array<{ nodes: string[]; relationships: string[] }> = []
    const visit = (nodeId: string, nodes: string[], relationshipTypes: string[]) => {
      if (relationshipTypes.length >= depthLimit) return
      for (const relationship of relationships.filter((item) => item.sourceId === nodeId)) {
        if (nodes.includes(relationship.targetId)) continue
        const nextNodes = [...nodes, relationship.targetId]
        const nextRelationships = [...relationshipTypes, relationship.type]
        paths.push({ nodes: nextNodes, relationships: nextRelationships })
        visit(relationship.targetId, nextNodes, nextRelationships)
      }
    }
    if (await this.getNode(startId)) visit(startId, [startId], [])
    return paths
  }

  async findKnowledgeTitles(query: string) {
    const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2)
    if (terms.length === 0) return []
    const session = this.driver.session()
    try {
      const result = await session.run(`
        MATCH (matched:Entity)
        WHERE any(term IN $terms WHERE toLower(matched.id + ' ' + matched.type + ' ' + matched.propertiesJson) CONTAINS term)
        OPTIONAL MATCH (matched)-[:RELATES]-(connected:Entity)
        WITH collect(DISTINCT matched) + collect(DISTINCT connected) AS candidates
        UNWIND candidates AS node
        WITH DISTINCT node
        WHERE node IS NOT NULL AND node.type = 'KnowledgeDocument'
        RETURN node.propertiesJson AS propertiesJson
      `, { terms })
      return result.records.map((record) => parseProperties(record.get('propertiesJson')).title)
        .filter((title): title is string => typeof title === 'string' && title.length > 0)
    } finally {
      await session.close()
    }
  }

  async close() {
    await this.driver.close()
  }

  private toNode(record: Neo4jRecord | undefined): Neo4jGraphNode {
    if (!record) throw new Error('Neo4j returned no graph node')
    return {
      id: String(record.get('id')),
      type: String(record.get('type')),
      properties: parseProperties(record.get('propertiesJson')),
      createdAt: String(record.get('createdAt') ?? ''),
      updatedAt: String(record.get('updatedAt') ?? ''),
    }
  }
}

function parseProperties(value: unknown) {
  try {
    return JSON.parse(String(value ?? '{}')) as Record<string, string | number | boolean | null>
  } catch {
    return {}
  }
}
