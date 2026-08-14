import { authService } from './authService'

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const API_BASE_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`

export interface SessionTicketSales {
  event_id: number
  movie_id: number
  movie_title: string
  poster_url: string | null
  room_name: string
  start_datetime: string
  capacity: number
  tickets_sold: number
  tickets_used: number
  revenue: number
  occupancy_percentage: number
}

export interface TicketDashboard {
  tickets_sold: number
  tickets_used: number
  total_revenue: number
  sessions_with_sales: number
  sessions: SessionTicketSales[]
}

export const organizerTicketService = {
  async dashboard(): Promise<TicketDashboard> {
    const response = await fetch(`${API_BASE_URL}/organizer/tickets/dashboard`, {
      headers: { Authorization: `Bearer ${authService.getToken()}` },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail || 'Não foi possível carregar as vendas de ingressos.')
    }
    return response.json()
  },
}
