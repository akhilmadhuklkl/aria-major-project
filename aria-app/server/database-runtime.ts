export type DatabaseEngine = 'sqlite' | 'postgres'

const configuredEngine = (process.env.DATABASE_ENGINE ?? 'sqlite').trim().toLowerCase()

if (configuredEngine !== 'sqlite') {
  throw new Error(`DATABASE_ENGINE=${configuredEngine} is not supported by the current runtime adapter. Use DATABASE_ENGINE=sqlite until PostgreSQL runtime support is enabled.`)
}

export const databaseEngine: DatabaseEngine = 'sqlite'
