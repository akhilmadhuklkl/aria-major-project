import '../env.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Neo4jGraphStore } from '../neo4j-graph-store.js'

const outputPath = resolve(process.argv[2] ?? 'backups/neo4j-graph.json')
const store = new Neo4jGraphStore()

try {
  await store.verifyConnection()
  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),
    nodes: await store.listNodes(500),
    relationships: await store.listRelationships(1000),
  }
  await mkdir(resolve(outputPath, '..'), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
  console.log(`Backed up ${backup.nodes.length} nodes and ${backup.relationships.length} relationships to ${outputPath}`)
} finally {
  await store.close()
}
