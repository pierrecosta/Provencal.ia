import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../AuthContext'
import * as authService from '../../services/authService'
import * as api from '../../services/api'

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  configureApi: vi.fn(),
  apiFetch: vi.fn(),
}))

function TestConsumer() {
  const { isAuthenticated, pseudo, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authentifié' : 'visiteur'}</span>
      <span data-testid="pseudo">{pseudo ?? 'aucun'}</span>
      <button onClick={() => login('admin', 'secret')}>Se connecter</button>
      <button onClick={() => logout()}>Se déconnecter</button>
    </div>
  )
}

function renderWithAuth() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('état initial : non authentifié', () => {
    renderWithAuth()
    expect(screen.getByTestId('auth-status')).toHaveTextContent('visiteur')
    expect(screen.getByTestId('pseudo')).toHaveTextContent('aucun')
  })

  it('login réussi → token stocké, utilisateur authentifié', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      access_token: 'tok.123.abc',
      token_type: 'bearer',
    })
    renderWithAuth()

    await act(async () => {
      fireEvent.click(screen.getByText('Se connecter'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authentifié')
    })
    expect(screen.getByTestId('pseudo')).toHaveTextContent('admin')
  })

  it('logout → état remis à visiteur', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      access_token: 'tok.123.abc',
      token_type: 'bearer',
    })
    vi.mocked(authService.logout).mockResolvedValue(undefined)
    renderWithAuth()

    await act(async () => {
      fireEvent.click(screen.getByText('Se connecter'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authentifié'),
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Se déconnecter'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('auth-status')).toHaveTextContent('visiteur'),
    )
  })

  it('401 → l\'handler onUnauthorized enregistré vide l\'état auth', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      access_token: 'tok.abc',
      token_type: 'bearer',
    })
    renderWithAuth()

    await act(async () => {
      fireEvent.click(screen.getByText('Se connecter'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authentifié'),
    )

    // Récupère le callback onUnauthorized passé à configureApi
    const calls = vi.mocked(api.configureApi).mock.calls
    const onUnauthorized = calls[calls.length - 1][1]
    act(() => {
      onUnauthorized()
    })

    await waitFor(() =>
      expect(screen.getByTestId('auth-status')).toHaveTextContent('visiteur'),
    )
  })
})
