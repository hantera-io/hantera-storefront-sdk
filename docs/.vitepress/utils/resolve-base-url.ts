export function resolveBaseUrl(tenant: string): string {
  const trimmed = tenant.trim()
  if (!trimmed) return ''

  let host: string
  if (trimmed === 'localhost') {
    host = 'localhost:3300'
  } else if (trimmed.includes('.')) {
    host = trimmed
  } else {
    host = `core.${trimmed}.hantera.cloud`
  }

  const protocol = host.startsWith('localhost') ? 'https' : 'https'
  return `${protocol}://${host}`
}
