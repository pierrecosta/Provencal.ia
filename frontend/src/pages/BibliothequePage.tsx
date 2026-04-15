import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchLibraryEntries, fetchLibraryPeriodes, createLibraryEntry, updateLibraryEntry, deleteLibraryEntry, rollbackLibraryEntry } from '../services/libraryService'
import { uploadImageFile } from '../services/uploadService'
import { ApiError } from '../services/types'
import type { LibraryEntry, LibraryBody } from '../services/types'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import Snackbar from '../components/ui/Snackbar'
import ConfirmModal from '../components/ui/ConfirmModal'
import MarkdownEditor from '../components/ui/MarkdownEditor'
import { compressImage } from '../utils/imageCompression'
import iconOlivier from '../assets/icons/icon-olivier.svg'
import iconAjouter from '../assets/icons/icon-ajouter.svg'
import iconEditer from '../assets/icons/icon-editer.svg'
import iconValider from '../assets/icons/icon-valider.svg'
import iconSupprimer from '../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../assets/icons/icon-annuler.svg'
import iconVerrou from '../assets/icons/icon-verrou.svg'
import iconRollback from '../assets/icons/icon-rollback.svg'

interface LibraryFormData {
  titre: string
  typologie: string
  periode: string
  description_courte: string
  description_longue: string
  image_file: File | null
  image_url: string
  source_url: string
  lang: string
  traduction_id: string
}

interface FormErrors {
  titre?: string
}

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

type FilterType = '' | 'Histoire' | 'Légende'

const EMPTY_FORM: LibraryFormData = {
  titre: '',
  typologie: '',
  periode: '',
  description_courte: '',
  description_longue: '',
  image_file: null,
  image_url: '',
  source_url: '',
  lang: 'fr',
  traduction_id: '',
}

function validateForm(form: LibraryFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  return errors
}

const ACTION_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'white', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer',
  minWidth: 36, minHeight: 36,
}

