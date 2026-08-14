const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export const API_BASE_URL = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl
  : `${configuredApiUrl}/api`
