import type { Pool, PoolClient } from 'pg'
import type { AsyncGraphRepository, GraphNodeRecord, GraphNodeType, GraphProperties, GraphRelationshipInput, GraphRelationshipRecord } from './graph-repository.js'

type NodeRow = {
  id: string
  type: string
  properties: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

type RelationshipRow = {
  sourceId: string
  type: string
  targetId: string
  properties: unknown
  createdAt: Date | string
}

const nodeColumns = 'id, type, properties, created_at AS "createdAt", updated_at AS "updatedAt"'
const relationshipColumns = 'source_id AS "sourceId", type, target_id AS "targetId", properties, created_at AS "createdAt"'
const toIso = (value: Date | string) => new Date(value).toISOString()

function toProperties(value: unknown): GraphProperties {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as GraphProperties } catch { return {} }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as GraphProperties
  return {}
}

function toNode(row: NodeRow): GraphNodeRecord {
  return { id: row.id, type: row.type, properties: toProperties(row.properties), createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) }
}

function toRelationship(row: RelationshipRow): GraphRelationshipRecord {
  return { sourceId: row.sourceId, type: row.type, targetId: row.targetId, properties: toProperties(row.properties), createdAt: toIso(row.createdAt) }
}

export function createPostgresGraphRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncGraphRepository {
  const getGraphNode = async (id: string) => {
    const result = await client.query<NodeRow>(`SELECT ${nodeColumns} FROM graph_nodes WHERE id = $1`, [id])
    return result.rows[0] ? toNode(result.rows[0]) : null
  }

  const listGraphNodes = async (limit = 100) => {
    const result = await client.query<NodeRow>(`SELECT ${nodeColumns} FROM graph_nodes ORDER BY id LIMIT $1`, [Math.min(Math.max(limit, 1), 500)])
    return result.rows.map(toNode)
  }

  const listGraphRelationships = async (limit = 500) => {
    const result = await client.query<RelationshipRow>(`SELECT ${relationshipColumns} FROM graph_relationships ORDER BY source_id, target_id LIMIT $1`, [Math.min(Math.max(limit, 1), 1000)])
    return result.rows.map(toRelationship)
  }

  return {
    async upsertGraphNode(input: { id: string; type: GraphNodeType; properties?: GraphProperties }) {
      const now = new Date().toISOString()
      const result = await client.query<NodeRow>(`
        INSERT INTO graph_nodes (id, type, properties, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, properties = EXCLUDED.properties, updated_at = EXCLUDED.updated_at
        RETURNING ${nodeColumns}
      `, [input.id, input.type, JSON.stringify(input.properties ?? {}), now, now])
      return result.rows[0] ? toNode(result.rows[0]) : null
    },
    getGraphNode,
    listGraphNodes,
    async createGraphRelationship(input: GraphRelationshipInput) {
      await client.query(`
        INSERT INTO graph_relationships (source_id, type, target_id, properties, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (source_id, type, target_id) DO UPDATE SET properties = EXCLUDED.properties
      `, [input.sourceId, input.type, input.targetId, JSON.stringify(input.properties ?? {}), new Date().toISOString()])
      return { ...input, properties: input.properties ?? {} }
    },
    listGraphRelationships,
    async deleteGraphRelationship(input) {
      const result = await client.query('DELETE FROM graph_relationships WHERE source_id = $1 AND type = $2 AND target_id = $3', [input.sourceId, input.type, input.targetId])
      return (result.rowCount ?? 0) > 0
    },
    async deleteGraphNode(id) {
      const result = await client.query('DELETE FROM graph_nodes WHERE id = $1', [id])
      return (result.rowCount ?? 0) > 0
    },
    async queryGraphPaths(startId, maxHops = 2) {
      const depthLimit = Math.min(Math.max(maxHops, 1), 2)
      if (!await getGraphNode(startId)) return []
      const edges = await listGraphRelationships(1000)
      const paths: Array<{ nodes: string[]; relationships: string[] }> = []
      const visit = (nodeId: string, nodes: string[], relationships: string[]) => {
        if (relationships.length >= depthLimit) return
        for (const edge of edges.filter((item) => item.sourceId === nodeId)) {
          if (nodes.includes(edge.targetId)) continue
          const nextNodes = [...nodes, edge.targetId]
          const nextRelationships = [...relationships, edge.type]
          paths.push({ nodes: nextNodes, relationships: nextRelationships })
          visit(edge.targetId, nextNodes, nextRelationships)
        }
      }
      visit(startId, [startId], [])
      return paths
    },
    async findGraphKnowledgeTitles(query) {
      const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2)
      if (terms.length === 0) return []
      const [nodeResult, relationshipResult] = await Promise.all([
        client.query<{ id: string; type: string; properties: unknown }>('SELECT id, type, properties FROM graph_nodes'),
        client.query<{ sourceId: string; targetId: string }>('SELECT source_id AS "sourceId", target_id AS "targetId" FROM graph_relationships'),
      ])
      const nodes = nodeResult.rows.map((row) => {
        const properties = toProperties(row.properties)
        return { id: row.id, type: row.type, title: typeof properties.title === 'string' ? properties.title : '', text: `${row.id} ${row.type} ${JSON.stringify(properties)}`.toLowerCase() }
      })
      const matched = nodes.filter((node) => terms.some((term) => node.text.includes(term))).map((node) => node.id)
      const connected = new Set(matched)
      for (const nodeId of matched) {
        for (const edge of relationshipResult.rows) {
          if (edge.sourceId === nodeId) connected.add(edge.targetId)
          if (edge.targetId === nodeId) connected.add(edge.sourceId)
        }
      }
      return nodes.filter((node) => node.type === 'KnowledgeDocument' && connected.has(node.id)).map((node) => node.title).filter(Boolean)
    },
  }
}
