import { useEffect, useRef, useState, useCallback } from 'react'
import { apiFetch } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import Snackbar from '../components/ui/Snackbar'
import ConfirmModal from '../components/ui/ConfirmModal'
import iconCigale from '../assets/icons/icon-cigale.svg'
import iconAjouter from '../assets/icons/icon-ajouter.svg'
import iconEditer from '../assets/icons/icon-editer.svg'
import iconValider from '../assets/icons/icon-valider.svg'
import iconSupprimer from '../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../assets/icons/icon-annuler.svg'
import iconVerrou from '../assets/icons/icon-verrou.svg'
import './HomePage.css'

interface Saying {
  id: number
  terme_provencal: string
  localite_origine: string
  traduction_sens_fr: string
  type: string | null
  contexte: string | null
  source: string | null
  is_locked: boolean
  locked_by: number | null
}

interface PaginatedSayings {
  items: Saying[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface SayingFormData {
  terme_provencal: string
  localite_origine: string
  traduction_sens_fr: string
  type: string
  contexte: string
  source: string
}

interface FormErrors {
  terme_provencal?: string
  localite_origine?: string
  traduction_sens_fr?: string
}

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

const TYPES = ['Dicton', 'Expression', 'Proverbe'] as const

const EMPTY_FORM: SayingFormData = {
  terme_provencal: '',
  localite_origine: '',
  traduction_sens_fr: '',
  type: '',
  contexte: '',
  source: '',
}

function validateForm(data: SayingFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.terme_provencal.trim()) errors.terme_provencal = 'Champ obligatoire'
  else if (data.terme_provencal.length > 500) errors.terme_provencal = '500 caractères max'
  if (!data.localite_origine.trim()) errors.localite_origine = 'Champ obligatoire'
  else if (data.localite_origine.length > 200) errors.localite_origine = '200 caractères max'
  if (!data.traduction_sens_fr.trim()) errors.traduction_sens_fr = 'Champ obligatoire'
  return errors
}

export default function HomePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { isAuthenticated } = useAuth()

  /* ── Terme du jour ── */
  const [todaySaying, setTodaySaying] = useState<Saying | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState(false)

  /* ── Liste ── */
  const [items, setItems] = useState<Saying[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [listLoading, setListLoading] = useState(false)

  /* ── Filtres ── */
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterLocalite, setFilterLocalite] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  /* ── Mode création ── */
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<SayingFormData>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  /* ── Mode édition ── */
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<SayingFormData>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  /* ── Suppression ── */
  const [deleteTarget, setDeleteTarget] = useState<Saying | null>(null)

  /* ── Snackbar ── */
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  /* ── Fetch terme du jour ── */
  useEffect(() => {
    let cancelled = false
    setTodayLoading(true)
    setTodayError(false)

    apiFetch('/api/v1/sayings/today')
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          setTodaySaying(await res.json())
        } else {
          setTodayError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setTodayError(true)
      })
      .finally(() => {
        if (!cancelled) setTodayLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  /* ── Fetch liste paginée ── */
  const fetchPage = useCallback(
    async (pageNum: number, type: string | null, localite: string, reset: boolean) => {
      setListLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('per_page', '20')
      if (type) params.set('type', type)
      if (localite.trim()) params.set('localite', localite.trim())

      try {
        const res = await apiFetch(`/api/v1/sayings?${params.toString()}`)
        if (!res.ok) return
        const data: PaginatedSayings = await res.json()

        setItems((prev) => (reset ? data.items : [...prev, ...data.items]))
        setHasMore(pageNum < data.pages)
        setPage(pageNum)
      } finally {
        setListLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void fetchPage(1, filterType, filterLocalite, true)
  }, [filterType, fetchPage])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setHasMore(true)
      void fetchPage(1, filterType, filterLocalite, true)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filterLocalite, filterType, fetchPage])

  const loadMore = useCallback(() => {
    if (!listLoading && hasMore) {
      void fetchPage(page + 1, filterType, filterLocalite, false)
    }
  }, [listLoading, hasMore, page, filterType, filterLocalite, fetchPage])

  const sentinelRef = useInfiniteScroll({
    loading: listLoading,
    hasMore,
    onLoadMore: loadMore,
  })

  function handleTypeFilter(type: string | null) {
    setFilterType(type)
    setHasMore(true)
  }

  /* ── Création ── */
  function openCreateForm() {
    setShowCreateForm(true)
    setCreateForm(EMPTY_FORM)
    setCreateErrors({})
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
      const body: Record<string, string | null> = {
        terme_provencal: createForm.terme_provencal.trim(),
        localite_origine: createForm.localite_origine.trim(),
        traduction_sens_fr: createForm.traduction_sens_fr.trim(),
        type: createForm.type || null,
        contexte: createForm.contexte.trim() || null,
        source: createForm.source.trim() || null,
      }
      const res = await apiFetch('/api/v1/sayings', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la création', type: 'error' })
        return
      }
      const created: Saying = await res.json()
      setItems((prev) => [created, ...prev])
      setShowCreateForm(false)
      setCreateForm(EMPTY_FORM)
      setSnackbar({ message: 'Terme ajouté avec succès', type: 'success' })
    } finally {
      setCreateSubmitting(false)
    }
  }

