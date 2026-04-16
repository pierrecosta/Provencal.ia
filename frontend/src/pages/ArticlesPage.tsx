import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useArticles } from '../hooks/useArticles'
import ArticlesList from '../components/articles/ArticlesList'
import ArticleFilters from '../components/articles/ArticleFilters'
import ArticleForm from '../components/articles/ArticleForm'
import Snackbar from '../components/ui/Snackbar'
import iconAjouter from '../assets/icons/icon-ajouter.svg'

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

export default function ArticlesPage() {
  const { isAuthenticated } = useAuth()
  const {
    articles, total, page, pages, loading,
    filterCategorie, filterAnnee, filterMois,
    setFilterCategorie, setFilterAnnee, setFilterMois,
    loadArticles,
    createArticle, updateArticle, deleteArticle, rollbackArticle,
    replaceArticle, removeArticle,
  } = useArticles()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>Actualités</h1>
        {isAuthenticated && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
          >
            <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
            Ajouter un article
          </button>
        )}
      </div>

      {showCreateForm && (
        <ArticleForm
          title="Nouvel article"
          onSubmit={async (body) => {
            await createArticle(body)
            setShowCreateForm(false)
            setSnackbar({ message: 'Article créé avec succès', type: 'success' })
            await loadArticles(1)
          }}
          onCancel={() => setShowCreateForm(false)}
          onSnackbar={(msg, type) => setSnackbar({ message: msg, type })}
        />
      )}

      <ArticleFilters
        categorie={filterCategorie}
        annee={filterAnnee}
        mois={filterMois}
        onSetCategorie={setFilterCategorie}
        onSetAnnee={setFilterAnnee}
        onSetMois={setFilterMois}
      />

      <ArticlesList
        articles={articles}
        loading={loading}
        isAuthenticated={isAuthenticated}
        page={page}
        onDoUpdate={updateArticle}
        onDoDelete={deleteArticle}
        onDoRollback={rollbackArticle}
        onReplaceArticle={replaceArticle}
        onRemoveArticle={removeArticle}
        onReload={loadArticles}
      />

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button onClick={() => void loadArticles(page - 1)} disabled={page <= 1}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>←</button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} articles)</span>
          <button onClick={() => void loadArticles(page + 1)} disabled={page >= pages}
            style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>→</button>
        </div>
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}

