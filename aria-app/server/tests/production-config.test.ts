import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectProductionConfig } from '../production-config.js'

const validEnvironment: NodeJS.ProcessEnv = {
  DATABASE_ENGINE: 'postgres',
  DATABASE_URL: 'postgresql://aria:secret@db.example.com:5432/aria',
  DB_SSL: 'true',
  AUTH_REQUIRED: 'true',
  CORS_ORIGINS: 'https://app.example.com',
  GOOGLE_GENERATIVE_AI_API_KEY: 'configured-but-not-printed',
  GRAPH_STORE: 'sqlite',
  PORT: '8787',
}

test('production configuration passes for a hosted PostgreSQL deployment', () => {
  const checks = inspectProductionConfig(validEnvironment)
  assert.equal(checks.every((check) => check.passed), true)
})

test('production configuration rejects unsafe public API settings', () => {
  const checks = inspectProductionConfig({ ...validEnvironment, AUTH_REQUIRED: 'false', DB_SSL: 'false', CORS_ORIGINS: '*' })
  assert.equal(checks.find((check) => check.name === 'Authentication required')?.passed, false)
  assert.equal(checks.find((check) => check.name === 'PostgreSQL TLS enabled')?.passed, false)
  assert.equal(checks.find((check) => check.name === 'Explicit CORS origins configured')?.passed, false)
})

test('production configuration accepts a remote Mastra provider without a local model key', () => {
  const checks = inspectProductionConfig({ ...validEnvironment, GOOGLE_GENERATIVE_AI_API_KEY: '', MASTRA_AGENT_URL: 'https://mastra.example.com/api/agents/aria/generate' })
  assert.equal(checks.find((check) => check.name === 'AI provider configured')?.passed, true)
})

test('production configuration requires complete Neo4j settings when selected', () => {
  const checks = inspectProductionConfig({ ...validEnvironment, GRAPH_STORE: 'neo4j', NEO4J_URI: 'neo4j+s://graph.example.com', NEO4J_USER: 'neo4j' })
  assert.equal(checks.find((check) => check.name === 'Knowledge graph configuration')?.passed, false)
})
