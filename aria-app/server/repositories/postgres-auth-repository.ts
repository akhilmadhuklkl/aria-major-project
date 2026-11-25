import type { Pool, PoolClient } from 'pg'
import type { AsyncAuthRepository, StoredAuthUser, StoredCredentials } from './auth-repository.js'

type UserRow = Omit<StoredAuthUser, 'id'> & { id: string | number }
const userColumns = 'id, email, display_name AS "displayName", role'
const credentialColumns = 'password_hash AS "passwordHash", password_salt AS "passwordSalt"'
const publicUser = (row: UserRow): StoredAuthUser => ({ id: Number(row.id), email: row.email, displayName: row.displayName, role: row.role })

export function createPostgresAuthRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncAuthRepository {
  return {
    async ensureSchema() {
      // PostgreSQL schema creation is owned by migrations, not authentication requests.
      await client.query(`SELECT ${userColumns}, ${credentialColumns}, created_at, updated_at FROM users WHERE FALSE`)
      await client.query('SELECT id, user_id, token_hash, expires_at, created_at, revoked_at FROM sessions WHERE FALSE')
    },
    async countUsers() {
      const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM users')
      return Number(result.rows[0].count)
    },
    async findUserByEmail(email) {
      const result = await client.query<UserRow & StoredCredentials>(`SELECT ${userColumns}, ${credentialColumns} FROM users WHERE lower(email) = lower($1)`, [email])
      const row = result.rows[0]
      return row ? { ...publicUser(row), passwordHash: row.passwordHash, passwordSalt: row.passwordSalt } : undefined
    },
    async findUserById(id) {
      const result = await client.query<UserRow>(`SELECT ${userColumns} FROM users WHERE id = $1`, [id])
      return result.rows[0] ? publicUser(result.rows[0]) : undefined
    },
    async insertUser(input) {
      const result = await client.query<{ id: string }>(`
        INSERT INTO users (email, display_name, role, password_hash, password_salt, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [input.email, input.displayName, input.role, input.passwordHash, input.passwordSalt, input.createdAt, input.updatedAt])
      return Number(result.rows[0].id)
    },
    async insertSession(input) {
      await client.query('INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4)', [input.userId, input.tokenHash, input.expiresAt, input.createdAt])
    },
    async revokeSession(tokenHash, revokedAt) {
      await client.query('UPDATE sessions SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL', [revokedAt, tokenHash])
    },
    async findUserByToken(tokenHash) {
      const result = await client.query<UserRow & { expiresAt: Date | string }>(`
        SELECT users.id, users.email, users.display_name AS "displayName", users.role, sessions.expires_at AS "expiresAt"
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = $1 AND sessions.revoked_at IS NULL
      `, [tokenHash])
      const row = result.rows[0]
      return row ? { ...publicUser(row), expiresAt: new Date(row.expiresAt).toISOString() } : undefined
    },
    async findCredentialsByUserId(id) {
      const result = await client.query<StoredCredentials>(`SELECT ${credentialColumns} FROM users WHERE id = $1`, [id])
      return result.rows[0]
    },
    async updateCredentials(id, credentials, updatedAt) {
      await client.query('UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3 WHERE id = $4', [credentials.passwordHash, credentials.passwordSalt, updatedAt, id])
    },
    async revokeUserSessions(id, revokedAt) {
      await client.query('UPDATE sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL', [revokedAt, id])
    },
    async listSupportAgents() {
      const result = await client.query<UserRow>(`SELECT ${userColumns} FROM users WHERE role IN ('admin', 'support_agent') ORDER BY lower(display_name)`)
      return result.rows.map(publicUser)
    },
    async listUsers() {
      const result = await client.query<UserRow>(`SELECT ${userColumns} FROM users ORDER BY role, lower(display_name)`)
      return result.rows.map(publicUser)
    },
  }
}
