import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTodaySaying, fetchSayings, createSaying } from '../sayingsService'
import { ApiError } from '../types'

vi.mock('../api', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../api'
const mockApiFetch = vi.mocked(apiFetch)

describe('sayingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('test_fetchTodaySaying_calls_correct_url', () => {
    it('appelle le bon endpoint et retourne les données', async () => {
      const mockSaying = {
        id: 1,
        terme_provencal: 'Lou souleio',
        localite_origine: 'Marseille',
        traduction_sens_fr: 'Le soleil',
        type: null,
        contexte: null,
        source: null,
        is_locked: false,
        locked_by: null,
      }
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSaying),
      } as Response)

      const result = await fetchTodaySaying()

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/sayings/today')
      expect(result).toEqual(mockSaying)
    })
  })

  describe('test_fetchSayings_passes_params', () => {
    it('passe les query params correctement', async () => {
      const mockPage = { items: [], total: 0, page: 2, per_page: 20, pages: 0 }
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage),
      } as Response)

      await fetchSayings({ page: 2, per_page: 20, type: 'Dicton', localite: 'Marseille' })

      const calledUrl = mockApiFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('per_page=20')
      expect(calledUrl).toContain('type=Dicton')
      expect(calledUrl).toContain('localite=Marseille')
      expect(calledUrl).toMatch(/^\/api\/v1\/sayings\?/)
    })
  })

  describe('test_createSaying_sends_body', () => {
    it('envoie le bon body en POST', async () => {
      const mockCreated = {
        id: 42,
        terme_provencal: 'test',
        localite_origine: 'Arles',
        traduction_sens_fr: 'test fr',
        type: null,
        contexte: null,
        source: null,
        is_locked: false,
        locked_by: null,
      }
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreated),
      } as Response)

      const body = {
        terme_provencal: 'test',
        localite_origine: 'Arles',
        traduction_sens_fr: 'test fr',
        type: null,
        contexte: null,
        source: null,
      }
      const result = await createSaying(body)

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/sayings', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      expect(result.id).toBe(42)
    })
  })

  describe('test_error_handling', () => {
    it('lève une ApiError lors d\'une réponse non-ok', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      await expect(fetchTodaySaying()).rejects.toBeInstanceOf(ApiError)
    })

    it('inclut le status HTTP dans l\'erreur', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      try {
        await fetchTodaySaying()
        expect.fail('Devrait lever une erreur')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).status).toBe(404)
      }
    })
  })
})
