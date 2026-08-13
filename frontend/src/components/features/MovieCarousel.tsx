import { useEffect, useRef, useState } from 'react'
import { useMovies } from '../../contexts/MoviesContext'
import type { Movie } from '../../services/movieService'

const DRAG_THRESHOLD = 60

function MovieCarousel() {
  const { movies, loading, error } = useMovies()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hasAdvanced, setHasAdvanced] = useState(false)
  const dragStartX = useRef<number | null>(null)

  const getTMDBImageUrl = (posterPath: string | null): string | null => {
    if (!posterPath) return null
    // Se já é uma URL completa, retorna como está
    if (posterPath.startsWith('http')) return posterPath
    // Se é um placeholder inválido
    if (posterPath === 'string') return null
    // Se começa com '/', é um caminho do TMDB
    if (posterPath.startsWith('/')) {
      return `https://image.tmdb.org/t/p/w500${posterPath}`
    }
    return posterPath
  }

  const goTo = (index: number) => {
    const total = movies.length
    if (total === 0) return
    setHasAdvanced(true)
    setSelectedIndex(((index % total) + total) % total)
  }
  const goPrev = () => goTo(selectedIndex - 1)
  const goNext = () => goTo(selectedIndex + 1)

  useEffect(() => {
    if (movies.length <= 1 || isDragging) return
    const interval = setInterval(() => {
      setHasAdvanced(true)
      setSelectedIndex((current) => (current + 1) % movies.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [movies.length, isDragging])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    setDragOffset(e.clientX - dragStartX.current)
  }

  const handlePointerUp = () => {
    if (dragStartX.current === null) return
    if (dragOffset > DRAG_THRESHOLD) {
      goPrev()
    } else if (dragOffset < -DRAG_THRESHOLD) {
      goNext()
    }
    dragStartX.current = null
    setIsDragging(false)
    setDragOffset(0)
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-950/20 border-t-amber-950"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <p className="text-amber-950/60">{error}</p>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div className="flex min-h-[700px] items-center justify-center">
        <p className="text-amber-950/60">Nenhum filme disponível no momento</p>
      </div>
    )
  }

  const total = movies.length
  const mainMovie = movies[selectedIndex]
  const prevIndex = (selectedIndex - 1 + total) % total
  const nextIndex = (selectedIndex + 1) % total
  const prevMovie = total > 1 ? movies[prevIndex] : null
  const nextMovie = total > 1 ? movies[nextIndex] : null

  const renderSidePoster = (movie: Movie) => {
    const url = getTMDBImageUrl(movie.poster_url)
    return url ? (
      <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-4xl">
        {/* //COLOCAR O QUE DEVE APARECER SE NAO HOUVER FILMES */}
      </div>
    )
  }

  //POSTERES
  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-0">
      <div
        className="relative flex min-h-[380px] touch-pan-y select-none items-center justify-center overflow-hidden py-4 cursor-grab active:cursor-grabbing sm:min-h-[520px] sm:py-6 lg:min-h-[640px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {prevMovie && (
          <button
            key={`previous-${prevMovie.id}-${selectedIndex}`}
            type="button"
            onClick={goPrev}
            aria-label={`Filme anterior: ${prevMovie.title}`}
            className="movie-carousel-side-enter absolute right-0 z-10 hidden h-[70%] w-[30%] translate-x-[16%] scale-[0.85] overflow-hidden rounded-3xl opacity-40 shadow-xl transition-all duration-500 hover:translate-x-[12%] hover:opacity-60 sm:block sm:h-[78%] sm:w-[34%]"
          >
            {renderSidePoster(prevMovie)}
          </button>
        )}

        <div
          key={`main-${mainMovie.id}-${selectedIndex}`}
          className={`relative z-20 w-[85%] max-w-[220px] sm:w-[68%] sm:max-w-xs md:max-w-sm lg:max-w-md ${isDragging ? '' : 'movie-carousel-main-enter'}`}
          style={{
            transform: isDragging || dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 300ms ease',
          }}
        >
          <div className="group relative overflow-hidden rounded-[2rem] shadow-[0_35px_80px_rgba(0,0,0,0.35)]">
            {getTMDBImageUrl(mainMovie.poster_url) ? (
              <img
                src={getTMDBImageUrl(mainMovie.poster_url)!}
                alt={mainMovie.title}
                draggable={false}
                className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-950/40">
                <span className="text-6xl">🎬</span>
              </div>
            )}
            
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-4 pb-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:p-6 sm:pb-20">
              <h3 className="text-base font-semibold text-white line-clamp-2 sm:text-lg md:text-xl">
                {mainMovie.title}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-white/90 sm:text-sm">
                {mainMovie.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {mainMovie.duration_minutes} min
                  </span>
                )}
                {mainMovie.rating && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {mainMovie.rating}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {nextMovie && hasAdvanced && (
          <button
            key={`next-${nextMovie.id}-${selectedIndex}`}
            type="button"
            onClick={goNext}
            aria-label={`Próximo filme: ${nextMovie.title}`}
            className="movie-carousel-side-enter absolute left-0 z-10 hidden h-[70%] w-[30%] -translate-x-[16%] scale-[0.85] overflow-hidden rounded-3xl opacity-40 shadow-xl transition-all duration-500 hover:-translate-x-[12%] hover:opacity-60 sm:block sm:h-[78%] sm:w-[34%]"
          >
            {renderSidePoster(nextMovie)}
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="mt-4 flex justify-center gap-2 sm:mt-6">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? 'w-8 bg-[var(--color-primary-dark)]'
                  : 'w-2 bg-[var(--color-primary-dark)] hover:bg-[var(--color-primary-dark)]/50'
              }`}
              aria-label={`Ir para filme ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MovieCarousel

