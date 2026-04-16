import { useState } from 'react'
import type { DictEntry, DictEntryDetail, DictEntryUpdate, DictTranslationIn } from '../../services/types'
import { ApiError } from '../../services/types'
import {
  fetchEntryDetail,
  updateEntry,
  deleteEntry,
  lockEntry,
  unlockEntry,
  rollbackEntry,
} from '../../services/dictionaryService'
import Snackbar from '../ui/Snackbar'
import ConfirmModal from '../ui/ConfirmModal'
import iconDeplier from '../../assets/icons/icon-deplier.svg'
import iconReplier from '../../assets/icons/icon-replier.svg'
import iconEditer from '../../assets/icons/icon-editer.svg'
import iconValider from '../../assets/icons/icon-valider.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'
import iconSupprimer from '../../assets/icons/icon-supprimer.svg'
import iconVerrou from '../../assets/icons/icon-verrou.svg'

const LOCK_TTL_MS = 30 * 60 * 1000

function isActiveLock(lockedAt: string | null | undefined): boolean {
  if (!lockedAt) return false
  return Date.now() - new Date(lockedAt).getTime() < LOCK_TTL_MS
}

const THEMES = [
  'Nature', 'Animaux', 'Cuisine', 'Armée', 'Quotidien', 'Travail', 'Divers',
  'Corps Humain Et Sante', 'Maison Et Habitat', 'Famille Et Relations',
  'Religion Et Croyances', 'Geographie Et Territoire', 'Langue Et Grammaire',
] as const

const TRANSLATION_SOURCES: Array<{ source: string; label: string }> = [
  { source: '', label: 'Canonique' },
  { source: 'TradEG', label: 'Garcin (1823)' },
  { source: 'TradD', label: 'Autran' },
  { source: 'TradA', label: 'Achard (1785)' },
  { source: 'TradH', label: 'Honnorat (1846)' },
  { source: 'TradAv', label: 'Avril (1834)' },
  { source: 'TradP', label: 'Pellas (1723)' },
  { source: 'TradX', label: 'Xavier de Fourvières (1901)' },
]

type Direction = 'fr_to_oc' | 'oc_to_fr'

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

interface Props {
  results: DictEntry[]
  total: number
  suggestions: string[]
  loading: boolean
  direction: Direction
  q: string
  isAuthenticated: boolean
  onSuggestionClick: (s: string) => void
  onEntryUpdated: (entry: DictEntryDetail) => void
  onEntryDeleted: (id: number) => void
}

interface EditFormState {
  mot_fr: string
  synonyme_fr: string
  description: string
  theme: string
  categorie: string
  translations: Record<string, string>  // source → traduction
}

function buildEditForm(detail: DictEntryDetail): EditFormState {
  const translations: Record<string, string> = {}
  for (const src of TRANSLATION_SOURCES) {
    const found = detail.translations.find((t) => (t.source ?? '') === src.source)
    translations[src.source] = found?.traduction ?? ''
  }
  return {
    mot_fr: detail.mot_fr,
    synonyme_fr: detail.synonyme_fr ?? '',
    description: detail.description ?? '',
    theme: detail.theme ?? '',
    categorie: detail.categorie ?? '',
    translations,
  }
}

function buildUpdatePayload(form: EditFormState): DictEntryUpdate {
  const translations: DictTranslationIn[] = []
  for (const src of TRANSLATION_SOURCES) {
    const val = form.translations[src.source]?.trim()
    if (val) {
      translations.push({ source: src.source, traduction: val, graphie: null, region: null })
    }
  }
  return {
    mot_fr: form.mot_fr.trim(),
    synonyme_fr: form.synonyme_fr.trim() || null,
    description: form.description.trim() || null,
    theme: form.theme,
    categorie: form.categorie.trim(),
    translations,
  }
}

