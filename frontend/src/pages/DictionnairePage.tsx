import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchThemes, searchDictionary, searchProvencal, importDictionary } from '../services/dictionaryService'
import type { DictEntry, ThemeCategories } from '../services/types'
import Snackbar from '../components/ui/Snackbar'
import iconToggleLangue from '../assets/icons/icon-toggle-langue.svg'
import iconUpload from '../assets/icons/icon-upload-image.svg'
import iconRecherche from '../assets/icons/icon-recherche.svg'
import iconDeplier from '../assets/icons/icon-deplier.svg'
import iconReplier from '../assets/icons/icon-replier.svg'
import iconPrecedent from '../assets/icons/icon-precedent.svg'
import iconSuivant from '../assets/icons/icon-suivant.svg'

type Direction = 'fr_to_oc' | 'oc_to_fr'

const SOURCES = ['TradEG', 'TradD', 'TradA', 'TradH', 'TradAv', 'TradP', 'TradX']
const PER_PAGE_OPTIONS = [10, 20, 50, 100]

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

export default function DictionnairePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const { isAuthenticated } = useAuth()

  const [direction, setDirection] = useState<Direction>('fr_to_oc')
  const [q, setQ] = useState('')
  const [theme, setTheme] = useState('')
  const [categorie, setCategorie] = useState('')
  const [graphie, setGraphie] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const [results, setResults] = useState<DictEntry[]>([])
  const [total, setTotal] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [openAccordion, setOpenAccordion] = useState<Set<number>>(new Set())

  const [themesMap, setThemesMap] = useState<ThemeCategories>({})

  /* ── Import dictionnaire ── */
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
    fetchThemes()
      .then(data => setThemesMap(data))
      .catch(() => {})
  }, [])

  const doSearch = useCallback((opts: {
    dir: Direction, q: string, theme: string, categorie: string,
    graphie: string, source: string, page: number, perPage: number
  }) => {
    setLoading(true)
    setOpenAccordion(new Set())
    const params = {
      q: opts.q || undefined,
      theme: !opts.q && opts.theme ? opts.theme : undefined,
      categorie: !opts.q && opts.categorie ? opts.categorie : undefined,
      graphie: opts.graphie || undefined,
      source: opts.source || undefined,
      page: opts.page,
      per_page: opts.perPage,
    }
    const search = opts.dir === 'oc_to_fr' ? searchProvencal(params) : searchDictionary(params)
    search
      .then(data => {
        setResults(data.items)
        setTotal(data.total)
        setSuggestions(data.suggestions ?? [])
      })
      .catch(() => { setResults([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch({ dir: direction, q, theme, categorie, graphie, source, page, perPage })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [direction, q, theme, categorie, graphie, source, page, perPage, doSearch])

  const handleQ = (v: string) => { setQ(v); setPage(1) }
  const handleTheme = (v: string) => { setTheme(v); setCategorie(''); setPage(1) }
  const handleCategorie = (v: string) => { setCategorie(v); setPage(1) }
  const handleGraphie = (v: string) => { setGraphie(v); setPage(1) }
  const handleSource = (v: string) => { setSource(v); setPage(1) }
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1) }
  const handleDirection = (d: Direction) => { setDirection(d); setQ(''); setTheme(''); setCategorie(''); setGraphie(''); setSource(''); setPage(1) }

  const toggleAccordion = (id: number) => {
    setOpenAccordion(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const filtersDisabled = q.length > 0

  const categories = theme && themesMap[theme] ? themesMap[theme] : []

  async function launchImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importDictionary(importFile)
      setSnackbar({ message: `${data.imported} entrée${data.imported > 1 ? 's' : ''} importée${data.imported > 1 ? 's' : ''}`, type: 'success' })
      setImportFile(null)
      if (importFileRef.current) importFileRef.current.value = ''
      doSearch({ dir: direction, q, theme, categorie, graphie, source, page, perPage })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'import"
      setSnackbar({ message: msg, type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <h1 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>Dictionnaire</h1>
        {isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              <img src={iconUpload} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
              Importer un fichier
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: 'none' }}
                onChange={e => setImportFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {importFile && (
              <>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', opacity: 0.75 }}>{importFile.name}</span>
                <button
                  onClick={() => void launchImport()}
                  disabled={importing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-secondary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: importing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', opacity: importing ? 0.7 : 1 }}
                >
                  {importing ? 'Import en cours…' : 'Lancer l\'import'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sélecteur de direction */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        {(['fr_to_oc', 'oc_to_fr'] as Direction[]).map(d => (
          <button
            key={d}
            onClick={() => handleDirection(d)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-primary)',
              background: direction === d ? 'var(--color-primary)' : 'none',
              color: direction === d ? 'white' : 'var(--color-primary)',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <img src={iconToggleLangue} alt="" width={16} height={16} style={{ filter: direction === d ? 'invert(1)' : undefined }} />
            {d === 'fr_to_oc' ? 'FR → Provençal' : 'Provençal → FR'}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
        <img src={iconRecherche} alt="" width={18} height={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
        <input
          type="search"
          value={q}
          onChange={e => handleQ(e.target.value)}
          placeholder={direction === 'fr_to_oc' ? 'Rechercher un mot en français…' : 'Rechercher un mot provençal…'}
          style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-base)' }}
        />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <select
          value={theme}
          onChange={e => handleTheme(e.target.value)}
          disabled={filtersDisabled}
          style={{ opacity: filtersDisabled ? 0.4 : 1, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        >
          <option value="">Tous les thèmes</option>
          {Object.keys(themesMap).sort().map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={categorie}
          onChange={e => handleCategorie(e.target.value)}
          disabled={filtersDisabled || categories.length === 0}
          style={{ opacity: (filtersDisabled || categories.length === 0) ? 0.4 : 1, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={graphie}
          onChange={e => handleGraphie(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        >
          <option value="">Toutes les graphies</option>
          <option value="mistralienne">Mistralienne</option>
          <option value="classique">Classique IEO</option>
          <option value="canonique">Canonique</option>
        </select>
        <select
          value={source}
          onChange={e => handleSource(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        >
          <option value="">Toutes les sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Résultats */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
      ) : results.length === 0 ? (
        <div>
          <p style={{ color: 'var(--color-text-muted)' }}>{q ? 'Pas de mot trouvé.' : 'Aucun résultat.'}</p>
          {suggestions.length > 0 && (
            <p>
              Mots proches :{' '}
              {suggestions.map((s, i) => (
                <span key={i}>
                  <button
                    onClick={() => handleQ(s)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}
                  >{s}</button>
                  {i < suggestions.length - 1 && ' '}
                </span>
              ))}
            </p>
          )}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Mot français' : 'Mot provençal'}</th>
              <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Traduction provençale' : 'Traduction française'}</th>
            </tr>
          </thead>
          <tbody>
            {results.map(entry => {
              const isOpen = openAccordion.has(entry.id)
              const hasMany = entry.translations.length > 1
              const first = entry.translations[0]
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                  <td style={{ padding: '8px 12px' }}>{direction === 'fr_to_oc' ? entry.mot_fr : (first?.traduction ?? '—')}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {entry.translations.length === 0 ? (
                      <em style={{ color: 'var(--color-text-muted)' }}>Mot non traduit</em>
                    ) : (
                      <div>
                        <span style={{ fontFamily: 'Georgia, serif' }}>
                          {direction === 'fr_to_oc' ? (first?.traduction ?? '—') : entry.mot_fr}
                        </span>
                        {first?.graphie && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 6 }}>({first.graphie})</span>}
                        {first?.source && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>[{first.source}]</span>}
                        {hasMany && (
                          <button
                            onClick={() => toggleAccordion(entry.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 0, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
                            aria-expanded={isOpen}
                          >
                            <img src={isOpen ? iconReplier : iconDeplier} alt={isOpen ? 'Replier' : 'Déplier'} width={14} height={14} />
                          </button>
                        )}
                        {isOpen && (
                          <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
                            {entry.translations.slice(1).map(tr => (
                              <li key={tr.id} style={{ padding: '4px 0', borderTop: '1px dashed var(--color-border)' }}>
                                <span style={{ fontFamily: 'Georgia, serif' }}>{direction === 'fr_to_oc' ? tr.traduction : entry.mot_fr}</span>
                                {tr.graphie && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 6 }}>({tr.graphie})</span>}
                                {tr.source && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>[{tr.source}]</span>}
                                {tr.region && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>{tr.region}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
          >
            <img src={iconPrecedent} alt="Précédent" width={16} height={16} />
          </button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {totalPages} ({total} résultats)</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            <img src={iconSuivant} alt="Suivant" width={16} height={16} />
          </button>
          <select
            value={perPage}
            onChange={e => handlePerPage(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginLeft: 'auto' }}
          >
            {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      )}
      {/* Snackbar */}
      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
