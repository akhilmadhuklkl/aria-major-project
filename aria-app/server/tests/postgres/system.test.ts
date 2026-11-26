import assert from 'node:assert/strict'
import test from 'node:test'
import { Pool } from 'pg'
import { createPostgresSystemRepository } from '../../repositories/postgres-system-repository.js'
import { runSystemRepositoryContract } from '../contracts/repository-contracts.js'

test('PostgreSQL system repository verifies connection and returns record counts', async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000, max: 1 })
  try {
    await pool.query(`
      CREATE TEMP TABLE conversations (id INTEGER);
      CREATE TEMP TABLE feedback (id INTEGER);
      SET search_path TO pg_temp;
    `)
    const repository = createPostgresSystemRepository(pool)
    await pool.query('BEGIN')
    await pool.query('SAVEPOINT system_repository_contract')
    try {
      await runSystemRepositoryContract(repository, async () => {
        await pool.query('INSERT INTO conversations VALUES (1), (2); INSERT INTO feedback VALUES (1)')
      })
    } finally {
      await pool.query('ROLLBACK TO SAVEPOINT system_repository_contract')
      await pool.query('RELEASE SAVEPOINT system_repository_contract')
    }
    await repository.verifyConnection()
    assert.deepEqual(await repository.getRecordCounts(), { conversations: 0, feedbackRecords: 0 })
    await pool.query('INSERT INTO conversations VALUES (1), (2), (3); INSERT INTO feedback VALUES (1), (2)')
    assert.deepEqual(await repository.getRecordCounts(), { conversations: 3, feedbackRecords: 2 })
    await pool.query('ROLLBACK')
  } finally {
    await pool.end()
  }
})
