interface Props {
  lieu: string
  annee: string
  mois: string
  onSetLieu: (v: string) => void
  onSetAnnee: (v: string) => void
  onSetMois: (v: string) => void
}

export default function EventFilters({ lieu, annee, mois, onSetLieu, onSetAnnee, onSetMois }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
      <input
        type="text"
        placeholder="Filtrer par lieu..."
        value={lieu}
        onChange={(e) => onSetLieu(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
      />
      <input
        type="number"
        placeholder="Année"
        value={annee}
        onChange={(e) => onSetAnnee(e.target.value)}
        style={{ width: 90, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
        min={2000}
        max={2100}
      />
      <select
        value={mois}
        onChange={(e) => onSetMois(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
      >
        <option value="">Tous les mois</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
          </option>
        ))}
      </select>
    </div>
  )
}
