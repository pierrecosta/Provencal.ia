import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/types'
import type { LibraryEntry, LibraryBody } from '../../services/types'
import LibraryForm from './LibraryForm'
import ConfirmModal from '../ui/ConfirmModal'
import Snackbar from '../ui/Snackbar'
import iconOlivier from '../../assets/icons/icon-olivier.svg'
import iconEditer from '../../assets/icons/icon-editer.svg'
import iconSupprimer from '../../assets/icons/icon-supprimer.svg'
import iconRollback from '../../assets/icons/icon-rollback.svg'
import iconVerrou from '../../assets/icons/icon-verrou.svg'

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

interface Props {
  entries: LibraryEntry[]
  loading: boolean
  allLoaded: boolean
  isAuthenticated: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  onDoUpdate: (id: number, body: LibraryBody) => Promise<LibraryEntry>
  onDoDelete: (id: number) => Promise<void>
  onDoRollback: (id: number) => Promise<LibraryEntry>
  onReplaceEntry: (e: LibraryEntry) => void
  onRemoveEntry: (id: number) => void
  onResetAndLoad: () => void
}

export default function LibraryList({
  entries, loading, allLoaded, isAuthenticated, sentinelRef,
  onDoUpdate, onDoDelete, onDoRollback,
  onReplaceEntry, onRemoveEntry, onResetAndLoad,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LibraryEntry | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  function startEdit(item: LibraryEntry) {
    setEditingId(item.id)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await onDoDelete(deleteTarget.id)
      onRemoveEntry(deleteTarget.id)
      setSnackbar({ message: 'Entrée supprimée', type: 'success' })
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      }
    } finally {
      setDeleteTarget(null)
    }
  }

  async function doRollback(item: LibraryEntry) {
    try {
      await onDoRollback(item.id)
      setSnackbar({ message: 'Dernière action annulée', type: 'success' })
      cancelEdit()
      onResetAndLoad()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSnackbar({ message: 'Aucune action à annuler', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors du rollback', type: 'error' })
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {entries.map((item) => {
          if (editingId === item.id) {
            return (
              <div key={item.id}>
                <LibraryForm
                  title={`Modifier : ${item.titre}`}
                  initialValues={{
                    titre: item.titre,
                    typologie: item.typologie ?? '',
                    periode: item.periode ?? '',
                    description_courte: item.description_courte ?? '',
                    description_longue: item.description_longue ?? '',
                    image_url: item.image_ref ?? '',
                    source_url: item.source_url ?? '',
                    lang: item.lang ?? 'fr',
                    traduction_id: item.traduction_id ? String(item.traduction_id) : '',
                  }}
                  onSubmit={async (body) => {
                    try {
                      const updated = await onDoUpdate(item.id, body)
                      onReplaceEntry(updated)
                      cancelEdit()
                      setSnackbar({ message: 'Entrée modifiée avec succès', type: 'success' })
                    } catch (err) {
                      if (err instanceof ApiError && err.status === 403) {
                        setSnackbar({ message: 'Entrée verrouillée par un autre contributeur', type: 'error' })
                        cancelEdit()
                      } else {
                        setSnackbar({ message: 'Erreur lors de la modification', type: 'error' })
                      }
                      throw err
                    }
                  }}
                  onCancel={cancelEdit}
                  onSnackbar={(msg, type) => setSnackbar({ message: msg, type })}
                />
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

      {deleteTarget && (
        <ConfirmModal
          message="Supprimer cette entrée ? Cette action est irréversible."
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
