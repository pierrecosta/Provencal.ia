import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DictionnairePage from '../DictionnairePage'

vi.mock('../../hooks/useDictionary', () => ({
  useDictionary: vi.fn(() => ({
    direction: 'fr_to_oc' as const,
    q: '',
    theme: '',
    categorie: '',
    graphie: '',
    source: '',
    page: 1,
    perPage: 20,
    results: [],
    total: 0,
    totalPages: 1,
    suggestions: [],
    loading: false,
    themesMap: {},
    categories: [],
    filtersDisabled: false,
    perPageOptions: [10, 20, 50, 100],
    handleQ: vi.fn(),
    handleTheme: vi.fn(),
    handleCategorie: vi.fn(),
    handleGraphie: vi.fn(),
    handleSource: vi.fn(),
    handlePerPage: vi.fn(),
    handleDirection: vi.fn(),
    setPage: vi.fn(),
    refresh: vi.fn(),
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

describe('DictionnairePage', () => {
  it('affiche le champ de recherche', () => {
    render(<MemoryRouter><DictionnairePage /></MemoryRouter>)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton d\'import pour un visiteur', () => {
    render(<MemoryRouter><DictionnairePage /></MemoryRouter>)
    expect(screen.queryByText(/importer/i)).toBeNull()
  })
})
