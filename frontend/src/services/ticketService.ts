import { authService } from './authService'

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const API_BASE_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`

export interface ClientTicket {
  id: number
  status: 'issued' | 'used' | 'cancelled'
  issued_at: string
  reservation_id: number
  session_id: number
  movie_title: string
  poster_url: string | null
  cinema_name: string
  cinema_address: string
  room_name: string
  session_datetime: string
  projection_type: string
  seat_row: string
  seat_number: number
  price: number
  token: string
  manual_code: string
}

export const ticketService = {
  async list(): Promise<ClientTicket[]> {
    const token = authService.getToken()
    const response = await fetch(`${API_BASE_URL}/client/tickets`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail || 'Não foi possível carregar seus ingressos.')
    }
    return response.json()
  },
  async share(ticketId: number): Promise<{ share_url: string; expires_at: string }> {
    const token = authService.getToken()
    const response = await fetch(`${API_BASE_URL}/client/tickets/${ticketId}/share`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Não foi possível gerar o link de compartilhamento.')
    return response.json()
  },
  async cancel(ticketId: number): Promise<ClientTicket> {
    const token = authService.getToken()
    const response = await fetch(`${API_BASE_URL}/client/tickets/${ticketId}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail || 'Não foi possível cancelar o ingresso.')
    }
    return response.json()
  },
  async getShared(shareToken: string): Promise<Omit<ClientTicket, 'id' | 'issued_at' | 'reservation_id' | 'session_id' | 'price'>> {
    const response = await fetch(`${API_BASE_URL}/tickets/shared/${encodeURIComponent(shareToken)}`)
    if (!response.ok) throw new Error('Este link não existe ou expirou.')
    return response.json()
  },
}
