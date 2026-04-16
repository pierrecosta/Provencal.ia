import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchAPropos,
  lockBloc,
  unlockBloc,
  updateBloc,
  rollbackBloc,
} from '../services/aProposService'
import { ApiError } from '../services/types'
import type { AProposOut } from '../services/types'
import Snackbar from '../components/ui/Snackbar'
import iconEditer from '../assets/icons/icon-editer.svg'
import iconValider from '../assets/icons/icon-valider.svg'
import iconAnnuler from '../assets/icons/icon-annuler.svg'
import iconVerrou from '../assets/icons/icon-verrou.svg'

const LOCK_TTL_MS = 30 * 60 * 1000

function isActiveLock(lockedAt: string | null): boolean {
  if (!lockedAt) return false
  return Date.now() - new Date(lockedAt).getTime() < LOCK_TTL_MS
}

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

interface EditableBlocProps {
  title: string
  bloc: 'demarche' | 'sources'
  contenu: string
  lockedBy: number | null
  lockedAt: string | null
  isAuthenticated: boolean
  onSave: (bloc: string, newContent: string) => Promise<void>
  onRollback: (bloc: string) => Promise<void>
  setSnackbar: (s: SnackbarState) => void
}

function EditableBloc({
  title,
  bloc,
  contenu,
  lockedBy,
  lockedAt,
  isAuthenticated,
  onSave,
  onRollback,
  setSnackbar,
}: EditableBlocProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(contenu)
  const [submitting, setSubmitting] = useState(false)

  const locked = isActiveLock(lockedAt) && lockedBy !== null

  async function handleEdit() {
    try {
      await lockBloc(bloc)
      setEditValue(contenu)
      setEditing(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setSnackbar({ message: 'Ce bloc est verrouillé par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors du verrouillage', type: 'error' })
      }
    }
  }

  async function handleSave() {
    if (!editValue.trim()) {
      setSnackbar({ message: 'Le contenu ne peut pas être vide', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      // PUT efface le verrou côté backend — pas besoin d'appeler unlockBloc
      await onSave(bloc, editValue)
      setEditing(false)
    } catch {
      setSnackbar({ message: 'Erreur lors de la sauvegarde', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    try {
      await unlockBloc(bloc)
    } catch {
      // Le verrou expirera tout seul
    }
    setEditing(false)
  }

  async function handleRollback() {
    setSubmitting(true)
    try {
      await onRollback(bloc)
      setEditing(false)
      setSnackbar({ message: 'Dernière modification annulée', type: 'success' })
    } catch {
      setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '6px 16px',
    color: 'white',
    cursor: submitting ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    opacity: submitting ? 0.7 : 1,
  }
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: 'var(--color-secondary)',
  }
  const btnOutline: React.CSSProperties = {
    ...btnPrimary,
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  }

  return (
    <section style={{ marginTop: 'var(--space-5)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        {locked && !editing && (
          <img
            src={iconVerrou}
            alt="Verrouillé"
            title="Verrouillé par un autre contributeur"
            width={18}
            height={18}
          />
        )}
        {isAuthenticated && !editing && (
          <button
            onClick={() => void handleEdit()}
            title="Modifier ce bloc"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <img src={iconEditer} alt="Modifier" width={18} height={18} />
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-base)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
              flexWrap: 'wrap',
            }}
          >
            <button onClick={() => void handleSave()} disabled={submitting} style={btnPrimary}>
              <img
                src={iconValider}
                alt=""
                width={16}
                height={16}
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              Valider
            </button>
            <button onClick={() => void handleRollback()} disabled={submitting} style={btnSecondary}>
              Rollback
            </button>
            <button onClick={() => void handleCancel()} disabled={submitting} style={btnOutline}>
              <img src={iconAnnuler} alt="" width={16} height={16} />
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 'var(--space-2)', whiteSpace: 'pre-line' }}>{contenu}</p>
      )}
    </section>
  )
}

export default function AProposPage() {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<AProposOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await fetchAPropos()
      setData(d)
      setFetchError(null)
    } catch {
      setFetchError('Erreur lors du chargement de la page')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleSave(bloc: string, contenu: string) {
    await updateBloc(bloc, contenu)
    await load()
    setSnackbar({ message: 'Modifications enregistrées', type: 'success' })
  }

  async function handleRollback(bloc: string) {
    await rollbackBloc(bloc)
    await unlockBloc(bloc)
    await load()
  }

  if (loading)
    return <p style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>Chargement…</p>
  if (fetchError)
    return (
      <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', color: 'var(--color-error)' }}>
        {fetchError}
      </p>
    )
  if (!data) return null

  return (
    <div style={{ maxWidth: 'var(--container-text-max)', margin: '0 auto' }}>
      <h1>À propos</h1>

      <EditableBloc
        title="La démarche"
        bloc="demarche"
        contenu={data.demarche.contenu}
        lockedBy={data.demarche.locked_by}
        lockedAt={data.demarche.locked_at}
        isAuthenticated={isAuthenticated}
        onSave={handleSave}
        onRollback={handleRollback}
        setSnackbar={setSnackbar}
      />

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>Les contributeurs</h2>
        {data.contributors.length === 0 ? (
          <p style={{ marginTop: 'var(--space-2)' }}>Aucun contributeur pour le moment.</p>
        ) : (
          <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-3)' }}>
            {data.contributors.map((pseudo) => (
              <li key={pseudo}>{pseudo}</li>
            ))}
          </ul>
        )}
      </section>

      <EditableBloc
        title="Les sources lexicographiques"
        bloc="sources"
        contenu={data.sources.contenu}
        lockedBy={data.sources.locked_by}
        lockedAt={data.sources.locked_at}
        isAuthenticated={isAuthenticated}
        onSave={handleSave}
        onRollback={handleRollback}
        setSnackbar={setSnackbar}
      />

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
