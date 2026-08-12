import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft, ArrowRight, Building2, FileText, MapPin, Phone } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useAuth } from '../../contexts/AuthContext'
import logoLumi from '../../assets/images/lumi-logo.png'
import cinema from '../../assets/images/cinema.jpg'

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, register, registerOrganizer } = useAuth()
  const defaultTab = location.pathname === '/cadastro' ? 'signup' : 'login'
  
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [showCinemaSignup, setShowCinemaSignup] = useState(false)
  const [cinemaName, setCinemaName] = useState('')
  const [cinemaCnpj, setCinemaCnpj] = useState('')
  const [cinemaPhone, setCinemaPhone] = useState('')
  const [cinemaAddress, setCinemaAddress] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      await login(loginEmail, loginPassword)
      navigate('/')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('As senhas não coincidem!')
      return
    }

    if (signupPassword.length < 8) {
      setSignupError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setSignupLoading(true)

    try {
      await register(signupName, signupEmail, signupPassword)
      navigate('/')
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao criar conta')
    } finally {
      setSignupLoading(false)
    }
  }

  const handleOpenCinemaSignup = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form

    setSignupError('')

    if (!form?.reportValidity()) return

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('As senhas não coincidem!')
      return
    }

    if (signupPassword.length < 8) {
      setSignupError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setShowCinemaSignup(true)
  }

  const handleCinemaSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')
    setSignupLoading(true)

    try {
      await registerOrganizer(signupName, signupEmail, signupPassword, cinemaName, cinemaAddress)
      navigate('/')
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Erro ao cadastrar cinema')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-cover bg-center" style={{ backgroundImage: `url(${cinema})` }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(248,186,81,0.18),_transparent_25%),linear-gradient(to_bottom_right,_rgba(15,23,42,0.60),_rgba(15,23,42,0.88))]" />
      <div className="relative flex min-h-screen items-center justify-center lg:justify-end px-12 py-8">
        <div className="absolute left-8 top-8 hidden lg:flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-12 w-12 items-center justify-center text-white transition hover:bg-white/20 rounded-full"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={logoLumi} alt="Lumi" className="h-28 w-auto" />
        </div>
        <div className="absolute left-30 top-1/2 hidden lg:block -translate-y-1/2 text-white max-w-lg">
          <h2 className="text-5xl font-bold mb-4 leading-tight">
            <span className="bg-clip-text text-transparent bg-[var(--color-primary-dark)]">
              Bem-vindo ao Lumi
            </span>
          </h2>
          <p className="text-xl text-white/85 max-w-sm">
            Entre ou cadastre-se para reservar seus ingressos.
          </p>
        </div>

        <div className="w-full max-w-md lg:mr-12 bg-[var(--color-surface)]/60   p-8 rounded-3xl shadow-2xl shadow-black/30">
          <div className="lg:hidden mb-8 text-center">
            <img src={logoLumi} alt="Lumi" className="h-20 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Bem-vindo ao Lumi</h1>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 ">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastro
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-mauve-12">Entrar na sua conta</CardTitle>
                  <CardDescription className="text-mauve-11">
                    Digite seu e-mail e senha para acessar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {loginError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-600">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-sm font-medium text-mauve-12">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-sm font-medium text-mauve-12">
                        Senha
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>

                    {/* <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-white/70 cursor-pointer">
                        <input type="checkbox" className="rounded border-white/20" />
                        Lembrar-me
                      </label>
                      <a href="#" className="text-[var(--color-primary-dark)] hover:text-[var(--color-primary)] transition">
                        Esqueceu a senha?
                      </a>
                    </div> */}

                    <Button type="submit" className="w-full" size="lg" disabled={loginLoading}>
                      {loginLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              {!showCinemaSignup ? (
              <Card className="min-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-2xl text-mauve-12">Criar uma conta</CardTitle>
                  <CardDescription className="text-mauve-11">
                    Preencha os dados para se cadastrar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    {signupError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-600">
                        {signupError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="signup-name" className="text-sm font-medium text-mauve-12">
                        Nome completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="signup-email" className="text-sm font-medium text-mauve-12">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="signup-password" className="text-sm font-medium text-mauve-12">
                        Senha
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="signup-confirm-password" className="text-sm font-medium text-mauve-12">
                        Confirmar senha
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="pl-10 bg-white/50 text-mauve-12"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleOpenCinemaSignup}
                      variant="link"
                      className="group ml-auto flex items-center justify-end gap-2 p-0 text-base text-[var(--color-primary-dark)] transition hover:translate-x-1 hover:text-[var(--color-primary)]"
                    >
                      <span>Cadastre seu cinema</span><ArrowRight></ArrowRight>
                      <span className="text-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>
                    </Button>

                    <Button type="submit" className="w-full" size="lg" disabled={signupLoading}>
                      {signupLoading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              ) : (
                <Card className="min-h-[510px] animate-in fade-in slide-in-from-right-4 duration-300">
                  <CardHeader>
                    <button
                      type="button"
                      onClick={() => setShowCinemaSignup(false)}
                      className="mb-2 flex w-fit items-center gap-2 text-sm text-mauve-11 transition hover:text-[var(--color-primary-dark)]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar aos seus dados
                    </button>
                    <CardTitle className="text-2xl text-mauve-12">Cadastre seu cinema</CardTitle>
                    <CardDescription className="text-mauve-11">
                      Complete as informações do estabelecimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCinemaSignup} className="space-y-4">
                      {signupError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-600">
                          {signupError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="cinema-name" className="text-sm font-medium text-mauve-12">Nome do cinema</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                          <Input id="cinema-name" value={cinemaName} onChange={(e) => setCinemaName(e.target.value)} placeholder="Ex.: Lumi Cinemas" className="pl-10 bg-white/50 text-mauve-12" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="cinema-cnpj" className="text-sm font-medium text-mauve-12">CNPJ</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                          <Input id="cinema-cnpj" value={cinemaCnpj} onChange={(e) => setCinemaCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="pl-10 bg-white/50 text-mauve-12" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="cinema-phone" className="text-sm font-medium text-mauve-12">Telefone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                          <Input id="cinema-phone" type="tel" value={cinemaPhone} onChange={(e) => setCinemaPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-10 bg-white/50 text-mauve-12" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="cinema-address" className="text-sm font-medium text-mauve-12">Endereço completo</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve-12" />
                          <Input id="cinema-address" value={cinemaAddress} onChange={(e) => setCinemaAddress(e.target.value)} placeholder="Rua, número, bairro e cidade" className="pl-10 bg-white/50 text-mauve-12" required />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" size="lg" disabled={signupLoading}>
                        {signupLoading ? 'Cadastrando...' : 'Finalizar cadastro'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
