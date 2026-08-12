interface Session {
  id: number
  startTime: string
  endTime: string
  roomName: string
  availableSeats: number
}

interface SessionsListProps {
  sessions: Session[]
  movieTitle: string
}

function SessionsList({ sessions, movieTitle }: SessionsListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-white">
        Sessões - {movieTitle}
      </h3>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-xl border border-[var(--color-primary)]/30 bg-white/5 p-4 backdrop-blur-sm transition hover:border-[var(--color-primary)]/50"
          >
            <div className="mb-2 text-lg font-bold text-[var(--color-primary)]">
              {session.startTime}
            </div>
            <div className="text-sm text-white/70">
              <div>Sala: {session.roomName}</div>
              <div>Assentos disponíveis: {session.availableSeats}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SessionsList
