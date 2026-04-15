import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../services/api'
import iconImage from '../assets/icons/icon-image.svg'

const CATEGORIES = [
  'Langue & Culture', 'Gastronomie', 'Fêtes & Traditions', 'Histoire', 'Musique',
  'Littérature', 'Arts & Artisanat', 'Nature & Terroir', 'Architecture',
  'Cinéma & Spectacles', 'Sport', 'Tourisme', 'Sciences & Recherche',
  'Éducation', 'Environnement', 'Religion & Spiritualité', 'Économie Locale',
  'Politique Régionale', 'Portrait', 'Divers',
]

interface Article {
  id: number
  titre: string
  description: string | null
  auteur: string | null
  date_publication: string | null
  categorie: string | null
  image_ref: string | null
}

interface PageData {
  items: Article[]
  total: number
  page: number
  pages: number
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [categorie, setCategorie] = useState('')
  const [annee, setAnnee] = useState('')
  const [mois, setMois] = useState('')

  const fetch = useCallback(async (p: number) => {
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

  useEffect(() => { fetch(1) }, [fetch])

  return (
    <div>
      <h1>Actualités</h1>

      {/* Filtres */}
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

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {articles.map(a => (
          <Link key={a.id} to={`/articles/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#fff' }}>
              <div style={{ width: 120, flexShrink: 0, background: 'var(--color-border)' }}>
                {a.image_ref
                  ? <img src={`${API_BASE}/static/images/${a.image_ref}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={iconImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16, opacity: 0.3 }} />
                }
              </div>
              <div style={{ padding: 'var(--space-2)', flex: 1 }}>
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
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button onClick={() => fetch(page - 1)} disabled={page <= 1} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>←</button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {pages} ({total} articles)</span>
          <button onClick={() => fetch(page + 1)} disabled={page >= pages} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: page < pages ? 'pointer' : 'not-allowed' }}>→</button>
        </div>
      )}
    </div>
  )
}
