import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../hooks/useEvents'
import EventsList from '../components/events/EventsList'
import EventFilters from '../components/events/EventFilters'
import EventForm from '../components/events/EventForm'
import Snackbar from '../components/ui/Snackbar'
import iconArchive from '../assets/icons/icon-archive.svg'
import iconAjouter from '../assets/icons/icon-ajouter.svg'

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

export default function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isArchive = searchParams.get('archive') === 'true'
  const { isAuthenticated } = useAuth()
  const {
    events, total, page, pages, loading,
    lieu, annee, mois, setLieu, setAnnee, setMois,
    loadEvents,
    createEvent, updateEvent, deleteEvent, rollbackEvent,
    replaceEvent, removeEvent,
  } = useEvents(isArchive)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>{isArchive ? 'Archives Agenda' : 'Agenda culturel'}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated && !isArchive && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
            >
              <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
              Ajouter un événement
            </button>
          )}
          {isArchive ? (
            <button
              onClick={() => setSearchParams({})}
              style={{ background: 'none', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              ← Événements à venir
            </button>
          ) : (
            <button
              onClick={() => setSearchParams({ archive: 'true' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'var(--color-text)', cursor: 'pointer' }}
            >
              <img src={iconArchive} alt="" width={16} height={16} />
              Archives
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <EventForm
          title="Nouvel événement"
          onSubmit={async (body) => {
            await createEvent(body)
            setShowCreateForm(false)
            setSnackbar({ message: 'Événement ajouté', type: 'success' })
            await loadEvents(1)
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <EventFilters
        lieu={lieu}
        annee={annee}
        mois={mois}
        onSetLieu={setLieu}
        onSetAnnee={setAnnee}
        onSetMois={setMois}
      />

      <EventsList
        events={events}
        loading={loading}
        isAuthenticated={isAuthenticated}
        isArchive={isArchive}
        page={page}
        onDoUpdate={updateEvent}
        onDoDelete={deleteEvent}
        onDoRollback={rollbackEvent}
        onReplaceEvent={replaceEvent}
        onRemoveEvent={removeEvent}
        onReload={loadEvents}
      />

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => void loadEvents(page - 1)} disabled={page <= 1}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>←</button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} événements)</span>
          <button onClick={() => void loadEvents(page + 1)} disabled={page >= pages}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>→</button>
        </div>
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
