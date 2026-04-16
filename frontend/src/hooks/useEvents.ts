import { useCallback, useEffect, useState } from 'react'
import {
  fetchEvents as apiFetchEvents,
  createEvent as apiCreate,
  updateEvent as apiUpdate,
  deleteEvent as apiDelete,
  rollbackEvent as apiRollback,
} from '../services/eventsService'
import type { AgendaEvent, EventBody } from '../services/types'

export interface UseEventsReturn {
  events: AgendaEvent[]
  total: number
  page: number
  pages: number
  loading: boolean
  lieu: string
  annee: string
  mois: string
  setLieu: (v: string) => void
  setAnnee: (v: string) => void
  setMois: (v: string) => void
  loadEvents: (p: number) => Promise<void>
  createEvent: (data: EventBody) => Promise<AgendaEvent>
  updateEvent: (id: number, data: EventBody) => Promise<AgendaEvent>
  deleteEvent: (id: number) => Promise<void>
  rollbackEvent: (id: number) => Promise<AgendaEvent>
  replaceEvent: (e: AgendaEvent) => void
  removeEvent: (id: number) => void
}

export function useEvents(isArchive: boolean): UseEventsReturn {
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [lieu, setLieu] = useState('')
  const [annee, setAnnee] = useState('')
  const [mois, setMois] = useState('')

  const loadEvents = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const data = await apiFetchEvents({
        page: p,
        per_page: 20,
        archive: isArchive || undefined,
        lieu: lieu || undefined,
        annee: annee || undefined,
        mois: mois || undefined,
      })
      setEvents(data.items)
      setTotal(data.total)
      setPages(data.pages)
      setPage(data.page)
    } catch {
      // Erreur réseau — liste inchangée
    } finally {
      setLoading(false)
    }
  }, [isArchive, lieu, annee, mois])

  useEffect(() => { void loadEvents(1) }, [loadEvents])

  const createEvent = useCallback((data: EventBody) => apiCreate(data), [])
  const updateEvent = useCallback((id: number, data: EventBody) => apiUpdate(id, data), [])
  const deleteEvent = useCallback((id: number) => apiDelete(id), [])
  const rollbackEvent = useCallback((id: number) => apiRollback(id), [])

  const replaceEvent = useCallback(
    (e: AgendaEvent) => setEvents((prev) => prev.map((x) => (x.id === e.id ? e : x))),
    [],
  )
  const removeEvent = useCallback(
    (id: number) => setEvents((prev) => prev.filter((x) => x.id !== id)),
    [],
  )

  return {
    events, total, page, pages, loading,
    lieu, annee, mois,
    setLieu, setAnnee, setMois,
    loadEvents,
    createEvent, updateEvent, deleteEvent, rollbackEvent,
    replaceEvent, removeEvent,
  }
}
