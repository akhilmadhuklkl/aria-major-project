import '../env.js'
import { readFile } from 'node:fs/promises'
import { Neo4jGraphStore, type Neo4jGraphNode, type Neo4jGraphRelationship } from '../neo4j-graph-store.js'

const inputPath = process.argv[2]
if (!inputPath) throw new Error('Usage: npm run restore:neo4j -- backups/neo4j-graph.json')

const backup = JSON.parse(await readFile(inputPath, 'utf8')) as {
  version: number
  nodes: Neo4jGraphNode[]
  relationships: Neo4jGraphRelationship[]
}
if (backup.version !== 1 || !Array.isArray(backup.nodes) || !Array.isArray(backup.relationships)) {
  throw new Error('Unsupported or invalid Neo4j backup format')
}

const store = new Neo4jGraphStore()
try {
  await store.verifyConnection()
  for (const node of backup.nodes) await store.upsertNode(node)
  for (const relationship of backup.relationships) await store.createRelationship(relationship)
  console.log(`Restored ${backup.nodes.length} nodes and ${backup.relationships.length} relationships from ${inputPath}`)
} finally {
  await store.close()
}
