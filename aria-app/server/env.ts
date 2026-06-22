import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'

const envPath = resolve('.env')

if (existsSync(envPath)) {
  loadEnvFile(envPath)
}
