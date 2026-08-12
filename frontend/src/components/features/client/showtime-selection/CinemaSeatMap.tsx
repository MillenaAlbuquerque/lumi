import { Armchair } from 'lucide-react'
import type { AvailableSeat } from '../../../../services/clientShowtimeService'

interface CinemaSeatMapProps {
  seats: AvailableSeat[]
  selectedSeatIds: number[]
  onToggle: (seat: AvailableSeat) => void
}

function CinemaSeatMap({ seats, selectedSeatIds, onToggle }: CinemaSeatMapProps) {
  const rows = seats.reduce<Record<string, AvailableSeat[]>>((result, seat) => {
    result[seat.row] = [...(result[seat.row] || []), seat].sort((a, b) => a.number - b.number)
    return result
  }, {})

  if (seats.length === 0) {
    return <p className="py-10 text-center text-white/50">Esta sala não possui assentos configurados.</p>
  }

  return <div className="overflow-x-auto pb-2">
    <div className="mx-auto min-w-max px-5 py-2">
      <div className="mx-auto mb-2 w-[min(34rem,75vw)]">
        <div className="h-1 bg-[var(--color-primary)]" />
        <p className="mt-3 mb-2 text-center text-sm font-medium text-[var(--color-primary)]">TELA</p>
      </div>

      <div className="flex flex-col items-center gap-3 [perspective:900px]">
        {Object.entries(rows).map(([row, rowSeats], rowIndex) => <div
          key={row}
          className="flex items-center justify-center gap-3"
          style={{ transform: `translateZ(${rowIndex * -2}px)` }}
        >
          <span className="w-5 text-right text-sm font-medium text-white">{row}</span>
          <div className="flex items-end justify-center gap-2.5">
            {rowSeats.map((seat, seatIndex) => {
              const previousSeat = rowSeats[seatIndex - 1]
              const missingSeats = previousSeat ? Math.max(0, seat.number - previousSeat.number - 1) : 0
              const selected = selectedSeatIds.includes(seat.id)
              const stateClass = seat.occupied
                ? 'cursor-not-allowed text-slate-600 opacity-55'
                : selected
                  ? 'text-white'
                  : 'text-white/65 hover:-translate-y-1 hover:text-orange-300 hover:drop-shadow-[0_0_7px_rgba(253,186,116,0.45)]'

              return <div key={seat.id} className="flex items-end" style={{ marginLeft: missingSeats ? `${missingSeats * 2.75}rem` : undefined }}>
                <button
                  type="button"
                  disabled={seat.occupied}
                  onClick={() => onToggle(seat)}
                  aria-pressed={selected}
                  aria-label={`Assento ${seat.row}${seat.number}, ${seat.occupied ? 'ocupado' : selected ? 'selecionado' : 'disponível'}`}
                  title={`${seat.row}${seat.number} · ${seat.seat_type}`}
                  className={`group flex w-9 flex-col items-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-mauve-950 ${stateClass}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center ${selected ? 'rounded-full bg-[var(--color-primary)]' : ''}`}><Armchair className={`h-6 w-6 fill-current/15 stroke-[1.8] transition duration-200 group-active:scale-90 ${selected ? 'text-white' : 'text-[var(--color-primary)]'}`} /></span>
                  <span className="mt-0.5 text-sm font-semibold text-white leading-none">{seat.number}</span>
                </button>
              </div>
            })}
          </div>
          <span className="w-5 text-left text-sm font-medium text-white">{row}</span>
        </div>)}
      </div>
    </div>

    <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-white/50">
      <span className="flex items-center text-white gap-1"><Armchair className="h-5 w-5 text-[var(--color-primary)]" />Disponível</span>
      <span className="flex items-center gap-1 text-white"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] "><Armchair className="h-5 w-5 fill-current/15 text-white" /></span>Selecionado</span>
      <span className="flex items-center text-white gap-1"><Armchair className="h-5 w-5 text-slate-600 opacity-60" />Ocupado</span>
    </div>
  </div>
}

export default CinemaSeatMap
