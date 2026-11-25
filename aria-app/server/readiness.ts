import type { DatabaseEngine } from './database-runtime.js'
import type { SystemRepository } from './repositories/system-repository.js'

export async function checkDatabaseReadiness(
  database: DatabaseEngine,
  repository: Pick<SystemRepository, 'verifyConnection'>,
  graph?: { verifyConnection(): void | boolean | Promise<void | boolean> },
) {
  const graphStore = graph ? 'neo4j' : 'sqlite'
  try {
    await repository.verifyConnection()
    if (graph && await graph.verifyConnection() === false) return { ready: false, database, graphStore }
    return { ready: true, database, graphStore }
  } catch {
    return { ready: false, database, graphStore }
  }
}
