import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ConnexionPage from '../ConnexionPage'

const mockLogin = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    login: mockLogin,
    logout: vi.fn(),
    pseudo: null,
    token: null,
  })),
}))

describe('ConnexionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le formulaire avec les champs login et mot de passe', () => {
    render(<MemoryRouter><ConnexionPage /></MemoryRouter>)
    expect(screen.getByLabelText('Login')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('appelle login lors de la soumission du formulaire', async () => {
    mockLogin.mockResolvedValue(undefined)
    render(<MemoryRouter><ConnexionPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'secret123')
    })
  })

  it('affiche un message d\'erreur en cas d\'échec (401)', async () => {
    mockLogin.mockRejectedValue(new Error('401'))
    render(<MemoryRouter><ConnexionPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'mauvais' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Identifiant ou mot de passe incorrect')
    })
  })
})
