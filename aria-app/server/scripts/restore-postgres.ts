import '../env.js'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const inputPath = resolve(process.argv[2] ?? process.env.POSTGRES_BACKUP_PATH ?? '')
const databaseUrl = process.env.DATABASE_URL?.trim()

async function main() {
  if (!process.argv[2] && !process.env.POSTGRES_BACKUP_PATH?.trim()) {
    throw new Error('Usage: POSTGRES_RESTORE_CONFIRM=YES npm run restore:postgres -- backups/aria-postgres.dump')
  }
  if (!existsSync(inputPath)) throw new Error(`PostgreSQL backup does not exist: ${inputPath}`)
  if (!databaseUrl) throw new Error('DATABASE_URL is required to restore PostgreSQL')
  if (process.env.POSTGRES_RESTORE_CONFIRM !== 'YES') {
    throw new Error('Restore is destructive. Set POSTGRES_RESTORE_CONFIRM=YES to continue.')
  }

  await runCommand('pg_restore', ['--list', inputPath], databaseUrl)
  await runCommand('pg_restore', [
    '--dbname', databaseUrl,
    '--clean',
    '--if-exists',
    '--exit-on-error',
    '--single-transaction',
    '--no-owner',
    '--no-privileges',
    inputPath,
  ], databaseUrl)

  console.log(`PostgreSQL backup restored: ${inputPath}`)
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

async function runCommand(command: string, args: string[], secret: string) {
  try {
    await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 8 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${command} failed: ${detail.replaceAll(secret, '[redacted]')}`, { cause: error })
  }
}
