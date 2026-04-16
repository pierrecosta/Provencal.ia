import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDictionary } from '../hooks/useDictionary'
import { importDictionary } from '../services/dictionaryService'
import type { DictEntryDetail } from '../services/types'
import DictionarySearch from '../components/dictionary/DictionarySearch'
import DictionaryFilters from '../components/dictionary/DictionaryFilters'
import DictionaryResults from '../components/dictionary/DictionaryResults'
import Snackbar from '../components/ui/Snackbar'
import iconUpload from '../assets/icons/icon-upload-image.svg'
import iconPrecedent from '../assets/icons/icon-precedent.svg'
import iconSuivant from '../assets/icons/icon-suivant.svg'

const PER_PAGE_OPTIONS = [10, 20, 50, 100]

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

export default function DictionnairePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const { isAuthenticated } = useAuth()
  const {
    direction, q, theme, categorie, graphie, source, page, perPage,
    results, total, totalPages, suggestions, loading,
    themesMap, categories, filtersDisabled,
    handleQ, handleTheme, handleCategorie, handleGraphie, handleSource,
    handlePerPage, handleDirection, setPage, refresh,
  } = useDictionary()

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  async function launchImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const data = await importDictionary(importFile)
      setSnackbar({ message: `${data.imported} entrée${data.imported > 1 ? 's' : ''} importée${data.imported > 1 ? 's' : ''}`, type: 'success' })
      setImportFile(null)
      if (importFileRef.current) importFileRef.current.value = ''
      refresh()
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
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
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
                  {importing ? "Import en cours…" : "Lancer l'import"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <DictionarySearch
        direction={direction}
        q={q}
        onHandleQ={handleQ}
        onHandleDirection={handleDirection}
      />

      <DictionaryFilters
        theme={theme}
        categorie={categorie}
        graphie={graphie}
        source={source}
        themesMap={themesMap}
        categories={categories}
        filtersDisabled={filtersDisabled}
        onHandleTheme={handleTheme}
        onHandleCategorie={handleCategorie}
        onHandleGraphie={handleGraphie}
        onHandleSource={handleSource}
      />

      <DictionaryResults
        results={results}
        total={total}
        suggestions={suggestions}
        loading={loading}
        direction={direction}
        q={q}
        isAuthenticated={isAuthenticated}
        onSuggestionClick={handleQ}
        onEntryUpdated={(entry: DictEntryDetail) => {
          refresh()
          void entry
        }}
        onEntryDeleted={() => {
          refresh()
        }}
      />

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
          >
            <img src={iconPrecedent} alt="Précédent" width={16} height={16} />
          </button>
          <span style={{ fontSize: 'var(--text-sm)' }}>Page {page} / {totalPages} ({total} résultats)</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            <img src={iconSuivant} alt="Suivant" width={16} height={16} />
          </button>
          <select
            value={perPage}
            onChange={(e) => handlePerPage(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginLeft: 'auto' }}
          >
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      )}

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