  /* ── Édition ── */
  function startEdit(saying: Saying) {
    setEditingId(saying.id)
    setEditForm({
      terme_provencal: saying.terme_provencal,
      localite_origine: saying.localite_origine,
      traduction_sens_fr: saying.traduction_sens_fr,
      type: saying.type || '',
      contexte: saying.contexte || '',
      source: saying.source || '',
    })
    setEditErrors({})
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
      const body: Record<string, string | null> = {
        terme_provencal: editForm.terme_provencal.trim(),
        localite_origine: editForm.localite_origine.trim(),
        traduction_sens_fr: editForm.traduction_sens_fr.trim(),
        type: editForm.type || null,
        contexte: editForm.contexte.trim() || null,
        source: editForm.source.trim() || null,
      }
      const res = await apiFetch(`/api/v1/sayings/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (res.status === 403) {
        setSnackbar({ message: 'Ce terme est verrouillé par un autre contributeur', type: 'error' })
        cancelEdit()
        return
      }
      if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
        return
      }
      const updated: Saying = await res.json()
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      cancelEdit()
      setSnackbar({ message: 'Terme modifié avec succès', type: 'success' })
    } finally {
      setEditSubmitting(false)
    }
  }

  /* ── Suppression ── */
  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const res = await apiFetch(`/api/v1/sayings/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (res.status === 403) {
        setSnackbar({ message: 'Ce terme est verrouillé par un autre contributeur', type: 'error' })
      } else if (!res.ok) {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      } else {
        setItems((prev) => prev.filter((s) => s.id !== deleteTarget.id))
        setSnackbar({ message: 'Terme supprimé', type: 'success' })
        cancelEdit()
      }
    } finally {
      setDeleteTarget(null)
    }
  }

