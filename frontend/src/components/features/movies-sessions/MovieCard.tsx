import { Card, CardContent } from '../../ui/card'
import { CalendarDays } from 'lucide-react'

interface MovieCardProps {
  id: number
  title: string
  posterPath: string
  duration?: number
  onClick?: () => void
}

function MovieCard({ title, posterPath, duration, onClick }: MovieCardProps) {
  return (
    <Card 
      className="group relative cursor-pointer overflow-hidden border-white/10 bg-[white/5 ]backdrop-blur-sm transition-all hover:scale-105 hover:border-[var(--color-primary)]/50 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault()
          onClick()
        }
      }}
      aria-label={`Ver detalhes e sessões de ${title}`}
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={posterPath}
          alt={title}
          className="h-4xl w-2xl object-cover transition-transform group-hover:scale-110"
        />
      </div>
      
      <CardContent className="relative h-14 overflow-hidden p-3">
        <div className="absolute inset-x-3 top-3 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:opacity-0 group-focus-visible:-translate-y-3 group-focus-visible:opacity-0">
          <h3 className="line-clamp-1 text-sm font-bold text-[var(--color-primary)]">{title}</h3>
          <div className="mt-1 flex items-center justify-between text-xs text-white">
            {duration && <span>{duration} min</span>}
          </div>
        </div>
        <div className="absolute inset-0 flex translate-y-3 items-center justify-center gap-2 font-medium text-[var(--color-primary)] opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <CalendarDays className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
          <span>Ver sessões</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default MovieCard
