import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { fetchArticle } from '../services/articlesService'
import type { Article } from '../services/types'
import Breadcrumb from '../components/ui/Breadcrumb'
import BackButton from '../components/ui/BackButton'
import iconImage from '../assets/icons/icon-image.svg'
import iconLienExterne from '../assets/icons/icon-lien-externe.svg'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchArticle(id)
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p>Chargement…</p>
  if (error || !article) return <p>Article introuvable.</p>

  const imageUrl = article.image_ref ? `${API_BASE}/static/images/${article.image_ref}` : null

  return (
    <div style={{ maxWidth: 'var(--container-text-max)', margin: '0 auto' }}>
      <BackButton />
      <Breadcrumb
        items={[
          { label: 'Accueil', path: '/' },
          { label: 'Actualités', path: '/articles' },
          { label: article.titre },
        ]}
      />

      {/* Image hero */}
      <div style={{ width: '100%', maxHeight: 400, overflow: 'hidden', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)', background: 'var(--color-border)' }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
          : <img src={iconImage} alt="Illustration absente" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', padding: 32, opacity: 0.3 }} />
        }
      </div>

      <h1>{article.titre}</h1>

      {/* Bloc auteur/date/catégorie */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', alignItems: 'center', margin: 'var(--space-2) 0', fontSize: 'var(--text-sm)', color: 'var(--color-text)', opacity: 0.7 }}>
        {article.auteur && <span>{article.auteur}</span>}
        {article.date_publication && <span> · {formatDate(article.date_publication)}</span>}
        {article.categorie && (
          <span style={{ background: 'var(--color-secondary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            {article.categorie}
          </span>
        )}
      </div>

      {/* Chapeau */}
      {article.description && (
        <p style={{ fontSize: 'var(--text-md)', fontStyle: 'italic', marginBottom: 'var(--space-3)', borderLeft: '3px solid var(--color-primary)', paddingLeft: 'var(--space-2)' }}>
          {article.description}
        </p>
      )}

      {/* Corps Markdown — placeholder puisque le champ description contient le texte */}
      <div style={{ lineHeight: 1.8 }}>
        <ReactMarkdown>{article.description ?? ''}</ReactMarkdown>
      </div>

      {/* Lien source */}
      {article.source_url && (
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: 'var(--space-3)', padding: '8px 16px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
        >
          <img src={iconLienExterne} alt="" width={16} height={16} />
          Source
        </a>
      )}
    </div>
  )
}
