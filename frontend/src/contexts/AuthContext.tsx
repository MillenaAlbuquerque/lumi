import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authService, type User } from '../services/authService'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  registerOrganizer: (name: string, email: string, password: string, cinemaName: string, cinemaAddress: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const restoreSession = async () => {
      const token = authService.getToken()
      if (!token) {
        authService.logout()
        if (active) setIsLoading(false)
        return
      }

      try {
        const currentUser = await authService.getCurrentUser(token)
        authService.setUser(currentUser)
        if (active) setUser(currentUser)
      } catch {
        authService.logout()
        if (active) setUser(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleSessionEnded = () => setUser(null)
    window.addEventListener('lumi:session-ended', handleSessionEnded)
    return () => window.removeEventListener('lumi:session-ended', handleSessionEnded)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { user: userData } = await authService.login({ email, password })
      setUser(userData)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      await authService.register({ name, email, password })
      // After registration, automatically log in
      await login(email, password)
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  const registerOrganizer = async (name: string, email: string, password: string, cinemaName: string, cinemaAddress: string) => {
    try {
      await authService.registerOrganizer({
        name,
        email,
        password,
        cinema: { name: cinemaName, address: cinemaAddress },
      })
      await login(email, password)
    } catch (error) {
      console.error('Organizer register error:', error)
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    registerOrganizer,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