export default function DictionaryResults({
  results,
  suggestions,
  loading,
  direction,
  q,
  isAuthenticated,
  onSuggestionClick,
  onEntryUpdated,
  onEntryDeleted,
}: Props) {
  const [openAccordion, setOpenAccordion] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const toggleAccordion = (id: number) => {
    setOpenAccordion((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleEdit(entry: DictEntry) {
    try {
      await lockEntry(entry.id)
      const detail = await fetchEntryDetail(entry.id)
      setEditForm(buildEditForm(detail))
      setEditingId(entry.id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors du verrouillage', type: 'error' })
      }
    }
  }

  async function handleSave() {
    if (!editingId || !editForm) return
    const payload = buildUpdatePayload(editForm)
    if (payload.translations.length === 0) {
      setSnackbar({ message: 'Au moins une traduction est requise', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const updated = await updateEntry(editingId, payload)
      await unlockEntry(editingId)
      onEntryUpdated(updated)
      setEditingId(null)
      setEditForm(null)
      setSnackbar({ message: 'Entrée modifiée avec succès', type: 'success' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
        setEditingId(null)
        setEditForm(null)
      } else {
        setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!editingId) return
    try { await unlockEntry(editingId) } catch { /* expire seul */ }
    setEditingId(null)
    setEditForm(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteEntry(deleteTarget)
      onEntryDeleted(deleteTarget)
      setDeleteTarget(null)
      setEditingId(null)
      setEditForm(null)
      setSnackbar({ message: 'Entrée supprimée', type: 'success' })
    } catch {
      setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRollback() {
    if (!editingId) return
    setSubmitting(true)
    try {
      await rollbackEntry(editingId)
      await unlockEntry(editingId)
      const refreshed = await fetchEntryDetail(editingId)
      onEntryUpdated(refreshed)
      setEditingId(null)
      setEditForm(null)
      setSnackbar({ message: 'Dernière modification annulée', type: 'success' })
    } catch {
      setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
  }

  if (results.length === 0) {
    return (
      <div>
        <p style={{ color: 'var(--color-text-muted)' }}>{q ? 'Pas de mot trouvé.' : 'Aucun résultat.'}</p>
        {suggestions.length > 0 && (
          <p>
            Mots proches :{' '}
            {suggestions.map((s, i) => (
              <span key={i}>
                <button
                  onClick={() => onSuggestionClick(s)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}
                >{s}</button>
                {i < suggestions.length - 1 && ' '}
              </span>
            ))}
          </p>
        )}
      </div>
    )
  }

  const colSpan = isAuthenticated ? 3 : 2

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Mot français' : 'Mot provençal'}</th>
            <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Traduction provençale' : 'Traduction française'}</th>
            {isAuthenticated && <th style={{ padding: '8px 12px', width: 40 }}></th>}
          </tr>
        </thead>
        <tbody>
          {results.map((entry) => {
            const isOpen = openAccordion.has(entry.id)
            const hasMany = entry.translations.length > 1
            const first = entry.translations[0]
            const locked = isActiveLock((entry as DictEntryDetail).locked_at) && entry.locked_by !== null
            const isEditing = editingId === entry.id

            if (isEditing && editForm) {
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td colSpan={colSpan} style={{ padding: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)' }}>
                        Mot français *
                        <input
                          value={editForm.mot_fr}
                          onChange={(e) => setEditForm({ ...editForm, mot_fr: e.target.value })}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)' }}>
                        Synonyme français
                        <input
                          value={editForm.synonyme_fr}
                          onChange={(e) => setEditForm({ ...editForm, synonyme_fr: e.target.value })}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)', gridColumn: '1 / -1' }}>
                        Description
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={2}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)' }}>
                        Thème *
                        <select
                          value={editForm.theme}
                          onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                        >
                          <option value="">— Choisir —</option>
                          {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)' }}>
                        Catégorie *
                        <input
                          value={editForm.categorie}
                          onChange={(e) => setEditForm({ ...editForm, categorie: e.target.value })}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                        />
                      </label>
                    </div>
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 16px' }}>
                      {TRANSLATION_SOURCES.map(({ source, label }) => (
                        <label key={source} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)' }}>
                          {label}
                          <input
                            value={editForm.translations[source] ?? ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                translations: { ...editForm.translations, [source]: e.target.value },
                              })
                            }
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontFamily: 'Georgia, serif' }}
                          />
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => void handleSave()}
                        disabled={submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', opacity: submitting ? 0.7 : 1 }}
                      >
                        <img src={iconValider} alt="" width={14} height={14} style={{ filter: 'brightness(0) invert(1)' }} />
                        Valider
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(entry.id) }}
                        disabled={submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-error, #c0392b)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', opacity: submitting ? 0.7 : 1 }}
                      >
                        <img src={iconSupprimer} alt="" width={14} height={14} style={{ filter: 'brightness(0) invert(1)' }} />
                        Supprimer
                      </button>
                      <button
                        onClick={() => void handleRollback()}
                        disabled={submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-secondary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', opacity: submitting ? 0.7 : 1 }}
                      >
                        Rollback
                      </button>
                      <button
                        onClick={() => void handleCancel()}
                        disabled={submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'var(--color-text)', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
                      >
                        <img src={iconAnnuler} alt="" width={14} height={14} />
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              )
            }

            return (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                <td style={{ padding: '8px 12px' }}>
                  <span>{direction === 'fr_to_oc' ? entry.mot_fr : (first?.traduction ?? '—')}</span>
                  {locked && (
                    <img
                      src={iconVerrou}
                      alt="En cours de modification"
                      title="En cours de modification"
                      width={14}
                      height={14}
                      style={{ marginLeft: 6, verticalAlign: 'middle', opacity: 0.7 }}
                    />
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {entry.translations.length === 0 ? (
                    <em style={{ color: 'var(--color-text-muted)' }}>Mot non traduit</em>
                  ) : (
                    <div>
                      <span style={{ fontFamily: 'Georgia, serif' }}>
                        {direction === 'fr_to_oc' ? (first?.traduction ?? '—') : entry.mot_fr}
                      </span>
                      {first?.graphie && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 6 }}>({first.graphie})</span>}
                      {first?.source && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>[{first.source}]</span>}
                      {hasMany && (
                        <button
                          onClick={() => toggleAccordion(entry.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 0, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
                          aria-expanded={isOpen}
                        >
                          <img src={isOpen ? iconReplier : iconDeplier} alt={isOpen ? 'Replier' : 'Déplier'} width={14} height={14} />
                        </button>
                      )}
                      {isOpen && (
                        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
                          {entry.translations.slice(1).map((tr) => (
                            <li key={tr.id} style={{ padding: '4px 0', borderTop: '1px dashed var(--color-border)' }}>
                              <span style={{ fontFamily: 'Georgia, serif' }}>{direction === 'fr_to_oc' ? tr.traduction : entry.mot_fr}</span>
                              {tr.graphie && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 6 }}>({tr.graphie})</span>}
                              {tr.source && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>[{tr.source}]</span>}
                              {tr.region && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>{tr.region}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </td>
                {isAuthenticated && (
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <button
                      onClick={() => void handleEdit(entry)}
                      title="Modifier"
                      disabled={locked}
                      style={{ background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', padding: 2, display: 'inline-flex', alignItems: 'center', opacity: locked ? 0.4 : 1 }}
                    >
                      <img src={iconEditer} alt="Modifier" width={16} height={16} />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {deleteTarget !== null && (
        <ConfirmModal
          message="Supprimer cette entrée définitivement ?"
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </>
  )
}
