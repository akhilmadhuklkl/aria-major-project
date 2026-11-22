import '../env.js'
import { listGraphNodes, listGraphRelationships } from '../database.js'
import { Neo4jGraphStore } from '../neo4j-graph-store.js'

const store = new Neo4jGraphStore()

try {
  await store.verifyConnection()
  const nodes = listGraphNodes() as unknown as Array<{
    id: string
    type: string
    properties: Record<string, string | number | boolean | null>
  }>
  const relationships = listGraphRelationships() as unknown as Array<{
    sourceId: string
    targetId: string
    type: string
    properties: Record<string, string | number | boolean | null>
  }>

  for (const node of nodes) {
    await store.upsertNode(node)
  }
  for (const relationship of relationships) {
    await store.createRelationship(relationship)
  }

  console.log(`Migrated ${nodes.length} graph nodes and ${relationships.length} relationships to Neo4j.`)
} finally {
  await store.close()
}
