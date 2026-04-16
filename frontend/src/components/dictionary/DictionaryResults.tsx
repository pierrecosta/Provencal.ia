import { useState } from 'react'
import type { DictEntry } from '../../services/types'
import iconDeplier from '../../assets/icons/icon-deplier.svg'
import iconReplier from '../../assets/icons/icon-replier.svg'

type Direction = 'fr_to_oc' | 'oc_to_fr'

interface Props {
  results: DictEntry[]
  total: number
  suggestions: string[]
  loading: boolean
  direction: Direction
  q: string
  onSuggestionClick: (s: string) => void
}

export default function DictionaryResults({ results, suggestions, loading, direction, q, onSuggestionClick }: Props) {
  const [openAccordion, setOpenAccordion] = useState<Set<number>>(new Set())

  const toggleAccordion = (id: number) => {
    setOpenAccordion((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
  }

  if (results.length === 0) {
    return (
      <div>
        <p style={{ color: 'var(--color-text-muted)' }}>{q ? 'Pas de mot trouvé.' : 'Aucun résultat.'}</p>
        {suggestions.length > 0 && (
          <p>
            Mots proches :{' '}
            {suggestions.map((s, i) => (
              <span key={i}>
                <button
                  onClick={() => onSuggestionClick(s)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}
                >{s}</button>
                {i < suggestions.length - 1 && ' '}
              </span>
            ))}
          </p>
        )}
      </div>
    )
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
          <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Mot français' : 'Mot provençal'}</th>
          <th style={{ padding: '8px 12px', fontWeight: 700 }}>{direction === 'fr_to_oc' ? 'Traduction provençale' : 'Traduction française'}</th>
        </tr>
      </thead>
      <tbody>
        {results.map((entry) => {
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
                        {entry.translations.slice(1).map((tr) => (
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
  )
}
