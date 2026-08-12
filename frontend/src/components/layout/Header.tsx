import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import logoLumi from '../../assets/images/lumi-logo.png'
import { Button } from '../ui/button'
import { useAuth } from '../../contexts/AuthContext'

const navigationItems = [
	{ label: 'Filmes', href: '#sessoes' },
] as const

function Header() {
	const { user, isAuthenticated, logout } = useAuth()
	const [isScrolled, setIsScrolled] = useState(false)
	const [isProfileOpen, setIsProfileOpen] = useState(false)
	const profileRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}
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

	return (
		<header className={`fixed top-0 z-30 w-full transition-all duration-300 ${isScrolled ? 'bg-[var(--color-primary)] shadow-lg ' : 'bg-transparent'}`}>
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-2 py-0.5 sm:px-2 sm:py-1 lg:px-2">
				<Link to="/" className="flex items-center gap-3" aria-label="Ir para o inicio">
					<img
						src={logoLumi}
						alt="Lumi"
						className="h-20 w-auto sm:h-24 md:h-28"
					/>
				</Link>

				<nav aria-label="Navegacao principal" className="hidden items-center gap-2 p-1.5 md:flex">
					{navigationItems.map((item) => (
						<a
							key={item.label}
							href={item.href}
							className={linkClass}
						>
							{item.label}
						</a>
					))}
				</nav>

{/* CONFIG DE PERMISSOES */}
				<div className="flex items-center gap-3">
					{isAuthenticated ? (
						<>
							{user?.role === 'CLIENT' && (
								<Link to="/cliente/ingressos" className={`hidden items-center md:flex ${linkClass}`}>
									Meus ingressos
								</Link>
							)}
							{user?.role === 'ORGANIZER' && (
								<Link
									to="/organizador"
									className={`hidden items-center md:flex ${linkClass}`}
								>
									
									Administração
								</Link>
							)}
							{user?.role === 'GATEKEEPER' && (
								<Link to="/portaria" className={`hidden items-center md:flex ${linkClass}`}>
									Portaria
								</Link>
							)}
							<div ref={profileRef} className="relative">
								<button
									type="button"
									onClick={() => setIsProfileOpen((open) => !open)}
									className={`${linkClass} inline-flex items-center gap-2`}
									aria-expanded={isProfileOpen}
									aria-haspopup="menu"
								>
									<User className="h-4 w-4" />
									{user?.name}
								</button>
								{isProfileOpen && (
									<div role="menu" className="absolute right-0 top-full mt-2 min-w-36 rounded-xl border border-orange-100 bg-white p-1.5 shadow-lg">
										<button
											type="button"
											onClick={() => { setIsProfileOpen(false); logout() }}
											className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-orange-50 hover:text-[var(--color-primary-dark)]"
											role="menuitem"
										>
											<LogOut className="h-4 w-4" /> Sair
										</button>
									</div>
								)}
							</div>
						</>
					) : (
						<>
							<Link
								to="/login"
				className={`hidden sm:inline-flex ${linkClass}`}
							>
								Entrar
							</Link>
							<Link to="/cadastro">
								<Button variant={'outline2'} className={`${isScrolled ? 'text-[var(--color-surface)]' : ''}`}>
									Cadastre-se
								</Button>
							</Link>
						</>
					)}
				</div>
			</div>

			<nav aria-label="Navegacao mobile" className="border-t border-white/20 px-4 py-1 md:hidden">
				<div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
					{user?.role === 'CLIENT' && (
						<Link to="/cliente/ingressos" className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]">MEUS INGRESSOS</Link>
					)}
					{user?.role === 'ORGANIZER' && (
						<Link to="/organizador" className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]">
							Área do Organizador
						</Link>
					)}
					{user?.role === 'GATEKEEPER' && (
						<Link to="/portaria" className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]">PORTARIA</Link>
					)}
					{navigationItems.map((item) => (
						<a
							key={item.label}
							href={item.href}
							className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]"
						>
							{item.label}
						</a>
					))}
				</div>
			</nav>
		</header>
	)
}

export default Header
