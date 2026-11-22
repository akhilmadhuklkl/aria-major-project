import assert from 'node:assert/strict'
import test from 'node:test'
import {
  authenticateUser,
  createSession,
  createUser,
  ensureAuthSchema,
  getUserFromToken,
  revokeSession,
  validateCredentials,
} from '../auth.js'
import { db } from '../database.js'

ensureAuthSchema()

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
