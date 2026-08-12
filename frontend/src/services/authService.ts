const API_BASE_URL = 'http://localhost:8000/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role?: 'CLIENT' | 'ORGANIZER' | 'GATEKEEPER'
}

export interface OrganizerRegisterData extends Omit<RegisterData, 'role'> {
  cinema: {
    name: string
    address: string
  }
}

export type UserRole = 'CLIENT' | 'ORGANIZER' | 'GATEKEEPER'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

class AuthService {
  private readonly TOKEN_KEY = 'lumi_access_token'
  private readonly USER_KEY = 'lumi_user'

  async login(credentials: LoginCredentials): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Erro ao fazer login')
    }

    const authData: AuthResponse = await response.json()
    
    // Store token
    this.setToken(authData.access_token)

    // Get user data
    const user = await this.getCurrentUser(authData.access_token)
    this.setUser(user)

    return { token: authData.access_token, user }
  }

  async register(data: RegisterData): Promise<{ user: User }> {
    const payload = {
      ...data,
      role: data.role || 'CLIENT', // Default to CLIENT
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Erro ao fazer cadastro')
    }

    const user: User = await response.json()
    return { user }
  }

  async registerOrganizer(data: OrganizerRegisterData): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/register-organizer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Erro ao cadastrar cinema')
    }

    const result = await response.json()
    return { user: result.user }
  }

  async getCurrentUser(token?: string): Promise<User> {
    const authToken = token || this.getToken()
    if (!authToken) {
      throw new Error('Não autenticado')
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar dados do usuário')
    }

    return response.json()
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export const authService = new AuthService()
