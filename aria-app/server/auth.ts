import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { sqliteAuthRepository } from './repositories/auth-repository.js'

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
  sqliteAuthRepository.ensureSchema()
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
  const id = sqliteAuthRepository.insertUser({ id: 0, email: input.email, displayName: input.displayName.trim(), role: input.role, passwordHash, passwordSalt: salt, createdAt: now, updatedAt: now })
  return sqliteAuthRepository.findUserById(id)
}

export function authenticateUser(email: string, password: string) {
  const row = sqliteAuthRepository.findUserByEmail(email)

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
  sqliteAuthRepository.insertSession({ userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAt.toISOString(), createdAt: now.toISOString() })
  return { token, expiresAt: expiresAt.toISOString() }
}

export function revokeSession(token: string) {
  sqliteAuthRepository.revokeSession(hashToken(token), new Date().toISOString())
}

export function changeUserPassword(userId: number, currentPassword: string, nextPassword: string) {
  const row = sqliteAuthRepository.findCredentialsByUserId(userId)
  if (!row || !matchesPassword(currentPassword, row.passwordHash, row.passwordSalt)) return false

  const salt = randomBytes(16).toString('hex')
  const now = new Date().toISOString()
  sqliteAuthRepository.updateCredentials(userId, { passwordHash: hashPassword(nextPassword, salt), passwordSalt: salt }, now)
  sqliteAuthRepository.revokeUserSessions(userId, now)
  return true
}

export function getUserFromToken(token: string) {
  const row = sqliteAuthRepository.findUserByToken(hashToken(token))

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
  return sqliteAuthRepository.countUsers()
}

export function listSupportAgents() {
  return sqliteAuthRepository.listSupportAgents()
}

export function listUsers() {
  return sqliteAuthRepository.listUsers()
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
