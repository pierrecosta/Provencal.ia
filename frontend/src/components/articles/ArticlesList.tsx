import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/types'
import type { Article, ArticleBody } from '../../services/types'
import ArticleForm from './ArticleForm'
import ConfirmModal from '../ui/ConfirmModal'
import Snackbar from '../ui/Snackbar'
import iconImage from '../../assets/icons/icon-image.svg'
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function imageUrl(ref: string | null) {
  if (!ref) return null
  if (ref.startsWith('http')) return ref
  return `${API_BASE}${ref}`
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  articles: Article[]
  loading: boolean
  isAuthenticated: boolean
  page: number
  onDoUpdate: (id: number, body: ArticleBody) => Promise<Article>
  onDoDelete: (id: number) => Promise<void>
  onDoRollback: (id: number) => Promise<Article>
  onReplaceArticle: (a: Article) => void
  onRemoveArticle: (id: number) => void
  onReload: (p: number) => Promise<void>
}

export default function ArticlesList({
  articles, loading, isAuthenticated, page,
  onDoUpdate, onDoDelete, onDoRollback,
  onReplaceArticle, onRemoveArticle, onReload,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  function startEdit(a: Article) {
    setEditingId(a.id)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await onDoDelete(deleteTarget.id)
      onRemoveArticle(deleteTarget.id)
      setSnackbar({ message: 'Article supprimé', type: 'success' })
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSnackbar({ message: 'Article verrouillé par un autre contributeur', type: 'error' })
      } else {
        setSnackbar({ message: 'Erreur lors de la suppression', type: 'error' })
      }
    } finally {
      setDeleteTarget(null)
    }
  }

  async function doRollback(a: Article) {
    try {
      await onDoRollback(a.id)
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

  if (loading) return <p>Chargement…</p>
  if (!loading && articles.length === 0) return <p>Aucun article trouvé.</p>

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {articles.map((a) => {
          if (editingId === a.id) {
            return (
              <div key={a.id}>
                <ArticleForm
                  title={`Modifier : ${a.titre}`}
                  initialValues={{
                    titre: a.titre,
                    description: a.description ?? '',
                    image_url: a.image_ref ?? '',
                    source_url: a.source_url ?? '',
                    date_publication: a.date_publication ?? '',
                    auteur: a.auteur ?? '',
                    categorie: a.categorie ?? '',
                  }}
                  onSubmit={async (body) => {
                    try {
                      const updated = await onDoUpdate(a.id, body)
                      onReplaceArticle(updated)
                      cancelEdit()
                      setSnackbar({ message: 'Article modifié avec succès', type: 'success' })
                    } catch (err) {
                      if (err instanceof ApiError && err.status === 403) {
                        setSnackbar({ message: 'Article verrouillé par un autre contributeur', type: 'error' })
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
    </>
  )
}
