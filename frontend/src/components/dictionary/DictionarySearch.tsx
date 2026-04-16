import iconToggleLangue from '../../assets/icons/icon-toggle-langue.svg'
import iconRecherche from '../../assets/icons/icon-recherche.svg'

type Direction = 'fr_to_oc' | 'oc_to_fr'

interface Props {
  direction: Direction
  q: string
  onHandleQ: (v: string) => void
  onHandleDirection: (d: Direction) => void
}

export default function DictionarySearch({ direction, q, onHandleQ, onHandleDirection }: Props) {
  return (
    <>
      {/* Sélecteur de direction */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        {(['fr_to_oc', 'oc_to_fr'] as Direction[]).map((d) => (
          <button
            key={d}
            onClick={() => onHandleDirection(d)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-primary)',
              background: direction === d ? 'var(--color-primary)' : 'none',
              color: direction === d ? 'white' : 'var(--color-primary)',
              fontWeight: 600, cursor: 'pointer',
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
          onChange={(e) => onHandleQ(e.target.value)}
          placeholder={direction === 'fr_to_oc' ? 'Rechercher un mot en français…' : 'Rechercher un mot provençal…'}
          style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-base)' }}
        />
      </div>
    </>
  )
}
