import '../env.js'
import { inspectProductionConfig } from '../production-config.js'

const checks = inspectProductionConfig()
const passed = checks.filter((check) => check.passed).length
const failed = checks.length - passed

console.log('\nARIA Hosted PostgreSQL Deployment Preflight')
console.log('----------------------------------------')
for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name} - ${check.detail}`)
}
console.log('----------------------------------------')
console.log(`${passed}/${checks.length} checks passed`)

if (failed > 0) {
  console.error('Hosted deployment preflight failed. Fix the configuration before migration or rollout.')
  process.exit(1)
}

console.log('Hosted deployment configuration is ready for migration, backup, and rollout.')
