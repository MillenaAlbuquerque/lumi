import { authService, type UserRole } from './authService'

const API_BASE_URL = 'http://localhost:8000/api'

export interface TeamMember { id: number; name: string; email: string; role: UserRole; cinema_id: number }
export interface CreateTeamMemberData { name: string; email: string; password: string }

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/team`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}`, ...init?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || 'Não foi possível concluir a operação')
  }
  return response.json()
}

export const teamService = {
  list: () => request<TeamMember[]>(),
  create: (data: CreateTeamMemberData) => request<TeamMember>({ method: 'POST', body: JSON.stringify(data) }),
}