const INPUT_STYLE: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function BibliothequePage() {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<LibraryEntry[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)

  const [periodes, setPeriodes] = useState<string[]>([])
  const [allEntries, setAllEntries] = useState<LibraryEntry[]>([])
  const [filterType, setFilterType] = useState<FilterType>('')
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterLieu, setFilterLieu] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<LibraryFormData>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<LibraryFormData>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<LibraryEntry | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  // Reset on filter change
  const prevFilters = useRef({ filterType, filterPeriode, filterLieu })
  useEffect(() => {
    const prev = prevFilters.current
    if (prev.filterType !== filterType || prev.filterPeriode !== filterPeriode || prev.filterLieu !== filterLieu) {
      setItems([])
      setPage(1)
      setHasMore(true)
      setAllLoaded(false)
      prevFilters.current = { filterType, filterPeriode, filterLieu }
    }
  }, [filterType, filterPeriode, filterLieu])

  const loadPage = useCallback(async (p: number) => {
    if (loading) return
    setLoading(true)
    try {
      const data = await fetchLibraryEntries({
        page: p,
        per_page: 20,
        type: filterType || undefined,
        periode: filterPeriode || undefined,
        lieu: filterLieu || undefined,
      })
      setItems(prev => p === 1 ? data.items : [...prev, ...data.items])
      setPage(p)
      const more = p < data.pages
      setHasMore(more)
      if (!more) setAllLoaded(true)
    } catch {
      // Erreur réseau — liste inchangée
    } finally {
      setLoading(false)
    }
  }, [loading, filterType, filterPeriode, filterLieu])

  useEffect(() => {
    void loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterPeriode, filterLieu])

  useEffect(() => {
    fetchLibraryPeriodes()
      .then(data => setPeriodes(data))
      .catch(() => {})
  }, [])

  // Pour le select lien traduction : charger toutes les entrées (sans filtre, page 1)
  useEffect(() => {
    fetchLibraryEntries({ per_page: 200 })
      .then(data => setAllEntries(data.items))
      .catch(() => {})
  }, [])

  const sentinelRef = useInfiniteScroll({
    loading,
    hasMore,
    onLoadMore: () => void loadPage(page + 1),
  })

  async function uploadImage(file: File): Promise<string | null> {
    const compressed = await compressImage(file, 2)
    try {
      return await uploadImageFile(compressed)
    } catch {
      setSnackbar({ message: "Erreur lors de l'upload de l'image", type: 'error' })
      return null
    }
  }

  async function buildBody(form: LibraryFormData): Promise<Record<string, unknown> | null> {
    let image_ref: string | null = null
    if (form.image_file) {
      image_ref = await uploadImage(form.image_file)
      if (image_ref === null) return null
    } else if (form.image_url.trim()) {
      image_ref = form.image_url.trim()
    }
    return {
      titre: form.titre.trim(),
      typologie: form.typologie || null,
      periode: form.periode.trim() || null,
      description_courte: form.description_courte.trim() || null,
      description_longue: form.description_longue.trim() || null,
      image_ref,
      source_url: form.source_url.trim() || null,
      lang: form.lang || 'fr',
      traduction_id: form.traduction_id ? Number(form.traduction_id) : null,
    }
  }

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
      const body = await buildBody(createForm)
      if (!body) return
      await createLibraryEntry(body as unknown as LibraryBody)
      setShowCreateForm(false)
      setCreateForm(EMPTY_FORM)
      setSnackbar({ message: 'Entrée créée avec succès', type: 'success' })
      setItems([])
      await loadPage(1)
    } catch {
      setSnackbar({ message: 'Erreur lors de la création', type: 'error' })
    } finally { setCreateSubmitting(false) }
  }

  function startEdit(item: LibraryEntry) {
    setEditingId(item.id)
    setEditForm({
      titre: item.titre,
      typologie: item.typologie || '',
      periode: item.periode || '',
      description_courte: item.description_courte || '',
      description_longue: item.description_longue || '',
      image_file: null,
      image_url: item.image_ref || '',
      source_url: item.source_url || '',
      lang: item.lang || 'fr',
      traduction_id: item.traduction_id ? String(item.traduction_id) : '',
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
      const body = await buildBody(editForm)
      if (!body) return
      try {
        const updated = await updateLibraryEntry(editingId, body as unknown as LibraryBody)
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        cancelEdit()
        setSnackbar({ message: 'Entrée modifiée avec succès', type: 'success' })
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
          cancelEdit()
        } else {
          setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
        }
      }
    } finally { setEditSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteLibraryEntry(deleteTarget.id)
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      setSnackbar({ message: 'Entrée supprimée', type: 'success' })
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      }
    } finally { setDeleteTarget(null) }
  }

  async function doRollback(item: LibraryEntry) {
    try {
      await rollbackLibraryEntry(item.id)
      setSnackbar({ message: 'Dernière action annulée', type: 'success' })
      cancelEdit()
      setItems([])
      await loadPage(1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSnackbar({ message: 'Aucune action à annuler', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
      }
    }
  }

  function renderForm(
    form: LibraryFormData,
    setForm: (f: LibraryFormData) => void,
    errors: FormErrors,
    fileRef: React.RefObject<HTMLInputElement | null>,
    onSubmit: () => void,
    onCancel: () => void,
    submitting: boolean,
    titleLabel: string,
  ) {
    // Entrées de l'autre langue pour le select traduction
    const otherLang = form.lang === 'fr' ? 'oc' : 'fr'
    const otherEntries = allEntries.filter(e => e.lang === otherLang)

    return (
      <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-md)' }}>{titleLabel}</h2>

        {/* Titre */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Titre *</label>
          <input type="text"
            style={{ ...INPUT_STYLE, borderColor: errors.titre ? 'var(--color-error)' : 'var(--color-border)' }}
            value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} />
          {errors.titre && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.titre}</span>}
        </div>

        {/* Typologie */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Typologie</label>
          <select style={INPUT_STYLE} value={form.typologie} onChange={e => setForm({ ...form, typologie: e.target.value })}>
            <option value="">— Aucune —</option>
            <option value="Histoire">Histoire</option>
            <option value="Légende">Légende</option>
          </select>
        </div>

        {/* Période avec datalist (autocomplétion) */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Période</label>
          <input
            type="text"
            list="periodes-list"
            style={INPUT_STYLE}
            value={form.periode}
            onChange={e => setForm({ ...form, periode: e.target.value })}
            placeholder="ex : Moyen Âge, XIXe siècle…"
          />
          <datalist id="periodes-list">
            {periodes.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>

        {/* Description courte */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description courte</label>
          <input type="text" style={INPUT_STYLE} value={form.description_courte}
            onChange={e => setForm({ ...form, description_courte: e.target.value })} />
        </div>

        {/* Description longue — MarkdownEditor */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description longue (Markdown)</label>
          <MarkdownEditor
            value={form.description_longue}
            onChange={v => setForm({ ...form, description_longue: v })}
            rows={8}
          />
        </div>

        {/* Image fichier */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — fichier (prioritaire, ≤ 2 Mo)</label>
          <input ref={fileRef} type="file" accept="image/*" style={{ fontSize: 'var(--text-sm)' }}
            onChange={e => setForm({ ...form, image_file: e.target.files?.[0] ?? null })} />
        </div>

        {/* Image URL */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — URL</label>
          <input type="url" style={{ ...INPUT_STYLE, opacity: form.image_file ? 0.45 : 1 }}
            value={form.image_url} disabled={!!form.image_file}
            onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
        </div>

        {/* URL source */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>URL source</label>
          <input type="url" style={INPUT_STYLE} value={form.source_url}
            onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
        </div>

        {/* Langue */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Langue</label>
          <select style={INPUT_STYLE} value={form.lang} onChange={e => setForm({ ...form, lang: e.target.value, traduction_id: '' })}>
            <option value="fr">Français (fr)</option>
            <option value="oc">Occitan (oc)</option>
          </select>
        </div>

        {/* Lien traduction bidirectionnel */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>
            Lien traduction ({otherLang === 'fr' ? 'Français' : 'Occitan'})
          </label>
          <select style={INPUT_STYLE} value={form.traduction_id} onChange={e => setForm({ ...form, traduction_id: e.target.value })}>
            <option value="">— Aucun —</option>
            {otherEntries.map(e => (
              <option key={e.id} value={e.id}>{e.titre}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button style={ACTION_BTN} onClick={onSubmit} disabled={submitting} title="Valider">
            <img src={iconValider} alt="Valider" width={18} height={18} />
          </button>
          <button style={ACTION_BTN} onClick={onCancel} title="Annuler">
            <img src={iconAnnuler} alt="Annuler" width={18} height={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>Culture</h1>
        {isAuthenticated && !showCreateForm && (
          <button onClick={openCreateForm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
            Ajouter une entrée
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {showCreateForm && renderForm(createForm, setCreateForm, createErrors, createFileRef, () => void submitCreate(), cancelCreate, createSubmitting, 'Nouvelle entrée')}

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
        {(['', 'Histoire', 'Légende'] as FilterType[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            style={{ padding: '6px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: filterType === t ? 'var(--color-primary)' : 'none', color: filterType === t ? '#fff' : 'var(--color-text)', cursor: 'pointer', fontWeight: filterType === t ? 700 : 400 }}>
            {t || 'Tout'}
          </button>
        ))}
        <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
          <option value="">Toutes les périodes</option>
          {periodes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="text" placeholder="Filtrer par lieu..." value={filterLieu} onChange={e => setFilterLieu(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }} />
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map(item => {
          if (editingId === item.id) {
            return (
              <div key={item.id}>
                {renderForm(editForm, setEditForm, editErrors, editFileRef, () => void submitEdit(), cancelEdit, editSubmitting, `Modifier : ${item.titre}`)}
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
                  <button style={{ ...ACTION_BTN, borderColor: 'var(--color-error)' }} onClick={() => setDeleteTarget(item)} title="Supprimer">
                    <img src={iconSupprimer} alt="Supprimer" width={18} height={18} />
                  </button>
                  <button style={ACTION_BTN} onClick={() => void doRollback(item)} title="Annuler la dernière action">
                    <img src={iconRollback} alt="Rollback" width={18} height={18} />
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <Link to={`/bibliotheque/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2) var(--space-3)', paddingRight: isAuthenticated ? 48 : 'var(--space-3)', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', marginBottom: 4 }}>
                    {item.typologie && (
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-secondary)', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px' }}>
                        {item.typologie}
                      </span>
                    )}
                    {item.periode && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', opacity: 0.6 }}>{item.periode}</span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 'var(--text-md)', margin: '4px 0' }}>{item.titre}</h2>
                  {item.description_courte && (
                    <p style={{ fontSize: 'var(--text-sm)', margin: 0, opacity: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description_courte}
                    </p>
                  )}
                </div>
              </Link>
              {isAuthenticated && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  {item.is_locked ? (
                    <span title="En cours de modification" style={{ display: 'inline-flex', padding: 4, color: 'var(--color-secondary)' }}>
                      <img src={iconVerrou} alt="Verrouillé" width={20} height={20} />
                    </span>
                  ) : (
                    <button style={{ ...ACTION_BTN, background: 'rgba(255,255,255,0.9)' }} onClick={() => startEdit(item)} title="Modifier">
                      <img src={iconEditer} alt="Modifier" width={18} height={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sentinel pour le défilement infini */}
      <div ref={sentinelRef} style={{ height: 32 }} />

      {loading && <p style={{ textAlign: 'center' }}>Chargement…</p>}

      {allLoaded && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--color-text)', opacity: 0.5 }}>
          <img src={iconOlivier} alt="" width={32} height={32} style={{ display: 'block', margin: '0 auto var(--space-2)' }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>Toutes les histoires ont été chargées.</p>
        </div>
      )}

      {/* Modal de confirmation */}
      {deleteTarget && (
        <ConfirmModal
          message="Supprimer cette entrée ? Cette action est irréversible."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Snackbar */}
      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
