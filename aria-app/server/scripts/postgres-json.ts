export function serializeJsonb(value: unknown, fallback: unknown = null): string | null {
  const source = value === null || value === undefined || value === '' ? fallback : value
  if (source === null || source === undefined) return null

  return JSON.stringify(typeof source === 'string' ? JSON.parse(source) : source)
}
