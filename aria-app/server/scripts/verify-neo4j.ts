import '../env.js'
import { listGraphNodes, listGraphRelationships } from '../database.js'
import { Neo4jGraphStore } from '../neo4j-graph-store.js'

const store = new Neo4jGraphStore()

try {
  await store.verifyConnection()
  const sqliteNodes = listGraphNodes() as unknown as Array<{ id: string }>
  const sqliteRelationships = listGraphRelationships() as unknown as Array<{ sourceId: string; targetId: string; type: string }>
  const neo4jNodes = await store.listNodes()
  const neo4jRelationships = await store.listRelationships()

  const sqliteNodeIds = new Set(sqliteNodes.map((node) => node.id))
  const neo4jNodeIds = new Set(neo4jNodes.map((node) => node.id))
  const sqliteRelationshipKeys = new Set(sqliteRelationships.map((item) => `${item.sourceId}|${item.type}|${item.targetId}`))
  const neo4jRelationshipKeys = new Set(neo4jRelationships.map((item) => `${item.sourceId}|${item.type}|${item.targetId}`))
  const missingNodes = [...sqliteNodeIds].filter((id) => !neo4jNodeIds.has(id))
  const extraNodes = [...neo4jNodeIds].filter((id) => !sqliteNodeIds.has(id))
  const missingRelationships = [...sqliteRelationshipKeys].filter((key) => !neo4jRelationshipKeys.has(key))
  const extraRelationships = [...neo4jRelationshipKeys].filter((key) => !sqliteRelationshipKeys.has(key))

  console.log(JSON.stringify({
    sqlite: { nodes: sqliteNodes.length, relationships: sqliteRelationships.length },
    neo4j: { nodes: neo4jNodes.length, relationships: neo4jRelationships.length },
    missingNodes,
    extraNodes,
    missingRelationships,
    extraRelationships,
    matches: missingNodes.length === 0 && extraNodes.length === 0 && missingRelationships.length === 0 && extraRelationships.length === 0,
  }, null, 2))

  if (missingNodes.length || extraNodes.length || missingRelationships.length || extraRelationships.length) process.exitCode = 1
} finally {
  await store.close()
}
