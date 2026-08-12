import { authService } from './authService'

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const API_BASE_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`

export interface EntranceEvent { id: number; movie_title: string; room_name: string; start_datetime: string; projection_type: string }
export interface EntranceResult { result: 'valid' | 'invalid' | 'used' | 'wrong_event'; message: string; ticket_id?: number; movie_title?: string; room_name?: string; seat?: string; used_at?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authService.getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || 'Não foi possível comunicar com a portaria.')
  }
  return response.json()
}

export const entranceService = {
  listEvents: () => request<EntranceEvent[]>('/entrance/events'),
  validate: (eventId: number, token: string) => request<EntranceResult>('/entrance/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: eventId, token }),
  }),
}
