import { authService } from './authService'
import { API_BASE_URL as API_ROOT_URL } from './config'

const API_BASE_URL = `${API_ROOT_URL}/client/showtimes`
const SEAT_UPDATES_URL = API_BASE_URL.replace(/^http/, 'ws')

export interface AvailableMovie { id: number; title: string; poster_url: string | null; duration_minutes: number; description: string | null; rating: string | null; release_date: string | null; backdrop_url: string | null }
export interface AvailableCinema { id: number; name: string; address: string }
export interface AvailableSession { id: number; movie_id: number; cinema_id: number; room_id: number; room_name: string; start_datetime: string; projection_type: string; price: number }
export interface AvailableSeat { id: number; row: string; number: number; seat_type: 'standard' | 'vip' | 'accessible'; occupied: boolean }
export interface SessionSeatAvailability { session: AvailableSession; seats: AvailableSeat[] }
export interface SeatUpdate { type: 'connected' | 'seats_occupied' | 'seats_held' | 'seats_released'; session_id: number; seat_ids?: number[] }
export interface SeatHold { id: number; session_id: number; seat_ids: number[]; expires_at: string }

export class ShowtimeRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ShowtimeRequestError'
    this.status = status
  }
}

async function get<T>(endpoint: string): Promise<T> {
  const token = authService.getToken()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new ShowtimeRequestError(error?.detail || 'Não foi possível carregar as sessões', response.status)
  }
  return response.json()
}

export const clientShowtimeService = {
  listAvailableCinemas: () => get<AvailableCinema[]>('/cinemas'),
  listCinemaMovies: (cinemaId: number) => get<AvailableMovie[]>(`/cinemas/${cinemaId}/movies`),
  listMovies: (date?: string) => get<AvailableMovie[]>(date ? `/movies?date=${encodeURIComponent(date)}` : '/movies'),
  listCinemas: (movieId: number) => get<AvailableCinema[]>(`/movies/${movieId}/cinemas`),
  listSessions: (movieId: number, cinemaId: number) => get<AvailableSession[]>(`/movies/${movieId}/cinemas/${cinemaId}/sessions`),
  listSessionSeats: (sessionId: number) => get<SessionSeatAvailability>(`/sessions/${sessionId}/seats`),
  createSeatHold: async (sessionId: number, seatIds: number[]): Promise<SeatHold> => {
    const token = authService.getToken()
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/holds`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_ids: seatIds }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new ShowtimeRequestError(error?.detail || 'Não foi possível bloquear os assentos.', response.status)
    }
    return response.json()
  },
  releaseSeatHold: async (holdId: number): Promise<void> => {
    const token = authService.getToken()
    await fetch(`${API_BASE_URL}/holds/${holdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  subscribeToSeatUpdates: (sessionId: number, onUpdate: (update: SeatUpdate) => void) => {
    const token = authService.getToken()
    if (!token) return () => undefined

    let closed = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined

    const connect = () => {
      socket = new WebSocket(`${SEAT_UPDATES_URL}/sessions/${sessionId}/seats/live`)
      socket.addEventListener('open', () => {
        if (closed) {
          socket?.close()
          return
        }
        socket?.send(JSON.stringify({ type: 'authenticate', token }))
      })
      socket.addEventListener('message', (event) => {
        try {
          onUpdate(JSON.parse(event.data) as SeatUpdate)
        } catch {
          // Ignore malformed messages and keep the live channel available.
        }
      })
      socket.addEventListener('close', (event) => {
        if (!closed && event.code !== 1008) reconnectTimer = window.setTimeout(connect, 1500)
      })
    }

    connect()
    return () => {
      closed = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      if (socket?.readyState === WebSocket.OPEN) socket.close()
    }
  },
  saveSelection: (session: AvailableSession) => sessionStorage.setItem('lumi_selected_session', JSON.stringify(session)),
}