  /* ── Rendu d'un champ de formulaire ── */
  function renderField(
    label: string,
    name: keyof SayingFormData,
    form: SayingFormData,
    setForm: (f: SayingFormData) => void,
    errors: FormErrors,
    multiline?: boolean,
  ) {
    const error = name in errors ? (errors as Record<string, string>)[name] : undefined
    const id = `field-${name}`
    return (
      <div className="saying-form__field">
        <label htmlFor={id} className="saying-form__label">{label}</label>
        {name === 'type' ? (
          <select
            id={id}
            className="saying-form__input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">— Aucun —</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : multiline ? (
          <textarea
            id={id}
            className={`saying-form__input saying-form__textarea${error ? ' saying-form__input--error' : ''}`}
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            rows={3}
          />
        ) : (
          <input
            id={id}
            className={`saying-form__input${error ? ' saying-form__input--error' : ''}`}
            type="text"
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          />
        )}
        {error && <span className="saying-form__error">{error}</span>}
      </div>
    )
  }

  /* ── Rendu d'une carte saying ── */
  function renderSayingCard(s: Saying) {
    const isEditing = editingId === s.id

    if (isEditing) {
      return (
        <article key={s.id} className="saying-card saying-card--editing">
          {renderField('Terme provençal', 'terme_provencal', editForm, setEditForm, editErrors, true)}
          {renderField('Localité d\'origine', 'localite_origine', editForm, setEditForm, editErrors)}
          {renderField('Traduction / sens en français', 'traduction_sens_fr', editForm, setEditForm, editErrors, true)}
          {renderField('Type', 'type', editForm, setEditForm, editErrors)}
          {renderField('Contexte', 'contexte', editForm, setEditForm, editErrors, true)}
          {renderField('Source', 'source', editForm, setEditForm, editErrors)}

          <div className="saying-card__actions">
            <button
              className="saying-card__action-btn"
              onClick={() => void submitEdit()}
              disabled={editSubmitting}
              title="Valider"
            >
              <img src={iconValider} alt="Valider" width={20} height={20} />
            </button>
            <button
              className="saying-card__action-btn saying-card__action-btn--danger"
              onClick={() => setDeleteTarget(s)}
              title="Supprimer"
            >
              <img src={iconSupprimer} alt="Supprimer" width={20} height={20} />
            </button>
            <button
              className="saying-card__action-btn"
              onClick={cancelEdit}
              title="Annuler"
            >
              <img src={iconAnnuler} alt="Annuler" width={20} height={20} />
            </button>
          </div>
        </article>
      )
    }

    return (
      <article key={s.id} className="saying-card">
        <div className="saying-card__header">
          <p className="saying-card__terme">{s.terme_provencal}</p>
          {isAuthenticated && (
            s.is_locked ? (
              <span className="saying-card__lock" title="En cours de modification">
                <img src={iconVerrou} alt="Verrouillé" width={20} height={20} />
              </span>
            ) : (
              <button
                className="saying-card__action-btn"
                onClick={() => startEdit(s)}
                title="Modifier"
              >
                <img src={iconEditer} alt="Modifier" width={20} height={20} />
              </button>
            )
          )}
        </div>
        <div className="saying-card__meta">
          {s.type && <span className="saying-card__badge">{s.type}</span>}
          <span className="saying-card__localite">{s.localite_origine}</span>
        </div>
        <p className="saying-card__traduction">{s.traduction_sens_fr}</p>
      </article>
    )
  }

  return (
    <div className="home-page">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Accueil — Mémoire vivante
      </h1>

      {/* Terme du jour */}
      <section className="today-card" aria-label="Terme du jour">
        {todayLoading && (
          <div className="today-card__loading">
            <span className="spinner" aria-label="Chargement" />
          </div>
        )}
        {todayError && !todayLoading && (
          <p className="today-card__empty">Aucun terme du jour disponible.</p>
        )}
        {todaySaying && !todayLoading && (
          <>
            <p className="today-card__terme">{todaySaying.terme_provencal}</p>
            {todaySaying.type && (
              <span className="today-card__badge">{todaySaying.type}</span>
            )}
            <p className="today-card__localite">{todaySaying.localite_origine}</p>
            <p className="today-card__traduction">{todaySaying.traduction_sens_fr}</p>
          </>
        )}
      </section>

      {/* Filtres */}
      <section className="home-filters" aria-label="Filtres">
        <div className="home-filters__types">
          <button
            className={`home-filters__chip${filterType === null ? ' home-filters__chip--active' : ''}`}
            onClick={() => handleTypeFilter(null)}
          >
            Tout
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={`home-filters__chip${filterType === t ? ' home-filters__chip--active' : ''}`}
              onClick={() => handleTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          className="home-filters__localite"
          type="text"
          placeholder="Filtrer par localité…"
          value={filterLocalite}
          onChange={(e) => setFilterLocalite(e.target.value)}
          aria-label="Filtrer par localité"
        />
      </section>

      {/* Liste des sayings */}
      <section className="sayings-list" aria-label="Liste des dictons, expressions et proverbes">
        {/* Formulaire de création */}
        {showCreateForm && (
          <article className="saying-card saying-card--editing">
            {renderField('Terme provençal', 'terme_provencal', createForm, setCreateForm, createErrors, true)}
            {renderField('Localité d\'origine', 'localite_origine', createForm, setCreateForm, createErrors)}
            {renderField('Traduction / sens en français', 'traduction_sens_fr', createForm, setCreateForm, createErrors, true)}
            {renderField('Type', 'type', createForm, setCreateForm, createErrors)}
            {renderField('Contexte', 'contexte', createForm, setCreateForm, createErrors, true)}
            {renderField('Source', 'source', createForm, setCreateForm, createErrors)}

            <div className="saying-card__actions">
              <button
                className="saying-card__action-btn"
                onClick={() => void submitCreate()}
                disabled={createSubmitting}
                title="Valider"
              >
                <img src={iconValider} alt="Valider" width={20} height={20} />
              </button>
              <button
                className="saying-card__action-btn"
                onClick={cancelCreate}
                title="Annuler"
              >
                <img src={iconAnnuler} alt="Annuler" width={20} height={20} />
              </button>
            </div>
          </article>
        )}

        {items.map((s) => renderSayingCard(s))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="sayings-list__sentinel" />

        {listLoading && (
          <div className="sayings-list__loading">
            <span className="spinner" aria-label="Chargement" />
          </div>
        )}

        {!hasMore && items.length > 0 && !listLoading && (
          <div className="sayings-list__end">
            <img src={iconCigale} alt="" aria-hidden="true" width={40} height={40} />
            <p>Vous avez parcouru toute la Mémoire vivante</p>
          </div>
        )}

        {!listLoading && items.length === 0 && !hasMore && (
          <p className="sayings-list__empty">Aucun résultat pour ces filtres.</p>
        )}

        {/* Bouton Ajouter */}
        {isAuthenticated && !showCreateForm && (
          <button
            className="sayings-list__add-btn"
            onClick={openCreateForm}
            title="Ajouter un terme"
          >
            <img src={iconAjouter} alt="Ajouter" width={24} height={24} />
          </button>
        )}
      </section>

      {/* Modal de confirmation de suppression */}
      {deleteTarget && (
        <ConfirmModal
          message="Supprimer ce terme ? Cette action est irréversible."
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
