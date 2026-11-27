export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const logPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

type LogContext = Record<string, unknown>

function configuredLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.trim().toLowerCase()
  return value === 'debug' || value === 'warn' || value === 'error' ? value : 'info'
}

function shouldLog(level: LogLevel) {
  return logPriority[level] >= logPriority[configuredLevel()]
}

export function logEvent(level: LogLevel, event: string, context: LogContext = {}) {
  if (!shouldLog(level)) return

  const payload = {
    timestamp: new Date().toISOString(),
    service: 'aria-api',
    level,
    event,
    ...context,
  }

  if (process.env.LOG_FORMAT?.trim().toLowerCase() === 'json' || process.env.NODE_ENV === 'production') {
    const line = JSON.stringify(payload)
    if (level === 'error' || level === 'warn') console.error(line)
    else console.log(line)
    return
  }

  const details = Object.entries(context)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ')
  const line = `[${payload.timestamp}] ${level.toUpperCase()} ${event}${details ? ` ${details}` : ''}`
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
