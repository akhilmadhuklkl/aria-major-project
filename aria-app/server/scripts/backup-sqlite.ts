import '../env.js'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { db } from '../database.js'

const requestedPath = process.env.SQLITE_BACKUP_PATH?.trim()
const backupDirectory = resolve(process.env.SQLITE_BACKUP_DIR?.trim() || 'backups')
const backupPath = requestedPath
  ? resolve(requestedPath)
  : resolve(backupDirectory, `aria-${timestampForFilename()}.db`)

if (existsSync(backupPath)) {
  throw new Error(`Backup already exists: ${backupPath}`)
}

mkdirSync(dirname(backupPath), { recursive: true })

try {
  const escapedPath = backupPath.replaceAll("'", "''")
  db.exec(`VACUUM INTO '${escapedPath}'`)

  const backup = new DatabaseSync(backupPath, { readOnly: true })
  try {
    const result = backup.prepare('PRAGMA integrity_check').get() as { integrity_check?: string }
    if (result.integrity_check !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${result.integrity_check ?? 'unknown result'}`)
    }
  } finally {
    backup.close()
  }

  console.log(`SQLite backup created: ${backupPath}`)
  console.log('SQLite integrity check passed.')
} finally {
  db.close()
}

function timestampForFilename() {
  return new Date().toISOString().replaceAll(/[-:]/g, '').replaceAll(/\.\d{3}Z$/, 'Z')
}
