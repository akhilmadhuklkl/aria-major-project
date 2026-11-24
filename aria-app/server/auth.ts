import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { db } from './database.js'

export type UserRole = 'admin' | 'support_agent' | 'customer'

export type AuthUser = {
  id: number
  email: string
  displayName: string
  role: UserRole
}

const sessionDurationMs = 1000 * 60 * 60 * 8
const requestUsers = new WeakMap<Request, AuthUser>()

export function ensureAuthSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'support_agent', 'customer')),
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at, revoked_at);
  `)
}

export function normalizeEmail(email: unknown) {
  return String(email ?? '').trim().toLowerCase()
}

export function validateCredentials(input: { email: unknown; password: unknown }) {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')
  if (!email || !email.includes('@')) return { error: 'A valid email is required' } as const
  if (password.length < 8) return { error: 'Password must contain at least 8 characters' } as const
  return { email, password } as const
}

export function createUser(input: {
  email: string
  displayName: string
  role: UserRole
  password: string
}) {
  const now = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(input.password, salt)
  const result = db.prepare(`
    INSERT INTO users (email, display_name, role, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(input.email, input.displayName.trim(), input.role, passwordHash, salt, now, now)
  return getUserById(Number(result.lastInsertRowid))
}

export function authenticateUser(email: string, password: string) {
  const row = db.prepare(`
    SELECT id, email, display_name AS displayName, role, password_hash AS passwordHash, password_salt AS passwordSalt
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).get(email) as (AuthUser & { passwordHash: string; passwordSalt: string }) | undefined

  if (!row) return undefined
  const expected = Buffer.from(row.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, row.passwordSalt), 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined
  return toPublicUser(row)
}

export function createSession(user: AuthUser) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionDurationMs)
  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(user.id, hashToken(token), expiresAt.toISOString(), now.toISOString())
  return { token, expiresAt: expiresAt.toISOString() }
}

export function revokeSession(token: string) {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), hashToken(token))
}

export function changeUserPassword(userId: number, currentPassword: string, nextPassword: string) {
  const row = db.prepare(`
    SELECT password_hash AS passwordHash, password_salt AS passwordSalt
    FROM users WHERE id = ?
  `).get(userId) as { passwordHash: string; passwordSalt: string } | undefined
  if (!row || !matchesPassword(currentPassword, row.passwordHash, row.passwordSalt)) return false

  const salt = randomBytes(16).toString('hex')
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(nextPassword, salt), salt, new Date().toISOString(), userId)
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), userId)
  return true
}

export function getUserFromToken(token: string) {
  const row = db.prepare(`
    SELECT users.id, users.email, users.display_name AS displayName, users.role,
           sessions.expires_at AS expiresAt
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL
  `).get(hashToken(token)) as (AuthUser & { expiresAt: string }) | undefined

  if (!row || new Date(row.expiresAt).getTime() <= Date.now()) return undefined
  return toPublicUser(row)
}

export function getBearerToken(request: Request) {
  const header = request.header('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = getBearerToken(request)
  const user = token ? getUserFromToken(token) : undefined
  if (!user) {
    response.status(401).json({ error: 'Authentication is required' })
    return
  }
  requestUsers.set(request, user)
  next()
}

export function getAuthenticatedUser(request: Request) {
  return requestUsers.get(request)
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(request)
    if (!user || !roles.includes(user.role)) {
      response.status(403).json({ error: 'You do not have permission for this action' })
      return
    }
    next()
  }
}

export function getUserCount() {
  return (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count
}

export function listSupportAgents() {
  return db.prepare(`
    SELECT id, email, display_name AS displayName, role
    FROM users
    WHERE role IN ('admin', 'support_agent')
    ORDER BY display_name COLLATE NOCASE
  `).all() as AuthUser[]
}

export function listUsers() {
  return db.prepare(`
    SELECT id, email, display_name AS displayName, role
    FROM users
    ORDER BY role, display_name COLLATE NOCASE
  `).all() as AuthUser[]
}

function getUserById(id: number) {
  const row = db.prepare(`
    SELECT id, email, display_name AS displayName, role
    FROM users
    WHERE id = ?
  `).get(id) as AuthUser | undefined
  return row
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex')
}

function matchesPassword(password: string, passwordHash: string, passwordSalt: string) {
  const expected = Buffer.from(passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, passwordSalt), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  }
}
