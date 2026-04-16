import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ArticlesPage from '../ArticlesPage'
import type { Article } from '../../services/types'

vi.mock('../../hooks/useArticles', () => ({
  useArticles: vi.fn(() => ({
    articles: [
      {
        id: 1,
        titre: 'La langue d\'oc en Provence',
        contenu: 'Article sur la langue.',
        categorie: 'Langue & Culture',
        date_publication: '2026-01-15',
        image_ref: null,
        is_locked: false,
        locked_by: null,
      } as Article,
    ],
    total: 1,
    page: 1,
    pages: 1,
    loading: false,
    filterCategorie: '',
    filterAnnee: '',
    filterMois: '',
    setFilterCategorie: vi.fn(),
    setFilterAnnee: vi.fn(),
    setFilterMois: vi.fn(),
    loadArticles: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    rollbackArticle: vi.fn(),
    replaceArticle: vi.fn(),
    removeArticle: vi.fn(),
  })),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    pseudo: null,
    token: null,
  })),
}))

describe('ArticlesPage', () => {
  it('affiche la liste des articles', () => {
    render(<MemoryRouter><ArticlesPage /></MemoryRouter>)
    expect(screen.getByText('La langue d\'oc en Provence')).toBeInTheDocument()
  })

  it('affiche le filtre par catégorie', () => {
    render(<MemoryRouter><ArticlesPage /></MemoryRouter>)
    expect(screen.getByText('Toutes les catégories')).toBeInTheDocument()
  })
})
