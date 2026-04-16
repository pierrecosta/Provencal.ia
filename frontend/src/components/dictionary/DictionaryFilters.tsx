import type { ThemeCategories } from '../../services/types'

const SOURCES = ['TradEG', 'TradD', 'TradA', 'TradH', 'TradAv', 'TradP', 'TradX']

interface Props {
  theme: string
  categorie: string
  graphie: string
  source: string
  themesMap: ThemeCategories
  categories: string[]
  filtersDisabled: boolean
  onHandleTheme: (v: string) => void
  onHandleCategorie: (v: string) => void
  onHandleGraphie: (v: string) => void
  onHandleSource: (v: string) => void
}

export default function DictionaryFilters({
  theme, categorie, graphie, source,
  themesMap, categories, filtersDisabled,
  onHandleTheme, onHandleCategorie, onHandleGraphie, onHandleSource,
}: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
      <select
        value={theme}
        onChange={(e) => onHandleTheme(e.target.value)}
        disabled={filtersDisabled}
        style={{ opacity: filtersDisabled ? 0.4 : 1, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
      >
        <option value="">Tous les thèmes</option>
        {Object.keys(themesMap).sort().map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        value={categorie}
        onChange={(e) => onHandleCategorie(e.target.value)}
        disabled={filtersDisabled || categories.length === 0}
        style={{ opacity: (filtersDisabled || categories.length === 0) ? 0.4 : 1, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
      >
        <option value="">Toutes les catégories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        value={graphie}
        onChange={(e) => onHandleGraphie(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
      >
        <option value="">Toutes les graphies</option>
        <option value="mistralienne">Mistralienne</option>
        <option value="classique">Classique IEO</option>
        <option value="canonique">Canonique</option>
      </select>
      <select
        value={source}
        onChange={(e) => onHandleSource(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
      >
        <option value="">Toutes les sources</option>
        {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
}
