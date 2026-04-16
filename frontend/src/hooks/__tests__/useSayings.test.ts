import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSayings } from '../useSayings'
import * as sayingsService from '../../services/sayingsService'
import type { Saying } from '../../services/types'

vi.mock('../../services/sayingsService', () => ({
  fetchTodaySaying: vi.fn(),
  fetchSayings: vi.fn(),
  createSaying: vi.fn(),
  updateSaying: vi.fn(),
  deleteSaying: vi.fn(),
}))

const emptyPage = { items: [], total: 0, page: 1, per_page: 20, pages: 1 }

const mockSaying: Saying = {
  id: 1,
  terme_provencal: 'Bonjorn',
  traduction_sens_fr: 'Bonjour',
  localite_origine: 'Marseille',
  type: 'dicton',
  contexte: null,
  source: null,
  is_locked: false,
  locked_by: null,
}

describe('useSayings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sayingsService.fetchSayings).mockResolvedValue(emptyPage)
  })

  it('charge le terme du jour au montage', async () => {
    vi.mocked(sayingsService.fetchTodaySaying).mockResolvedValue(mockSaying)

    const { result } = renderHook(() => useSayings())

    // Pendant le chargement, todayLoading est true
    expect(result.current.todayLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.todayLoading).toBe(false)
    })
    expect(result.current.todaySaying).toEqual(mockSaying)
  })

  it('état loading reste true pendant la résolution de la promesse', async () => {
    let resolve!: (v: Saying) => void
    const pending = new Promise<Saying>((r) => { resolve = r })
    vi.mocked(sayingsService.fetchTodaySaying).mockReturnValue(pending)

    const { result } = renderHook(() => useSayings())

    expect(result.current.todayLoading).toBe(true)

    resolve(mockSaying)
    await waitFor(() => expect(result.current.todayLoading).toBe(false))
    expect(result.current.todaySaying).toEqual(mockSaying)
  })
})
