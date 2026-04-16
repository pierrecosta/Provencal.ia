import { useState } from 'react'
import { ApiError } from '../../services/types'
import type { Saying, SayingCreate, SayingUpdate } from '../../services/types'
import Snackbar from '../ui/Snackbar'
import ConfirmModal from '../ui/ConfirmModal'
import iconCigale from '../../assets/icons/icon-cigale.svg'
import iconAjouter from '../../assets/icons/icon-ajouter.svg'
import iconEditer from '../../assets/icons/icon-editer.svg'
import iconValider from '../../assets/icons/icon-valider.svg'
import iconSupprimer from '../../assets/icons/icon-supprimer.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'
import iconVerrou from '../../assets/icons/icon-verrou.svg'

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

interface Props {
  sayings: Saying[]
  hasMore: boolean
  listLoading: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  filterType: string | null
  filterLocalite: string
  isAuthenticated: boolean
  onSetFilterType: (t: string | null) => void
  onSetFilterLocalite: (l: string) => void
  onCreateSaying: (data: SayingCreate) => Promise<Saying>
  onUpdateSaying: (id: number, data: SayingUpdate) => Promise<Saying>
  onDeleteSaying: (id: number) => Promise<void>
  onAdd: (s: Saying) => void
  onReplace: (s: Saying) => void
  onRemove: (id: number) => void
}

export default function SayingsList({
  sayings, hasMore, listLoading, sentinelRef,
  filterType, filterLocalite,
  isAuthenticated,
  onSetFilterType, onSetFilterLocalite,
  onCreateSaying, onUpdateSaying, onDeleteSaying,
  onAdd, onReplace, onRemove,
}: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<SayingFormData>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<FormErrors>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<SayingFormData>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Saying | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  function handleTypeFilter(type: string | null) {
    onSetFilterType(type)
  }

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
      const body: SayingCreate = {
        terme_provencal: createForm.terme_provencal.trim(),
        localite_origine: createForm.localite_origine.trim(),
        traduction_sens_fr: createForm.traduction_sens_fr.trim(),
        type: createForm.type || null,
        contexte: createForm.contexte.trim() || null,
        source: createForm.source.trim() || null,
      }
      const created = await onCreateSaying(body)
      onAdd(created)
      setShowCreateForm(false)
      setCreateForm(EMPTY_FORM)
      setSnackbar({ message: 'Terme ajouté avec succès', type: 'success' })
    } catch {
      setSnackbar({ message: 'Erreur lors de la création', type: 'error' })
    } finally {
      setCreateSubmitting(false)
    }
  }

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
      const body: SayingUpdate = {
        terme_provencal: editForm.terme_provencal.trim(),
        localite_origine: editForm.localite_origine.trim(),
        traduction_sens_fr: editForm.traduction_sens_fr.trim(),
        type: editForm.type || null,
        contexte: editForm.contexte.trim() || null,
        source: editForm.source.trim() || null,
      }
      const updated = await onUpdateSaying(editingId, body)
      onReplace(updated)
      cancelEdit()
      setSnackbar({ message: 'Terme modifié avec succès', type: 'success' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Ce terme est verrouillé par un autre contributeur', type: 'error' })
        cancelEdit()
      } else {
        setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await onDeleteSaying(deleteTarget.id)
      onRemove(deleteTarget.id)
      setSnackbar({ message: 'Terme supprimé', type: 'success' })
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Ce terme est verrouillé par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      }
    } finally {
      setDeleteTarget(null)
    }
  }

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
    <>
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
          onChange={(e) => onSetFilterLocalite(e.target.value)}
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

        {sayings.map((s) => renderSayingCard(s))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="sayings-list__sentinel" />

        {listLoading && (
          <div className="sayings-list__loading">
            <span className="spinner" aria-label="Chargement" />
          </div>
        )}

        {!hasMore && sayings.length > 0 && !listLoading && (
          <div className="sayings-list__end">
            <img src={iconCigale} alt="" aria-hidden="true" width={40} height={40} />
            <p>Vous avez parcouru toute la Mémoire vivante</p>
          </div>
        )}

        {!listLoading && sayings.length === 0 && !hasMore && (
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
    </>
  )
}
