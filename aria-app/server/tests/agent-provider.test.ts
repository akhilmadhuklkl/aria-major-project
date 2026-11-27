import assert from 'node:assert/strict'
import test from 'node:test'
import { createAgentService, getAgentProvider } from '../agent-service.js'

test('AI provider selection can force local fallback mode', () => {
  const previousProvider = process.env.AI_PROVIDER
  const previousEndpoint = process.env.MASTRA_AGENT_URL
  process.env.AI_PROVIDER = 'local'
  process.env.MASTRA_AGENT_URL = 'http://example.test/agent'

  try {
    assert.equal(getAgentProvider(), 'local-knowledge-agent')
    assert.equal(createAgentService(async () => []).constructor.name, 'LocalAgentService')
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER
    else process.env.AI_PROVIDER = previousProvider
    if (previousEndpoint === undefined) delete process.env.MASTRA_AGENT_URL
    else process.env.MASTRA_AGENT_URL = previousEndpoint
  }
})

test('AI provider auto mode uses Mastra when an endpoint is configured', () => {
  const previousProvider = process.env.AI_PROVIDER
  const previousEndpoint = process.env.MASTRA_AGENT_URL
  process.env.AI_PROVIDER = 'auto'
  process.env.MASTRA_AGENT_URL = 'http://example.test/agent'

  try {
    assert.equal(getAgentProvider(), 'mastra-remote')
    assert.equal(createAgentService(async () => []).constructor.name, 'RemoteMastraAgentService')
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER
    else process.env.AI_PROVIDER = previousProvider
    if (previousEndpoint === undefined) delete process.env.MASTRA_AGENT_URL
    else process.env.MASTRA_AGENT_URL = previousEndpoint
  }
})

test('AI provider auto mode uses the embedded Mastra agent when enabled', () => {
  const previousProvider = process.env.AI_PROVIDER
  const previousEndpoint = process.env.MASTRA_AGENT_URL
  const previousEmbedded = process.env.ENABLE_MASTRA_SERVER
  process.env.AI_PROVIDER = 'auto'
  delete process.env.MASTRA_AGENT_URL
  process.env.ENABLE_MASTRA_SERVER = 'true'

  try {
    assert.equal(getAgentProvider(), 'mastra-embedded')
    assert.equal(createAgentService(async () => []).constructor.name, 'EmbeddedMastraAgentService')
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER
    else process.env.AI_PROVIDER = previousProvider
    if (previousEndpoint === undefined) delete process.env.MASTRA_AGENT_URL
    else process.env.MASTRA_AGENT_URL = previousEndpoint
    if (previousEmbedded === undefined) delete process.env.ENABLE_MASTRA_SERVER
    else process.env.ENABLE_MASTRA_SERVER = previousEmbedded
  }
})
