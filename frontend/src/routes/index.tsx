import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import LoginPage from '../components/pages/login'
import RoleProtectedRoute from '../components/auth/RoleProtectedRoute'
import OrganizerDashboardPage from '../pages/organizer/OrganizerDashboardPage'
import GatekeeperPage from '../pages/gatekeeper/GatekeeperPage'
import ClientTicketsPage from '../pages/client/ClientTicketsPage'
import SharedTicketPage from '../pages/client/SharedTicketPage'
import CinemasPage from '../pages/CinemasPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/cinemas',
    element: <CinemasPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/cadastro',
    element: <LoginPage />,
  },
  {
    path: '/organizador',
    element: (
      <RoleProtectedRoute allowedRoles={['ORGANIZER']}>
        <OrganizerDashboardPage />
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/cliente/ingressos',
    element: (
      <RoleProtectedRoute allowedRoles={['CLIENT']}>
        <ClientTicketsPage />
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/ingresso/compartilhado/:shareToken',
    element: <SharedTicketPage />,
  },
  {
    path: '/portaria',
    element: (
      <RoleProtectedRoute allowedRoles={['GATEKEEPER']}>
        <GatekeeperPage />
      </RoleProtectedRoute>
    ),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
