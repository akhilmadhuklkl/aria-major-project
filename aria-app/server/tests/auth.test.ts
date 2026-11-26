import assert from 'node:assert/strict'
import test from 'node:test'
import {
  authenticateUser,
  changeUserPassword,
  createAuthService,
  createSession,
  createUser,
  ensureAuthSchema,
  getUserFromToken,
  listUsers,
  revokeSession,
  validateCredentials,
} from '../auth.js'
import { db } from '../database.js'
import { createRuntimeRepositories } from '../runtime-repositories.js'
import { sqliteAuthRepository } from '../repositories/auth-repository.js'
import { runAuthRepositoryContract } from './contracts/repository-contracts.js'

ensureAuthSchema()

test('SQLite auth repository satisfies the shared cross-engine contract', async () => {
  db.exec('BEGIN')
  try {
    await runAuthRepositoryContract(sqliteAuthRepository, `sqlite-auth-${Date.now()}`)
  } finally {
    db.exec('ROLLBACK')
  }
})

test('credential validation normalizes valid input and rejects weak credentials', () => {
  assert.deepEqual(validateCredentials({ email: '  Agent@Example.com ', password: 'password123' }), {
    email: 'agent@example.com',
    password: 'password123',
  })
  assert.equal(validateCredentials({ email: 'invalid', password: 'password123' }).error, 'A valid email is required')
  assert.equal(validateCredentials({ email: 'agent@example.com', password: 'short' }).error, 'Password must contain at least 8 characters')
})

test('users authenticate through expiring revocable sessions', () => {
  const email = `auth-test-${Date.now()}@example.com`
  const user = createUser({
    email,
    displayName: 'Auth Test Agent',
    role: 'support_agent',
    password: 'password123',
  })

  try {
    assert.ok(user)
    assert.equal(authenticateUser(email, 'wrong-password'), undefined)
    const authenticated = authenticateUser(email, 'password123')
    assert.ok(authenticated)
    assert.equal(authenticated.id, user.id)
    assert.equal(authenticated.email, user.email)
    assert.equal(authenticated.displayName, user.displayName)
    assert.equal(authenticated.role, user.role)

    const session = createSession(authenticated)
    const sessionUser = getUserFromToken(session.token)
    assert.ok(sessionUser)
    assert.equal(sessionUser.id, user.id)
    assert.equal(sessionUser.role, user.role)
    revokeSession(session.token)
    assert.equal(getUserFromToken(session.token), undefined)
  } finally {
    db.prepare('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(email)
    db.prepare('DELETE FROM users WHERE email = ?').run(email)
  }
})

test('admin user directory returns public identity fields only', () => {
  const email = `directory-test-${Date.now()}@example.com`
  const user = createUser({
    email,
    displayName: 'Directory Test Customer',
    role: 'customer',
    password: 'password123',
  })

  try {
    const listed = listUsers().find((item) => item.id === user?.id)
    assert.deepEqual(listed, user)
    assert.equal('passwordHash' in (listed ?? {}), false)
    assert.equal('passwordSalt' in (listed ?? {}), false)
  } finally {
    db.prepare('DELETE FROM users WHERE email = ?').run(email)
  }
})

test('changing a password invalidates existing sessions', () => {
  const email = `password-test-${Date.now()}@example.com`
  const user = createUser({ email, displayName: 'Password Test User', role: 'support_agent', password: 'password123' })
  try {
    const session = createSession(user!)
    assert.equal(changeUserPassword(user!.id, 'wrong-password', 'new-password123'), false)
    assert.equal(changeUserPassword(user!.id, 'password123', 'new-password123'), true)
    assert.equal(authenticateUser(email, 'password123'), undefined)
    assert.ok(authenticateUser(email, 'new-password123'))
    assert.equal(getUserFromToken(session.token), undefined)
  } finally {
    db.prepare('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(email)
    db.prepare('DELETE FROM users WHERE email = ?').run(email)
  }
})

test('async runtime auth service preserves SQLite authentication behavior', async () => {
  const email = `async-auth-test-${Date.now()}@example.com`
  const runtime = createRuntimeRepositories('sqlite')
  const auth = createAuthService(runtime.auth)
  await auth.ensureAuthSchema()
  const user = await auth.createUser({ email, displayName: 'Async Auth Test User', role: 'support_agent', password: 'password123' })

  try {
    assert.ok(user)
    assert.equal((await auth.authenticateUser(email, 'wrong-password')), undefined)
    const authenticated = await auth.authenticateUser(email, 'password123')
    assert.deepEqual(authenticated, user)
    const session = await auth.createSession(user)
    assert.deepEqual(await auth.getUserFromToken(session.token), user)
    await auth.revokeSession(session.token)
    assert.equal(await auth.getUserFromToken(session.token), undefined)
  } finally {
    db.prepare('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(email)
    db.prepare('DELETE FROM users WHERE email = ?').run(email)
    await runtime.close()
  }
})
