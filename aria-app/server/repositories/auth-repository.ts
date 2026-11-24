import { db } from '../database.js'

export type StoredAuthUser = {
  id: number
  email: string
  displayName: string
  role: 'admin' | 'support_agent' | 'customer'
}

export type StoredCredentials = {
  passwordHash: string
  passwordSalt: string
}

export interface AuthRepository {
  ensureSchema(): void
  countUsers(): number
  findUserByEmail(email: string): (StoredAuthUser & StoredCredentials) | undefined
  findUserById(id: number): StoredAuthUser | undefined
  insertUser(input: StoredAuthUser & StoredCredentials & { createdAt: string; updatedAt: string }): number
  insertSession(input: { userId: number; tokenHash: string; expiresAt: string; createdAt: string }): void
  revokeSession(tokenHash: string, revokedAt: string): void
  findUserByToken(tokenHash: string): (StoredAuthUser & { expiresAt: string }) | undefined
  findCredentialsByUserId(id: number): StoredCredentials | undefined
  updateCredentials(id: number, credentials: StoredCredentials, updatedAt: string): void
  revokeUserSessions(id: number, revokedAt: string): void
  listSupportAgents(): StoredAuthUser[]
  listUsers(): StoredAuthUser[]
}

export const sqliteAuthRepository: AuthRepository = {
  ensureSchema() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin', 'support_agent', 'customer')),
        password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at, revoked_at);
    `)
  },
  countUsers: () => (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count,
  findUserByEmail: (email) => db.prepare('SELECT id, email, display_name AS displayName, role, password_hash AS passwordHash, password_salt AS passwordSalt FROM users WHERE email = ? COLLATE NOCASE').get(email) as StoredAuthUser & StoredCredentials | undefined,
  findUserById: (id) => db.prepare('SELECT id, email, display_name AS displayName, role FROM users WHERE id = ?').get(id) as StoredAuthUser | undefined,
  insertUser: (input) => Number(db.prepare('INSERT INTO users (email, display_name, role, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(input.email, input.displayName, input.role, input.passwordHash, input.passwordSalt, input.createdAt, input.updatedAt).lastInsertRowid),
  insertSession: (input) => { db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').run(input.userId, input.tokenHash, input.expiresAt, input.createdAt) },
  revokeSession: (tokenHash, revokedAt) => { db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(revokedAt, tokenHash) },
  findUserByToken: (tokenHash) => db.prepare('SELECT users.id, users.email, users.display_name AS displayName, users.role, sessions.expires_at AS expiresAt FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL').get(tokenHash) as StoredAuthUser & { expiresAt: string } | undefined,
  findCredentialsByUserId: (id) => db.prepare('SELECT password_hash AS passwordHash, password_salt AS passwordSalt FROM users WHERE id = ?').get(id) as StoredCredentials | undefined,
  updateCredentials: (id, credentials, updatedAt) => { db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?').run(credentials.passwordHash, credentials.passwordSalt, updatedAt, id) },
  revokeUserSessions: (id, revokedAt) => { db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(revokedAt, id) },
  listSupportAgents: () => db.prepare("SELECT id, email, display_name AS displayName, role FROM users WHERE role IN ('admin', 'support_agent') ORDER BY display_name COLLATE NOCASE").all() as StoredAuthUser[],
  listUsers: () => db.prepare('SELECT id, email, display_name AS displayName, role FROM users ORDER BY role, display_name COLLATE NOCASE').all() as StoredAuthUser[],
}
