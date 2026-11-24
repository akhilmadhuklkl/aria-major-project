type RouteMetric = { requests: number; errors: number; totalLatencyMs: number }

const startedAt = new Date().toISOString()
let requestCount = 0
let errorCount = 0
let totalLatencyMs = 0
const routes = new Map<string, RouteMetric>()

export function recordRequest(input: { method: string; route: string; status: number; latencyMs: number }) {
  requestCount += 1
  totalLatencyMs += input.latencyMs
  const failed = input.status >= 400
  if (failed) errorCount += 1
  const key = `${input.method.toUpperCase()} ${input.route}`
  const current = routes.get(key) ?? { requests: 0, errors: 0, totalLatencyMs: 0 }
  current.requests += 1
  current.errors += failed ? 1 : 0
  current.totalLatencyMs += input.latencyMs
  routes.set(key, current)
}

export function getRuntimeMetrics() {
  return {
    startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    requests: requestCount,
    errors: errorCount,
    errorRate: requestCount ? Number((errorCount / requestCount).toFixed(3)) : 0,
    averageLatencyMs: requestCount ? Math.round(totalLatencyMs / requestCount) : 0,
    routes: [...routes.entries()]
      .map(([route, metric]) => ({ route, requests: metric.requests, errors: metric.errors, averageLatencyMs: Math.round(metric.totalLatencyMs / metric.requests) }))
      .sort((first, second) => second.requests - first.requests)
      .slice(0, 20),
  }
}
