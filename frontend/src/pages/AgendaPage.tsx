import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Snackbar from '../components/ui/Snackbar'
import ConfirmModal from '../components/ui/ConfirmModal'
import iconArchive from '../assets/icons/icon-archive.svg'
import iconDate from '../assets/icons/icon-date.svg'
import iconLocalite from '../assets/icons/icon-localite.svg'
import iconAjouter from '../assets/icons/icon-ajouter.svg'
import iconEditer from '../assets/icons/icon-editer.svg'
import iconValider from '../assets/icons/icon-valider.svg'
import iconSupprimer from '../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../assets/icons/icon-annuler.svg'
import iconVerrou from '../assets/icons/icon-verrou.svg'
import iconRollback from '../assets/icons/icon-rollback.svg'

interface EventItem {
  id: number
  titre: string
  date_debut: string
  date_fin: string
  lieu: string | null
  description: string | null
  lien_externe: string | null
  is_locked: boolean
  locked_by: number | null
}

interface Page {
  items: EventItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface EventFormData {
  titre: string
  date_debut: string
  date_fin: string
  lieu: string
  description: string
  lien_externe: string
}

interface FormErrors {
  titre?: string
  date_debut?: string
  date_fin?: string
}

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

const EMPTY_FORM: EventFormData = {
  titre: '',
  date_debut: '',
  date_fin: '',
  lieu: '',
  description: '',
  lien_externe: '',
}

function validateForm(form: EventFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  if (!form.date_debut) errors.date_debut = 'Champ obligatoire'
  if (!form.date_fin) errors.date_fin = 'Champ obligatoire'
  else if (form.date_debut && form.date_fin < form.date_debut)
    errors.date_fin = 'Doit être ≥ date de début'
  return errors
}

const ACTION_BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'white',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px',
  cursor: 'pointer',
  minWidth: 36,
  minHeight: 36,
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isArchive = searchParams.get('archive') === 'true'
  const { isAuthenticated } = useAuth()

  const [events, setEvents] = useState<EventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [lieu, setLieu] = useState('')
  const [annee, setAnnee] = useState('')
  const [mois, setMois] = useState('')

