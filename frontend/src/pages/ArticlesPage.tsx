import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Snackbar from '../components/ui/Snackbar'
import ConfirmModal from '../components/ui/ConfirmModal'
import { compressImage } from '../utils/imageCompression'
import iconImage from '../assets/icons/icon-image.svg'
import iconAjouter from '../assets/icons/icon-ajouter.svg'
import iconEditer from '../assets/icons/icon-editer.svg'
import iconValider from '../assets/icons/icon-valider.svg'
import iconSupprimer from '../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../assets/icons/icon-annuler.svg'
import iconVerrou from '../assets/icons/icon-verrou.svg'
import iconRollback from '../assets/icons/icon-rollback.svg'

const CATEGORIES = [
  'Langue & Culture', 'Littérature', 'Poésie', 'Histoire & Mémoire',
  'Traditions & Fêtes', 'Musique', 'Danse', 'Gastronomie', 'Artisanat',
  'Patrimoine bâti', 'Environnement', 'Personnalités', 'Associations',
  'Enseignement', 'Économie locale', 'Numismatique & Archives',
  'Immigration & Diaspora', 'Jeunesse', 'Régionalisme & Politique linguistique',
  'Divers',
]

interface Article {
  id: number
  titre: string
  description: string | null
  auteur: string | null
  date_publication: string | null
  categorie: string | null
  image_ref: string | null
  source_url: string | null
  is_locked: boolean
  locked_by: number | null
}

interface PageData {
  items: Article[]
  total: number
  page: number
  pages: number
}

interface ArticleFormData {
  titre: string
  description: string
  image_file: File | null
  image_url: string
  source_url: string
  date_publication: string
  auteur: string
  categorie: string
}

interface FormErrors {
  titre?: string
  date_publication?: string
}

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

const EMPTY_FORM: ArticleFormData = {
  titre: '',
  description: '',
  image_file: null,
  image_url: '',
  source_url: '',
  date_publication: new Date().toISOString().slice(0, 10),
  auteur: '',
  categorie: '',
}

