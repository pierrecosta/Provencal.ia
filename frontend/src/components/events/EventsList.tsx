import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/types'
import type { AgendaEvent, EventBody } from '../../services/types'
import EventForm from './EventForm'
import ConfirmModal from '../ui/ConfirmModal'
import Snackbar from '../ui/Snackbar'
import iconDate from '../../assets/icons/icon-date.svg'
import iconLocalite from '../../assets/icons/icon-localite.svg'
import iconEditer from '../../assets/icons/icon-editer.svg'
import iconSupprimer from '../../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'
import iconVerrou from '../../assets/icons/icon-verrou.svg'
import iconRollback from '../../assets/icons/icon-rollback.svg'

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

const ACTION_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'white', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer',
  minWidth: 36, minHeight: 36,
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface Props {
  events: AgendaEvent[]
  loading: boolean
  isAuthenticated: boolean
  isArchive: boolean
  page: number
  onDoUpdate: (id: number, body: EventBody) => Promise<AgendaEvent>
  onDoDelete: (id: number) => Promise<void>
  onDoRollback: (id: number) => Promise<AgendaEvent>
  onReplaceEvent: (e: AgendaEvent) => void
  onRemoveEvent: (id: number) => void
  onReload: (p: number) => Promise<void>
}

export default function EventsList({
  events, loading, isAuthenticated, isArchive, page,
  onDoUpdate, onDoDelete, onDoRollback,
  onReplaceEvent, onRemoveEvent, onReload,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgendaEvent | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  function startEdit(ev: AgendaEvent) {
    setEditingId(ev.id)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await onDoDelete(deleteTarget.id)
      onRemoveEvent(deleteTarget.id)
      setSnackbar({ message: 'Événement supprimé', type: 'success' })
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Événement verrouillé par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      }
    } finally {
      setDeleteTarget(null)
    }
  }

  async function doRollback(ev: AgendaEvent) {
    try {
      await onDoRollback(ev.id)
      setSnackbar({ message: 'Dernière action annulée', type: 'success' })
      cancelEdit()
      await onReload(page)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSnackbar({ message: 'Aucune action à annuler', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
      }
    }
  }

  function renderEditCard(ev: AgendaEvent) {
    return (
      <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff' }}>
        <EventForm
          title={`Modifier : ${ev.titre}`}
          initialValues={{
            titre: ev.titre,
            date_debut: ev.date_debut,
            date_fin: ev.date_fin,
            lieu: ev.lieu || '',
            description: ev.description || '',
            lien_externe: ev.lien_externe || '',
          }}
          onSubmit={async (body) => {
            try {
              const updated = await onDoUpdate(ev.id, body)
              onReplaceEvent(updated)
              cancelEdit()
              setSnackbar({ message: 'Événement modifié', type: 'success' })
            } catch (err) {
              if (err instanceof ApiError && err.status === 403) {
                setSnackbar({ message: 'Événement verrouillé par un autre contributeur', type: 'error' })
                cancelEdit()
              } else {
                setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
              }
              throw err
            }
          }}
          onCancel={cancelEdit}
        />
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button style={{ ...ACTION_BTN, borderColor: 'var(--color-error)' }} onClick={() => setDeleteTarget(ev)} title="Supprimer">
            <img src={iconSupprimer} alt="Supprimer" width={18} height={18} />
          </button>
          <button style={ACTION_BTN} onClick={() => void doRollback(ev)} title="Annuler la dernière action">
            <img src={iconRollback} alt="Rollback" width={18} height={18} />
          </button>
          <button style={ACTION_BTN} onClick={cancelEdit} title="Annuler l'édition">
            <img src={iconAnnuler} alt="Annuler" width={18} height={18} />
          </button>
        </div>
      </div>
    )
  }

  function renderEventCard(ev: AgendaEvent, compact: boolean) {
    const cardStyle: React.CSSProperties = compact
      ? { display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-1) 0', borderBottom: '1px solid var(--color-border)' }
      : { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', height: '100%' }

    return (
      <div key={ev.id} style={{ position: 'relative' }}>
        <Link to={`/agenda/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div style={cardStyle}>
            {!compact && (
              <>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', marginBottom: 'var(--space-1)', fontWeight: 600 }}>
                  <img src={iconDate} alt="" width={14} height={14} />
                  {formatDate(ev.date_debut)}
                </div>
                {ev.lieu && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                    <img src={iconLocalite} alt="" width={14} height={14} />
                    {ev.lieu}
                  </div>
                )}
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', paddingRight: isAuthenticated ? 36 : 0 }}>
                  {ev.titre}
                </div>
              </>
            )}
            {compact && (
              <>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', minWidth: 120 }}>{formatDate(ev.date_debut)}</span>
                <span style={{ fontWeight: 600, paddingRight: isAuthenticated ? 36 : 0 }}>{ev.titre}</span>
                {ev.lieu && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)' }}>— {ev.lieu}</span>}
              </>
            )}
          </div>
        </Link>
        {isAuthenticated && (
          <div style={{ position: 'absolute', top: compact ? 2 : 8, right: compact ? 0 : 8 }}>
            {ev.is_locked ? (
              <span title="En cours de modification" style={{ display: 'inline-flex', padding: 4, color: 'var(--color-secondary)' }}>
                <img src={iconVerrou} alt="Verrouillé" width={20} height={20} />
              </span>
            ) : (
              <button
                style={{ ...ACTION_BTN, background: 'transparent' }}
                onClick={() => startEdit(ev)}
                title="Modifier"
              >
                <img src={iconEditer} alt="Modifier" width={18} height={18} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <p>Chargement…</p>

  if (!loading && events.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--color-text)', opacity: 0.6, fontStyle: 'italic', padding: 'var(--space-4)' }}>
        {isArchive ? 'Aucune archive disponible.' : 'Aucun événement à venir.'}
      </p>
    )
  }

  const featured = events.slice(0, 3)
  const rest = events.slice(3)

  return (
    <>
      {/* 3 prochains événements en cartes larges */}
      {featured.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {featured.map((ev) =>
            editingId === ev.id
              ? <div key={ev.id}>{renderEditCard(ev)}</div>
              : <div key={ev.id}>{renderEventCard(ev, false)}</div>
          )}
        </div>
      )}

      {/* Liste compacte des autres événements */}
      {rest.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Autres événements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {rest.map((ev) =>
              editingId === ev.id
                ? <div key={ev.id}>{renderEditCard(ev)}</div>
                : <div key={ev.id}>{renderEventCard(ev, true)}</div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Supprimer cet événement ? Cette action est irréversible."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </>
  )
}


