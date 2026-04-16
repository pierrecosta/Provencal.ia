import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AgendaPage from '../AgendaPage'
import type { AgendaEvent } from '../../services/types'

vi.mock('../../hooks/useEvents', () => ({
  useEvents: vi.fn(() => ({
    events: [
      {
        id: 1,
        titre: 'Fête de la Saint-Estève',
        description: 'Fête traditionnelle provençale.',
        lieu: 'Aix-en-Provence',
        date_debut: '2026-05-30',
        date_fin: null,
        lien_externe: null,
        image_ref: null,
        is_locked: false,
        locked_by: null,
      } as AgendaEvent,
    ],
    total: 1,
    page: 1,
    pages: 1,
    loading: false,
    lieu: '',
    annee: '',
    mois: '',
    setLieu: vi.fn(),
    setAnnee: vi.fn(),
    setMois: vi.fn(),
    loadEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    rollbackEvent: vi.fn(),
    replaceEvent: vi.fn(),
    removeEvent: vi.fn(),
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

describe('AgendaPage', () => {
  it('affiche la liste des événements', () => {
    render(<MemoryRouter><AgendaPage /></MemoryRouter>)
    expect(screen.getByText('Fête de la Saint-Estève')).toBeInTheDocument()
  })

  it('affiche le bouton de basculement vers les archives', () => {
    render(<MemoryRouter><AgendaPage /></MemoryRouter>)
    expect(screen.getByText('Archives')).toBeInTheDocument()
  })

  it('affiche le titre "Archives Agenda" en mode archive', () => {
    render(
      <MemoryRouter initialEntries={['/?archive=true']}>
        <AgendaPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Archives Agenda')).toBeInTheDocument()
  })
})
