import { verifyDeployment } from '../deployment-verification.js'

const apiBaseUrl = process.env.PRODUCTION_API_URL?.trim() ?? ''
const checks = await verifyDeployment(apiBaseUrl, {
  expectedDatabase: process.env.EXPECTED_DATABASE_ENGINE,
  token: process.env.SMOKE_API_TOKEN,
})
const passed = checks.filter((check) => check.passed).length
const failed = checks.length - passed

console.log('\nARIA Hosted Deployment Verification')
console.log('----------------------------------------')
for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name} - ${check.detail}`)
}
console.log('----------------------------------------')
console.log(`${passed}/${checks.length} checks passed`)

if (failed > 0) {
  console.error('Deployment verification failed. Keep traffic away from this deployment until the failed checks are resolved.')
  process.exit(1)
}

console.log('Deployment is ready for the read-only API smoke suite.')