function validateForm(form: ArticleFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  if (!form.date_publication) errors.date_publication = 'Champ obligatoire'
  return errors
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function imageUrl(ref: string | null) {
  if (!ref) return null
  if (ref.startsWith('http')) return ref
  return `${API_BASE}${ref}`
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

export default function ArticlesPage() {
  const { isAuthenticated } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [categorie, setCategorie] = useState('')
  const [annee, setAnnee] = useState('')
  const [mois, setMois] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<ArticleFormData>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ArticleFormData>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  const fetchArticles = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '20' })
      if (categorie) params.set('categorie', categorie)
      if (annee) params.set('annee', annee)
      if (mois) params.set('mois', mois)
      const resp = await apiFetch(`/api/v1/articles?${params}`)
      if (resp.ok) {
        const data: PageData = await resp.json()
        setArticles(data.items)
        setTotal(data.total)
        setPages(data.pages)
        setPage(data.page)
      }
    } finally {
      setLoading(false)
    }
  }, [categorie, annee, mois])

  useEffect(() => { void fetchArticles(1) }, [fetchArticles])

  async function uploadImage(file: File): Promise<string | null> {
    const compressed = await compressImage(file, 2)
    const formData = new FormData()
    formData.append('file', compressed)
    const res = await apiFetch('/api/v1/upload/image', { method: 'POST', body: formData })
    if (!res.ok) {
      setSnackbar({ message: "Erreur lors de l'upload de l'image", type: 'error' })
      return null
    }
    const data = await res.json() as { image_ref: string }
    return data.image_ref
  }

  async function buildBody(form: ArticleFormData): Promise<Record<string, unknown> | null> {
    let image_ref: string | null = null
    if (form.image_file) {
      image_ref = await uploadImage(form.image_file)
      if (image_ref === null) return null
    } else if (form.image_url.trim()) {
      image_ref = form.image_url.trim()
    }
    return {
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      image_ref,
      source_url: form.source_url.trim() || null,
      date_publication: form.date_publication,
      auteur: form.auteur.trim() || null,
      categorie: form.categorie || null,
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
      const res = await apiFetch('/api/v1/articles', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) { setSnackbar({ message: 'Erreur lors de la création', type: 'error' }); return }
      setShowCreateForm(false)
      setCreateForm(EMPTY_FORM)
      setSnackbar({ message: 'Article créé avec succès', type: 'success' })
      await fetchArticles(1)
    } finally { setCreateSubmitting(false) }
  }

  function startEdit(a: Article) {
    setEditingId(a.id)
    setEditForm({
      titre: a.titre,
      description: a.description || '',
      image_file: null,
      image_url: a.image_ref || '',
      source_url: a.source_url || '',
      date_publication: a.date_publication || '',
      auteur: a.auteur || '',
      categorie: a.categorie || '',
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
      const res = await apiFetch(`/api/v1/articles/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      if (res.status === 403) { setSnackbar({ message: 'Article verrouillé par un autre contributeur', type: 'error' }); cancelEdit(); return }
      if (!res.ok) { setSnackbar({ message: 'Erreur lors de la modification', type: 'error' }); return }
      const updated: Article = await res.json()
      setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))
      cancelEdit()
      setSnackbar({ message: 'Article modifié avec succès', type: 'success' })
    } finally { setEditSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const res = await apiFetch(`/api/v1/articles/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.status === 403) { setSnackbar({ message: 'Article verrouillé par un autre contributeur', type: 'error' }) }
      else if (!res.ok) { setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' }) }
      else {
        setArticles(prev => prev.filter(a => a.id !== deleteTarget.id))
        setSnackbar({ message: 'Article supprimé', type: 'success' })
        cancelEdit()
      }
    } finally { setDeleteTarget(null) }
  }

  async function doRollback(a: Article) {
    const res = await apiFetch(`/api/v1/articles/${a.id}/rollback`, { method: 'POST' })
    if (res.status === 404) { setSnackbar({ message: 'Aucune action à annuler', type: 'error' }) }
    else if (!res.ok) { setSnackbar({ message: 'Erreur lors du rollback', type: 'error' }) }
    else {
      setSnackbar({ message: 'Dernière action annulée', type: 'success' })
      cancelEdit()
      await fetchArticles(page)
    }
  }

  function renderForm(
    form: ArticleFormData,
    setForm: (f: ArticleFormData) => void,
    errors: FormErrors,
    fileRef: React.RefObject<HTMLInputElement | null>,
    onSubmit: () => void,
    onCancel: () => void,
    submitting: boolean,
    title: string,
  ) {
    const errBorder = (f?: string) => f ? 'var(--color-error)' : 'var(--color-border)'
    return (
      <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-md)' }}>{title}</h2>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Titre *</label>
          <input type="text" style={{ ...INPUT_STYLE, borderColor: errBorder(errors.titre) }} value={form.titre}
            onChange={e => setForm({ ...form, titre: e.target.value })} />
          {errors.titre && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.titre}</span>}
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description / chapeau</label>
          <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 60 } as React.CSSProperties} rows={2}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — fichier (prioritaire, ≤ 2 Mo)</label>
          <input ref={fileRef} type="file" accept="image/*" style={{ fontSize: 'var(--text-sm)' }}
            onChange={e => setForm({ ...form, image_file: e.target.files?.[0] ?? null })} />
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — URL</label>
          <input type="url" style={{ ...INPUT_STYLE, opacity: form.image_file ? 0.45 : 1 }}
            value={form.image_url} disabled={!!form.image_file}
            onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Date de publication *</label>
          <input type="date" style={{ ...INPUT_STYLE, borderColor: errBorder(errors.date_publication) }}
            value={form.date_publication} onChange={e => setForm({ ...form, date_publication: e.target.value })} />
          {errors.date_publication && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.date_publication}</span>}
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Auteur</label>
          <input type="text" style={INPUT_STYLE} value={form.auteur}
            onChange={e => setForm({ ...form, auteur: e.target.value })} />
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Catégorie</label>
          <select style={INPUT_STYLE} value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
            <option value="">— Aucune —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>URL source</label>
          <input type="url" style={INPUT_STYLE} value={form.source_url}
            onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>Actualités</h1>
        {isAuthenticated && !showCreateForm && (
          <button onClick={openCreateForm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
            Ajouter un article
          </button>
        )}
      </div>

      {showCreateForm && renderForm(createForm, setCreateForm, createErrors, createFileRef, () => void submitCreate(), cancelCreate, createSubmitting, 'Nouvel article')}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
        <select value={categorie} onChange={e => setCategorie(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" placeholder="Année" value={annee} onChange={e => setAnnee(e.target.value)}
          style={{ width: 90, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }} />
        <select value={mois} onChange={e => setMois(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
          <option value="">Tous les mois</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Chargement…</p>}
      {!loading && articles.length === 0 && <p>Aucun article trouvé.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {articles.map(a => {
          if (editingId === a.id) {
            return (
              <div key={a.id}>
                {renderForm(editForm, setEditForm, editErrors, editFileRef, () => void submitEdit(), cancelEdit, editSubmitting, `Modifier : ${a.titre}`)}
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
                  <button style={{ ...ACTION_BTN, borderColor: 'var(--color-error)' }} onClick={() => setDeleteTarget(a)} title="Supprimer">
                    <img src={iconSupprimer} alt="Supprimer" width={18} height={18} />
                  </button>
                  <button style={ACTION_BTN} onClick={() => void doRollback(a)} title="Annuler la dernière action">
                    <img src={iconRollback} alt="Rollback" width={18} height={18} />
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div key={a.id} style={{ position: 'relative' }}>
              <Link to={`/articles/${a.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#fff' }}>
                  <div style={{ width: 120, flexShrink: 0, background: 'var(--color-border)' }}>
                    {a.image_ref
                      ? <img src={imageUrl(a.image_ref)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={iconImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16, opacity: 0.3 }} />
                    }
                  </div>
                  <div style={{ padding: 'var(--space-2)', flex: 1, paddingRight: isAuthenticated ? 48 : 'var(--space-2)' }}>
                    {a.categorie && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', fontWeight: 600 }}>{a.categorie}</span>}
                    <h2 style={{ margin: '4px 0', fontSize: 'var(--text-md)' }}>{a.titre}</h2>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', opacity: 0.6 }}>
                      {a.auteur && <span>{a.auteur} · </span>}
                      {formatDate(a.date_publication)}
                    </div>
                    {a.description && <p style={{ marginTop: 8, fontSize: 'var(--text-sm)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.description}</p>}
                  </div>
                </div>
              </Link>
              {isAuthenticated && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  {a.is_locked ? (
                    <span title="En cours de modification" style={{ display: 'inline-flex', padding: 4, color: 'var(--color-secondary)' }}>
                      <img src={iconVerrou} alt="Verrouillé" width={20} height={20} />
                    </span>
                  ) : (
                    <button style={{ ...ACTION_BTN, background: 'rgba(255,255,255,0.9)' }} onClick={() => startEdit(a)} title="Modifier">
                      <img src={iconEditer} alt="Modifier" width={18} height={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button onClick={() => void fetchArticles(page - 1)} disabled={page <= 1}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>←</button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} articles)</span>
          <button onClick={() => void fetchArticles(page + 1)} disabled={page >= pages}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>→</button>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Supprimer cet article ? Cette action est irréversible."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
