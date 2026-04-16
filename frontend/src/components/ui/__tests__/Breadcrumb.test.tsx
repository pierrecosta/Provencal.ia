import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from '../Breadcrumb'

const items = [
  { label: 'Accueil', path: '/' },
  { label: 'Langue', path: '/dictionnaire' },
  { label: 'Dictionnaire' },
]

describe('Breadcrumb', () => {
  it('affiche tous les éléments du fil d\'ariane', () => {
    render(<MemoryRouter><Breadcrumb items={items} /></MemoryRouter>)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Langue')).toBeInTheDocument()
    expect(screen.getByText('Dictionnaire')).toBeInTheDocument()
  })

  it('le dernier élément n\'est pas un lien', () => {
    render(<MemoryRouter><Breadcrumb items={items} /></MemoryRouter>)
    const last = screen.getByText('Dictionnaire')
    expect(last.tagName).toBe('SPAN')
    expect(last.closest('a')).toBeNull()
  })

  it('a le rôle de navigation accessible', () => {
    render(<MemoryRouter><Breadcrumb items={items} /></MemoryRouter>)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
