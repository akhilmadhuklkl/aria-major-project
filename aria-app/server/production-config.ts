export type ProductionConfigCheck = {
  name: string
  passed: boolean
  detail: string
}

export function inspectProductionConfig(env: NodeJS.ProcessEnv = process.env): ProductionConfigCheck[] {
  const checks: ProductionConfigCheck[] = []
  const databaseEngine = env.DATABASE_ENGINE?.trim().toLowerCase()
  const databaseUrl = parseDatabaseUrl(env.DATABASE_URL)
  const allowedOrigins = (env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
  const mastraAgentUrl = parseHttpUrl(env.MASTRA_AGENT_URL)
  const mastraModel = env.MASTRA_MODEL?.trim() || 'google/gemini-2.5-flash'
  const hasProviderKey = mastraModel.startsWith('google/')
    ? Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim())
    : mastraModel.startsWith('openai/')
      ? Boolean(env.OPENAI_API_KEY?.trim())
      : Boolean(
        env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
        || env.GOOGLE_API_KEY?.trim()
        || env.OPENAI_API_KEY?.trim(),
      )

  addCheck(checks, 'PostgreSQL runtime selected', databaseEngine === 'postgres', databaseEngine === 'postgres' ? 'DATABASE_ENGINE=postgres' : 'Set DATABASE_ENGINE=postgres for hosted deployment')
  addCheck(checks, 'PostgreSQL URL configured', Boolean(databaseUrl), databaseUrl ? `host=${databaseUrl.hostname}` : 'DATABASE_URL must use postgres:// or postgresql:// with a host and password')
  addCheck(checks, 'PostgreSQL TLS enabled', env.DB_SSL?.trim().toLowerCase() === 'true', env.DB_SSL?.trim().toLowerCase() === 'true' ? 'DB_SSL=true' : 'Set DB_SSL=true for managed PostgreSQL')
  addCheck(checks, 'Authentication required', env.AUTH_REQUIRED?.trim().toLowerCase() === 'true', env.AUTH_REQUIRED?.trim().toLowerCase() === 'true' ? 'Protected API routes enabled' : 'Set AUTH_REQUIRED=true before public exposure')
  addCheck(checks, 'Explicit CORS origins configured', allowedOrigins.length > 0 && allowedOrigins.every((origin) => isHttpUrl(origin)), allowedOrigins.length > 0 ? `${allowedOrigins.length} allowed origin(s)` : 'Set CORS_ORIGINS to one or more http(s) origins; wildcard CORS is not allowed')
  addCheck(checks, 'AI provider configured', Boolean(mastraAgentUrl || hasProviderKey), mastraAgentUrl ? `remote Mastra host=${mastraAgentUrl.hostname}` : hasProviderKey ? `provider key configured for ${mastraModel}` : 'Configure MASTRA_AGENT_URL or the API key required by MASTRA_MODEL')

  const graphStore = env.GRAPH_STORE?.trim().toLowerCase() || 'sqlite'
  const graphConfigured = graphStore !== 'neo4j' || Boolean(env.NEO4J_URI?.trim() && env.NEO4J_USER?.trim() && env.NEO4J_PASSWORD?.trim())
  addCheck(checks, 'Knowledge graph configuration', graphConfigured, graphStore === 'neo4j' ? 'Neo4j URI, user, and password configured' : 'SQLite graph store selected')

  const port = Number(env.PORT ?? 8787)
  addCheck(checks, 'Application port valid', Number.isInteger(port) && port > 0 && port <= 65535, `PORT=${String(env.PORT ?? 8787)}`)
  return checks
}

function addCheck(checks: ProductionConfigCheck[], name: string, passed: boolean, detail: string) {
  checks.push({ name, passed, detail })
}

function parseDatabaseUrl(value: string | undefined): URL | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value)
    if ((url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') || !url.hostname || !url.username || !url.password) return undefined
    return url
  } catch {
    return undefined
  }
}

function parseHttpUrl(value: string | undefined): URL | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value)
    return isHttpUrl(url.toString()) ? url : undefined
  } catch {
    return undefined
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
