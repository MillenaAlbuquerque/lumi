import { authService } from './authService'

const API_BASE_URL = 'http://localhost:8000/api'

export interface OrganizerCinema {
  id: number
  name: string
  address: string
  organizer_id: number
}

export const organizerService = {
  async getMyCinema(): Promise<OrganizerCinema> {
    const response = await fetch(`${API_BASE_URL}/auth/me/cinema`, {
      headers: { Authorization: `Bearer ${authService.getToken()}` },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.detail || 'Não foi possível carregar o cinema')
    }

    return response.json()
  },
  async updateMyCinema(data: Pick<OrganizerCinema, 'name' | 'address'>): Promise<OrganizerCinema> {
    const response = await fetch(`${API_BASE_URL}/auth/me/cinema`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}` },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.detail || 'Não foi possível atualizar o cinema')
    }
    return response.json()
  },
}
