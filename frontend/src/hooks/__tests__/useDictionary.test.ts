import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDictionary } from '../useDictionary'
import * as dictionaryService from '../../services/dictionaryService'
import type { DictPage } from '../../services/types'

vi.mock('../../services/dictionaryService', () => ({
  fetchThemes: vi.fn(),
  searchDictionary: vi.fn(),
  searchProvencal: vi.fn(),
  importDictionary: vi.fn(),
}))

const emptyPage: DictPage = { items: [], total: 0, page: 1, per_page: 20, pages: 1, suggestions: [] }

describe('useDictionary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(dictionaryService.fetchThemes).mockResolvedValue({})
    vi.mocked(dictionaryService.searchDictionary).mockResolvedValue(emptyPage)
    vi.mocked(dictionaryService.searchProvencal).mockResolvedValue(emptyPage)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('effectue une recherche au montage et retourne les résultats', async () => {
    const page: DictPage = {
      items: [
        {
          id: 1,
          mot_fr: 'maison',
          mot_provencal: 'oustau',
          graphie: 'mistralienne',
          theme: 'Bâtiment',
          categorie: 'Habitat',
          source: null,
          nature: null,
          localite: null,
          contexte: null,
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
      pages: 1,
      suggestions: [],
    }
    vi.mocked(dictionaryService.searchDictionary).mockResolvedValue(page)

    const { result } = renderHook(() => useDictionary())

    // advanceTimersByTimeAsync avance les timers ET flush les microtasks/promesses
    await act(() => vi.advanceTimersByTimeAsync(300))

    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].mot_fr).toBe('maison')
  })

  it('appelle searchDictionary même avec une query vide (fetch initial)', async () => {
    const { result } = renderHook(() => useDictionary())

    await act(() => vi.advanceTimersByTimeAsync(300))

    expect(dictionaryService.searchDictionary).toHaveBeenCalled()
    expect(result.current.results).toEqual([])
  })
})
