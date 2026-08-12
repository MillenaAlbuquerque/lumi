import Header from '../components/layout/Header'
import MovieCarousel from '../components/features/MovieCarousel'
import HeroContent from '../components/features/HeroContent'
import { MoviesSessionsSection } from '../components/features/movies-sessions'

function HomePage() {
  return (
    <div className="min-h-screen bg-mauve-950">
      <Header />

      <main id="home" className="px-6 pb-10 pt-24 sm:pt-28 md:pt-32">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.25fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <HeroContent />
          </div>

          <div className="order-1 lg:order-2 lg:pl-8">
            <MovieCarousel />
          </div>
        </div>
      </main>

      <MoviesSessionsSection />
    </div>
  )
}

export default HomePage
