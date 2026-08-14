import { authService, type UserRole } from './authService'
import { API_BASE_URL } from './config'

export interface TeamMember { id: number; name: string; email: string; role: UserRole; cinema_id: number }
export interface CreateTeamMemberData { name: string; email: string; password: string }
export interface UpdateTeamMemberData { name: string; email: string; password?: string }

async function request<T>(endpoint = '', init?: RequestInit): Promise<T> {
  const token = authService.getToken()
  if (!token) {
    authService.logout()
    throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  }
  const response = await fetch(`${API_BASE_URL}/team${endpoint}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    if (response.status === 401) {
      authService.logout()
      throw new Error('Sua sessão expirou. Entre novamente para continuar.')
    }
    throw new Error(error?.detail || 'Não foi possível concluir a operação')
  }
  return response.status === 204 ? undefined as T : response.json()
}

export const teamService = {
  list: () => request<TeamMember[]>(),
  create: (data: CreateTeamMemberData) => request<TeamMember>('', { method: 'POST', body: JSON.stringify(data) }),
  update: (memberId: number, data: UpdateTeamMemberData) => request<TeamMember>(`/${memberId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (memberId: number) => request<void>(`/${memberId}`, { method: 'DELETE' }),
}
