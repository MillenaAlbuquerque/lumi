import { authService } from './authService'

const API_BASE_URL = 'http://localhost:8000/api'

export interface Room {
  id: number
  name: string
  capacity: number
  cinema_id: number
  created_at: string
  seats?: Array<{ id: number; row: string; number: number; seat_type: string }>
}

export interface CreateRoomData {
  name: string
  rows: number
  seats_per_row: number
}

async function authorizedRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = authService.getToken()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || 'Não foi possível concluir a operação')
  }

  return response.json()
}

export const roomService = {
  list: () => authorizedRequest<Room[]>('/rooms'),
  create: (data: CreateRoomData) =>
    authorizedRequest<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
}
