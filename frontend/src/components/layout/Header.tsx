import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import logoLumi from '../../assets/images/lumi-logo.png'
import { Button } from '../ui/button'
import { useAuth } from '../../contexts/AuthContext'

const navigationItems = [{ label: 'Filmes', to: '/#sessoes' }] as const

function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const closeProfile = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setIsProfileOpen(false)
    }
    document.addEventListener('mousedown', closeProfile)
    return () => document.removeEventListener('mousedown', closeProfile)
  }, [])

  const linkClass = `border-b-2 border-transparent px-4 py-2 text-base font-medium transition-colors hover:border-[var(--color-primary-dark)] ${isScrolled ? 'text-white' : 'text-[var(--color-primary-dark)]'}`
  const mobileLinkClass = 'whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]'

  const roleLink = user?.role === 'CLIENT'
    ? { label: 'Meus ingressos', to: '/cliente/ingressos' }
    : user?.role === 'ORGANIZER'
      ? { label: 'Administração', to: '/organizador' }
      : user?.role === 'GATEKEEPER'
        ? { label: 'Portaria', to: '/portaria' }
        : null

  return (
    <header className={`fixed top-0 z-30 w-full transition-all duration-300 ${isScrolled ? 'bg-[var(--color-primary)] shadow-lg' : 'bg-transparent'}`}>
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-2 sm:h-24 md:h-28">
        <Link to="/" className="flex w-fit items-center gap-3" aria-label="Ir para o início">
          <img src={logoLumi} alt="Lumi" className="h-20 w-auto sm:h-24 md:h-28" />
        </Link>

        <nav aria-label="Navegação principal" className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 p-1.5 md:flex">
          {navigationItems.map((item) => <Link key={item.label} to={item.to} className={linkClass}>{item.label}</Link>)}
          <Link to="/cinemas" className={linkClass}>Cinemas</Link>
          {roleLink && <Link to={roleLink.to} className={linkClass}>{roleLink.label}</Link>}
        </nav>

        <div className="flex items-center justify-end gap-3">
          {isAuthenticated ? (
            <div ref={profileRef} className="relative">
              <button type="button" onClick={() => setIsProfileOpen((open) => !open)} className={`${linkClass} inline-flex items-center gap-2`} aria-expanded={isProfileOpen} aria-haspopup="menu">
                <User className="h-4 w-4" />
                {user?.name}
              </button>
              {isProfileOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 min-w-36 rounded-xl border border-orange-100 bg-white p-1.5 shadow-lg">
                  <button type="button" onClick={() => { setIsProfileOpen(false); logout() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-orange-50 hover:text-[var(--color-primary-dark)]" role="menuitem">
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className={`hidden sm:inline-flex ${linkClass}`}>Entrar</Link>
              <Link to="/cadastro"><Button variant="outline2" className={isScrolled ? 'text-[var(--color-surface)] border border-[var(--color-surface)]' : ''}>Cadastre-se</Button></Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Navegação mobile" className="border-t border-white/20 px-4 py-1 md:hidden">
        <div className="mx-auto flex max-w-7xl justify-center gap-2 overflow-x-auto">
          {navigationItems.map((item) => <Link key={item.label} to={item.to} className={mobileLinkClass}>{item.label}</Link>)}
          <Link to="/cinemas" className={mobileLinkClass}>Cinemas</Link>
          {roleLink && <Link to={roleLink.to} className={mobileLinkClass}>{roleLink.label}</Link>}
        </div>
      </nav>
    </header>
  )
}

export default Header
