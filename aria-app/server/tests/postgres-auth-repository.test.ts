import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresAuthRepository } from '../repositories/postgres-auth-repository.js'

test('PostgreSQL auth binds parameters, maps IDs and expiry, and excludes credential fields from public reads', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  const row = { id: '7', email: 'Agent@example.com', displayName: 'Agent', role: 'support_agent', passwordHash: 'hash', passwordSalt: 'salt', expiresAt: new Date('2026-01-01T08:00:00Z') }
  const query = async (sql: string, values?: unknown[]) => { calls.push({ sql, values }); return { rows: [row], rowCount: 1 } }
  const repository = createPostgresAuthRepository({ query } as unknown as Pick<Pool, 'query'>)
  const user = { id: 7, email: row.email, displayName: row.displayName, role: row.role }
  assert.deepEqual(await repository.findUserById(7), user)
  assert.deepEqual(calls.at(-1)?.values, [7])
  assert.deepEqual(await repository.listUsers(), [user])
  assert.deepEqual(await repository.listSupportAgents(), [user])
  const credentials = await repository.findUserByEmail("AGENT@example.com' OR 1=1 --")
  assert.equal(credentials?.passwordHash, 'hash')
  assert.match(calls.at(-1)?.sql ?? '', /lower\(email\) = lower\(\$1\)/)
  assert.equal(calls.at(-1)?.sql.includes('OR 1=1'), false)
  assert.deepEqual(await repository.findUserByToken('token-hash'), { ...user, expiresAt: '2026-01-01T08:00:00.000Z' })
  await repository.revokeSession('token-hash', 'revoked-at')
  assert.deepEqual(calls.at(-1)?.values, ['revoked-at', 'token-hash'])
  await repository.updateCredentials(7, { passwordHash: 'new-hash', passwordSalt: 'new-salt' }, 'updated-at')
  assert.deepEqual(calls.at(-1)?.values, ['new-hash', 'new-salt', 'updated-at', 7])
})

test('PostgreSQL auth returns undefined for missing identities and propagates errors', async () => {
  const repository = createPostgresAuthRepository({ query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pick<Pool, 'query'>)
  assert.equal(await repository.findUserById(-1), undefined)
  assert.equal(await repository.findUserByEmail('missing@example.com'), undefined)
  assert.equal(await repository.findUserByToken('missing'), undefined)
  assert.equal(await repository.findCredentialsByUserId(-1), undefined)
  const failing = createPostgresAuthRepository({ query: async () => { throw new Error('database unavailable') } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(failing.countUsers(), /database unavailable/)
  await assert.rejects(failing.ensureSchema(), /database unavailable/)
})
