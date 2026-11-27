export type DatabaseEngine = 'sqlite' | 'postgres'

const configuredEngine = (process.env.DATABASE_ENGINE ?? 'sqlite').trim().toLowerCase()

if (configuredEngine !== 'sqlite' && configuredEngine !== 'postgres') {
  throw new Error(`DATABASE_ENGINE=${configuredEngine} is invalid. Use DATABASE_ENGINE=sqlite or DATABASE_ENGINE=postgres.`)
}

export const databaseEngine: DatabaseEngine = configuredEngine
