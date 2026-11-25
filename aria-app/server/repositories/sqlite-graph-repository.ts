import type { DatabaseSync } from 'node:sqlite'
import type { GraphNodeRecord, GraphNodeType, GraphRelationshipRecord, GraphRepository } from './graph-repository.js'

export function createSqliteGraphRepository(db: DatabaseSync): GraphRepository {
  function upsertGraphNode(input: { id: string; type: GraphNodeType; properties?: Record<string, string | number | boolean | null> }) {
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO graph_nodes (id, type, properties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type = excluded.type, properties = excluded.properties, updated_at = excluded.updated_at
    `).run(input.id, input.type, JSON.stringify(input.properties ?? {}), now, now)
    return getGraphNode(input.id)
  }

  function createGraphRelationship(input: { sourceId: string; type: string; targetId: string; properties?: Record<string, string | number | boolean | null> }) {
    const createdAt = new Date().toISOString()
    db.prepare(`
      INSERT INTO graph_relationships (source_id, type, target_id, properties, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_id, type, target_id) DO UPDATE SET properties = excluded.properties
    `).run(input.sourceId, input.type, input.targetId, JSON.stringify(input.properties ?? {}), createdAt)
    return { ...input, properties: input.properties ?? {} }
  }

  function getGraphNode(id: string) {
    const row = db.prepare('SELECT id, type, properties, created_at AS createdAt, updated_at AS updatedAt FROM graph_nodes WHERE id = ?').get(id) as (Omit<GraphNodeRecord, 'properties'> & { properties: string }) | undefined
    if (!row) return null
    return { ...row, properties: JSON.parse(String(row.properties ?? '{}')) }
  }

  function listGraphNodes(limit = 100) {
    return db.prepare('SELECT id, type, properties, created_at AS createdAt, updated_at AS updatedAt FROM graph_nodes ORDER BY id LIMIT ?').all(Math.min(Math.max(limit, 1), 500)).map((row) => {
      const item = row as Omit<GraphNodeRecord, 'properties'> & { properties: string }
      return { ...item, properties: JSON.parse(String(item.properties ?? '{}')) }
    })
  }

  function listGraphRelationships(limit = 500) {
    return db.prepare('SELECT source_id AS sourceId, type, target_id AS targetId, properties, created_at AS createdAt FROM graph_relationships ORDER BY source_id, target_id LIMIT ?').all(Math.min(Math.max(limit, 1), 1000)).map((row) => {
      const item = row as Omit<GraphRelationshipRecord, 'properties'> & { properties: string }
      return { ...item, properties: JSON.parse(String(item.properties ?? '{}')) }
    })
  }

  function deleteGraphRelationship(input: { sourceId: string; type: string; targetId: string }) {
    return db.prepare('DELETE FROM graph_relationships WHERE source_id = ? AND type = ? AND target_id = ?')
      .run(input.sourceId, input.type, input.targetId).changes > 0
  }

  function deleteGraphNode(id: string) {
    return db.prepare('DELETE FROM graph_nodes WHERE id = ?').run(id).changes > 0
  }

  function queryGraphPaths(startId: string, maxHops = 2) {
    const depthLimit = Math.min(Math.max(maxHops, 1), 2)
    const edges = db.prepare('SELECT source_id AS sourceId, type, target_id AS targetId, properties FROM graph_relationships').all().map((row) => {
      const item = row as Record<string, unknown>
      return { sourceId: String(item.sourceId), type: String(item.type), targetId: String(item.targetId), properties: JSON.parse(String(item.properties ?? '{}')) }
    })
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
    if (getGraphNode(startId)) visit(startId, [startId], [])
    return paths
  }

  function findGraphKnowledgeTitles(query: string) {
    const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2)
    const nodes = db.prepare('SELECT id, type, properties FROM graph_nodes').all().map((row) => {
      const item = row as Record<string, unknown>
      const properties = JSON.parse(String(item.properties ?? '{}')) as Record<string, unknown>
      return { id: String(item.id), type: String(item.type), title: typeof properties.title === 'string' ? properties.title : '', text: `${item.id} ${item.type} ${String(item.properties ?? '{}')}`.toLowerCase() }
    })
    const edges = db.prepare('SELECT source_id AS sourceId, target_id AS targetId FROM graph_relationships').all() as Array<{ sourceId: string; targetId: string }>
    const matched = nodes.filter((node) => terms.some((term) => node.text.includes(term))).map((node) => node.id)
    const connected = new Set(matched)
    for (const nodeId of matched) {
      for (const edge of edges) {
        if (edge.sourceId === nodeId) connected.add(edge.targetId)
        if (edge.targetId === nodeId) connected.add(edge.sourceId)
      }
    }
    return nodes.filter((node) => node.type === 'KnowledgeDocument' && connected.has(node.id))
      .map((node) => node.title)
      .filter(Boolean)
  }

  return { upsertGraphNode, getGraphNode, listGraphNodes, createGraphRelationship, listGraphRelationships, deleteGraphRelationship, deleteGraphNode, queryGraphPaths, findGraphKnowledgeTitles }
}
