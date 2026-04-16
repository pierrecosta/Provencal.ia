import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../hooks/useLibrary'
import { fetchLibraryPeriodes } from '../services/libraryService'
import LibraryList from '../components/library/LibraryList'
import LibraryForm from '../components/library/LibraryForm'
import Snackbar from '../components/ui/Snackbar'
import iconAjouter from '../assets/icons/icon-ajouter.svg'

type FilterType = '' | 'Histoire' | 'Légende'

interface SnackbarState {
  message: string
  type: 'success' | 'error'
}

export default function BibliothequePage() {
  const { isAuthenticated } = useAuth()
  const {
    entries, loading, allLoaded, sentinelRef,
    filterType, filterPeriode, filterLieu,
    setFilterType, setFilterPeriode, setFilterLieu,
    createEntry, updateEntry, deleteEntry, rollbackEntry,
    replaceEntry, removeEntry,
    resetAndLoad,
  } = useLibrary()

  const [periodes, setPeriodes] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  useEffect(() => {
    fetchLibraryPeriodes()
      .then((data) => setPeriodes(data))
      .catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0 }}>Culture</h1>
        {isAuthenticated && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
          >
            <img src={iconAjouter} alt="" width={16} height={16} style={{ filter: 'brightness(0) invert(1)' }} />
            Ajouter une entrée
          </button>
        )}
      </div>

      {showCreateForm && (
        <LibraryForm
          title="Nouvelle entrée"
          onSubmit={async (body) => {
            await createEntry(body)
            setShowCreateForm(false)
            setSnackbar({ message: 'Entrée créée avec succès', type: 'success' })
            resetAndLoad()
          }}
          onCancel={() => setShowCreateForm(false)}
          onSnackbar={(msg, type) => setSnackbar({ message: msg, type })}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
        {(['', 'Histoire', 'Légende'] as FilterType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{ padding: '6px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: filterType === t ? 'var(--color-primary)' : 'none', color: filterType === t ? '#fff' : 'var(--color-text)', cursor: 'pointer', fontWeight: filterType === t ? 700 : 400 }}
          >
            {t || 'Tout'}
          </button>
        ))}
        <select
          value={filterPeriode}
          onChange={(e) => setFilterPeriode(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        >
          <option value="">Toutes les périodes</option>
          {periodes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="text"
          placeholder="Filtrer par lieu..."
          value={filterLieu}
          onChange={(e) => setFilterLieu(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        />
      </div>

      <LibraryList
        entries={entries}
        loading={loading}
        allLoaded={allLoaded}
        isAuthenticated={isAuthenticated}
        sentinelRef={sentinelRef}
        onDoUpdate={updateEntry}
        onDoDelete={deleteEntry}
        onDoRollback={rollbackEntry}
        onReplaceEntry={replaceEntry}
        onRemoveEntry={removeEntry}
        onResetAndLoad={resetAndLoad}
      />

      {snackbar && (
        <Snackbar message={snackbar.message} type={snackbar.type} onClose={() => setSnackbar(null)} />
      )}
    </div>
  )
}
