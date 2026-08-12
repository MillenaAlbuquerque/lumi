import { useEffect, useState } from 'react'
import { DoorOpen, Settings, TicketCheck, Film, Users, TvMinimalPlay } from 'lucide-react'
import RoomManager from '../../components/features/organizer/rooms/RoomManager'
import TeamManager from '../../components/features/organizer/team/TeamManager'
import SessionManager from '../../components/features/organizer/sessions/SessionManager'
import TicketManager from '../../components/features/organizer/tickets/TicketManager'
import Header from '../../components/layout/Header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { organizerService } from '../../services/organizerService'

function OrganizerDashboardPage() {
  const [cinemaName, setCinemaName] = useState('seu cinema')

  useEffect(() => {
    organizerService.getMyCinema()
      .then((cinema) => setCinemaName(cinema.name))
      .catch(() => setCinemaName('seu cinema'))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-mauve]">
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-2 pt-36">
        <div className="mb-4 flex items-start gap-2">
          <div className="p-2 text-[var(--color-primary-dark)]"><Film className="h-10 w-10" /></div>
          <div>
            <h1 className="text-3xl font-medium text-[var(--color-primary-dark)]">{cinemaName}</h1>
            <p className="mt-1 text-slate-600">Organize o seu cinema.</p>
          </div>
        </div>

        <Tabs defaultValue="rooms" variant="line" className="w-full">
          <TabsList className="mb-7 w-full overflow-x-auto">
            <TabsTrigger value="tickets"><TicketCheck className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="sessions"><TvMinimalPlay className="h-4 w-4" />Sessões</TabsTrigger>
            <TabsTrigger value="rooms"><DoorOpen className="h-4 w-4" />Salas</TabsTrigger>           
           <TabsTrigger value="team"><Users className="h-4 w-4" />Equipe</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4" />Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="tickets"><TicketManager /></TabsContent>
          <TabsContent value="sessions"><SessionManager /></TabsContent>
          <TabsContent value="rooms"><RoomManager /></TabsContent>          
          <TabsContent value="team"><TeamManager /></TabsContent>
          <TabsContent value="settings"></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default OrganizerDashboardPage
