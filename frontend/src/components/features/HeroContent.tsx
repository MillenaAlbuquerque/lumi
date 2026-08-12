import { Button } from '../ui/button'

function HeroContent() {
  return (
    <div className="relative space-y-8 p-6 lg:p-4">
      {/* Decorative Popcorn SVG */}
      {/* <div className="pointer-events-none absolute -right-16 -top-8 opacity-30 lg:right-6 lg:top-2 lg:opacity-40">
        <img 
          src={pipocaSvg} 
          alt="" 
          className="h-56 w-56 rotate-12 lg:h-80 lg:w-80" 
        />
      </div> */}

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl space-y-6">
        {/* <div className="inline-flex items-center gap-3 rounded-full border-2 border-[var(--color-primary)]/30 bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent px-5 py-2.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]"></div>
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-primary-dark)]">
            Alguma coisa
          </span>
        </div> */}

        <h1 className="text-5xl font-extrabold leading-tight text-[var(--color-primary-dark)] sm:text-5xl lg:text-5xl">
          Sua experiência
          <span className="mt-2 block text-[var(--color-primary-dark)]">
            premium de cinema
          </span>
        </h1>

        <p className="text-lg leading-relaxed text-white/80 lg:text-xl">
            Descubra os melhores filmes, reserve seus ingressos e aproveite uma experiência cinematográfica inesquecível com a Lumi.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button size="lg" className="shadow-xl">
            Ver Filmes em Cartaz
          </Button>
          <Button variant="outline" size="lg">
            Meus Ingressos
          </Button>
        </div>
      </div>

      {/* Feature Cards */}
      {/* <div className="grid gap-4 sm:grid-cols-2">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-[var(--color-primary)]/20">
          <div className="mb-3 flex h-8 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-2xl">
            
          </div>
          <h3 className="mb-2 text-base font-bold text-white">Filmes em Alta</h3>
          <p className="text-sm text-white/70">Sempre atualizado com os lançamentos</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-2xl">
            
          </div>
          <h3 className="mb-2 text-base font-bold text-white">Reserva Rápida</h3>
          <p className="text-sm text-white/70">Compre em poucos cliques</p>
        </div>
      </div> */}
    </div>
  )
}

export default HeroContent
