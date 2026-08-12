import { AuthProvider } from './contexts/AuthContext'
import { MoviesProvider } from './contexts/MoviesContext'
import { AppRouter } from './routes'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <MoviesProvider>
        <AppRouter />
      </MoviesProvider>
    </AuthProvider>
  )
}

export default App
