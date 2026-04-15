import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout } from '../authService'
import { ApiError } from '../types'

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../api'
const mockApiFetch = vi.mocked(apiFetch)

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('test_login_sends_credentials', () => {
    it('envoie les identifiants en JSON et retourne le token', async () => {
      const mockToken = { access_token: 'jwt-token-xyz' }
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockToken),
      } as Response)

      const result = await login('admin', 'secret')

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pseudo: 'admin', password: 'secret' }),
      })
      expect(result.access_token).toBe('jwt-token-xyz')
    })

    it('lève une ApiError si les identifiants sont incorrects', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      await expect(login('user', 'wrong')).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('test_logout_calls_endpoint', () => {
    it('appelle POST /api/v1/auth/logout', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
      } as Response)

      await logout()

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/auth/logout', {
        method: 'POST',
      })
    })
  })
})
