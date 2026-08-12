import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../services/authService'

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <span className="text-[var(--color-primary-dark)]">Verificando permissões...</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" replace />

  return children
}

export default RoleProtectedRoute
