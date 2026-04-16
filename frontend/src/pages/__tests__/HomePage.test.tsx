import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../HomePage'
import type { Saying } from '../../services/types'

vi.mock('../../hooks/useSayings', () => ({
  useSayings: vi.fn(() => ({
    todaySaying: {
      id: 1,
      terme_provencal: 'Bonjorn',
      traduction_sens_fr: 'Bonjour',
      localite_origine: 'Marseille',
      type: 'dicton',
      contexte: null,
      source: null,
      is_locked: false,
      locked_by: null,
    } as Saying,
    todayLoading: false,
    todayError: false,
    sayings: [
      {
        id: 2,
        terme_provencal: 'Bèl vespre',
        traduction_sens_fr: 'Bonsoir',
        localite_origine: 'Arles',
        type: 'expression',
        contexte: null,
        source: null,
        is_locked: false,
        locked_by: null,
      } as Saying,
    ],
    hasMore: false,
    listLoading: false,
    sentinelRef: { current: null },
    filterType: null,
    filterLocalite: '',
    setFilterType: vi.fn(),
    setFilterLocalite: vi.fn(),
    createSaying: vi.fn(),
    updateSaying: vi.fn(),
    deleteSaying: vi.fn(),
    addSaying: vi.fn(),
    replaceSaying: vi.fn(),
    removeSaying: vi.fn(),
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

describe('HomePage', () => {
  it('se monte sans erreur', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
  })

  it('affiche la section terme du jour', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Terme du jour' })).toBeInTheDocument()
  })

  it('affiche le terme provençal du jour', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText('Bonjorn')).toBeInTheDocument()
  })
})
