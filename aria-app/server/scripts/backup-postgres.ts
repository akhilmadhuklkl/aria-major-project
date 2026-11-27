import '../env.js'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { promisify } from 'node:util'
import { dirname, resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
if (!databaseUrl) throw new Error('DATABASE_URL is required to back up PostgreSQL')

const requestedPath = process.env.POSTGRES_BACKUP_PATH?.trim()
const backupDirectory = resolve(process.env.POSTGRES_BACKUP_DIR?.trim() || 'backups')
const backupPath = requestedPath
  ? resolve(requestedPath)
  : resolve(backupDirectory, `aria-postgres-${timestampForFilename()}.dump`)

async function main() {
  if (existsSync(backupPath)) throw new Error(`Backup already exists: ${backupPath}`)
  mkdirSync(dirname(backupPath), { recursive: true })

  try {
    await runCommand('pg_dump', [
      '--dbname', databaseUrl,
      '--format=custom',
      '--file', backupPath,
      '--no-owner',
      '--no-privileges',
    ], databaseUrl)
    await runCommand('pg_restore', ['--list', backupPath], databaseUrl)
    console.log(`PostgreSQL backup created: ${backupPath}`)
    console.log('Backup archive validation passed.')
  } catch (error) {
    if (existsSync(backupPath)) unlinkSync(backupPath)
    throw error
  }
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

function timestampForFilename() {
  return new Date().toISOString().replaceAll(/[-:]/g, '').replaceAll(/\.\d{3}Z$/, 'Z')
}