  /* ── Mode création ── */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<EventFormData>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  /* ── Mode édition ── */
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EventFormData>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  /* ── Suppression / Snackbar ── */
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const fetchEvents = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '20' })
      if (isArchive) params.set('archive', 'true')
      if (lieu) params.set('lieu', lieu)
      if (annee) params.set('annee', annee)
      if (mois) params.set('mois', mois)

      const resp = await apiFetch(`/api/v1/events?${params}`)
      if (resp.ok) {
        const data: Page = await resp.json()
        setEvents(data.items)
        setTotal(data.total)
        setPages(data.pages)
        setPage(data.page)
      }
    } finally {
      setLoading(false)
    }
  }, [isArchive, lieu, annee, mois])

  useEffect(() => {
    fetchEvents(1)
  }, [fetchEvents])

  /* ── Création ── */
  function openCreateForm() {
    setShowCreateForm(true)
    setCreateForm(EMPTY_FORM)
    setCreateErrors({})
    setEditingId(null)
  }

  function cancelCreate() {
    setShowCreateForm(false)
    setCreateForm(EMPTY_FORM)
    setCreateErrors({})
  }

  async function submitCreate() {
    const errors = validateForm(createForm)
    setCreateErrors(errors)
    if (Object.keys(errors).length > 0) return
    setCreateSubmitting(true)
    try {
      const body = {
        titre: createForm.titre.trim(),
        date_debut: createForm.date_debut,
        date_fin: createForm.date_fin,
        lieu: createForm.lieu.trim() || null,
        description: createForm.description.trim() || null,
        lien_externe: createForm.lien_externe.trim() || null,
      }
      const res = await apiFetch('/api/v1/events', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la création', type: 'error' })
        return
      }
      setShowCreateForm(false)
      setCreateForm(EMPTY_FORM)
      setSnackbar({ message: 'Événement ajouté', type: 'success' })
      await fetchEvents(1)
    } finally {
      setCreateSubmitting(false)
    }
  }

  /* ── Édition ── */
  function startEdit(ev: EventItem) {
    setEditingId(ev.id)
    setEditForm({
      titre: ev.titre,
      date_debut: ev.date_debut,
      date_fin: ev.date_fin,
      lieu: ev.lieu || '',
      description: ev.description || '',
      lien_externe: ev.lien_externe || '',
    })
    setEditErrors({})
    setShowCreateForm(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
    setEditErrors({})
  }

  async function submitEdit() {
    if (editingId === null) return
    const errors = validateForm(editForm)
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return
    setEditSubmitting(true)
    try {
      const body = {
        titre: editForm.titre.trim(),
        date_debut: editForm.date_debut,
        date_fin: editForm.date_fin,
        lieu: editForm.lieu.trim() || null,
        description: editForm.description.trim() || null,
        lien_externe: editForm.lien_externe.trim() || null,
      }
      const res = await apiFetch(`/api/v1/events/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (res.status === 403) {
        setSnackbar({ message: 'Événement verrouillé par un autre contributeur', type: 'error' })
        cancelEdit()
        return
      }
      if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
        return
      }
      const updated: EventItem = await res.json()
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
      cancelEdit()
      setSnackbar({ message: 'Événement modifié', type: 'success' })
    } finally {
      setEditSubmitting(false)
    }
  }

  /* ── Suppression ── */
  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const res = await apiFetch(`/api/v1/events/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.status === 403) {
        setSnackbar({ message: 'Événement verrouillé par un autre contributeur', type: 'error' })
      } else if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      } else {
        setEvents(prev => prev.filter(e => e.id !== deleteTarget.id))
        setSnackbar({ message: 'Événement supprimé', type: 'success' })
        cancelEdit()
      }
    } finally {
      setDeleteTarget(null)
    }
  }

  /* ── Rollback ── */
  async function doRollback(ev: EventItem) {
    const res = await apiFetch(`/api/v1/events/${ev.id}/rollback`, { method: 'POST' })
    if (res.status === 404) {
      setSnackbar({ message: 'Aucune action à annuler', type: 'error' })
    } else if (!res.ok) {
      setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
    } else {
      setSnackbar({ message: 'Dernière action annulée', type: 'success' })
      cancelEdit()
      await fetchEvents(page)
    }
  }

  /* ── Rendu d'un champ de formulaire ── */
  function renderField(
    label: string,
    name: keyof EventFormData,
    form: EventFormData,
    setForm: (f: EventFormData) => void,
    errors: FormErrors,
    type: 'text' | 'date' | 'url' | 'textarea' = 'text',
  ) {
    const error = name in errors ? (errors as Record<string, string>)[name] : undefined
    const inputStyle: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '6px 10px',
      border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-sm)',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    }
    return (
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            value={form[name] ?? ''}
            onChange={e => setForm({ ...form, [name]: e.target.value })}
            rows={3}
          />
        ) : (
          <input
            type={type}
            style={inputStyle}
            value={form[name] ?? ''}
            onChange={e => setForm({ ...form, [name]: e.target.value })}
          />
        )}
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>
            {error}
          </span>
        )}
      </div>
    )
  }

  /* ── Rendu d'un événement en mode édition ── */
  function renderEditCard(ev: EventItem) {
    return (
      <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff' }}>
        {renderField('Titre *', 'titre', editForm, setEditForm, editErrors)}
        {renderField('Date de début *', 'date_debut', editForm, setEditForm, editErrors, 'date')}
        {renderField('Date de fin *', 'date_fin', editForm, setEditForm, editErrors, 'date')}
        {renderField('Lieu', 'lieu', editForm, setEditForm, editErrors)}
        {renderField('Description', 'description', editForm, setEditForm, editErrors, 'textarea')}
        {renderField('Lien externe', 'lien_externe', editForm, setEditForm, editErrors, 'url')}
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button style={ACTION_BTN} onClick={() => void submitEdit()} disabled={editSubmitting} title="Valider">
            <img src={iconValider} alt="Valider" width={18} height={18} />
          </button>
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

  /* ── Rendu d'une carte événement (mode lecture) ── */
  function renderEventCard(ev: EventItem, compact: boolean) {
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

  const featured = events.slice(0, 3)
  const rest = events.slice(3)

  return (
    <div>
      {/* En-tête : titre + bouton Ajouter + archives */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>{isArchive ? 'Archives Agenda' : 'Agenda culturel'}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated && !showCreateForm && (
            <button
              onClick={openCreateForm}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
            >
              <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
              Ajouter
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

      {/* Formulaire de création */}
      {showCreateForm && (
        <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>Nouvel événement</h2>
          {renderField('Titre *', 'titre', createForm, setCreateForm, createErrors)}
          {renderField('Date de début *', 'date_debut', createForm, setCreateForm, createErrors, 'date')}
          {renderField('Date de fin *', 'date_fin', createForm, setCreateForm, createErrors, 'date')}
          {renderField('Lieu', 'lieu', createForm, setCreateForm, createErrors)}
          {renderField('Description', 'description', createForm, setCreateForm, createErrors, 'textarea')}
          {renderField('Lien externe', 'lien_externe', createForm, setCreateForm, createErrors, 'url')}
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button style={ACTION_BTN} onClick={() => void submitCreate()} disabled={createSubmitting} title="Valider">
              <img src={iconValider} alt="Valider" width={18} height={18} />
            </button>
            <button style={ACTION_BTN} onClick={cancelCreate} title="Annuler">
              <img src={iconAnnuler} alt="Annuler" width={18} height={18} />
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <input
          type="text"
          placeholder="Filtrer par lieu..."
          value={lieu}
          onChange={e => setLieu(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        />
        <input
          type="number"
          placeholder="Année"
          value={annee}
          onChange={e => setAnnee(e.target.value)}
          style={{ width: 90, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
          min={2000}
          max={2100}
        />
        <select
          value={mois}
          onChange={e => setMois(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        >
          <option value="">Tous les mois</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Chargement…</p>}

      {!loading && events.length === 0 && !isArchive && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', opacity: 0.6 }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Aucun événement à venir
          </div>
        </div>
      )}

      {/* 3 prochains événements en cartes larges */}
      {!loading && featured.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {featured.map(ev =>
            editingId === ev.id
              ? <div key={ev.id}>{renderEditCard(ev)}</div>
              : <div key={ev.id}>{renderEventCard(ev, false)}</div>
          )}
        </div>
      )}

      {/* Liste compacte des autres événements */}
      {!loading && rest.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Autres événements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {rest.map(ev =>
              editingId === ev.id
                ? <div key={ev.id}>{renderEditCard(ev)}</div>
                : <div key={ev.id}>{renderEventCard(ev, true)}</div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => fetchEvents(page - 1)} disabled={page <= 1} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>
            ←
          </button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} événements)</span>
          <button onClick={() => fetchEvents(page + 1)} disabled={page >= pages} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>
            →
          </button>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteTarget && (
        <ConfirmModal
          message="Supprimer cet événement ? Cette action est irréversible."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Snackbar */}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
    </div>
  )
}
