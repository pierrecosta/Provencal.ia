const CATEGORIES = [
  'Langue & Culture', 'Littérature', 'Poésie', 'Histoire & Mémoire',
  'Traditions & Fêtes', 'Musique', 'Danse', 'Gastronomie', 'Artisanat',
  'Patrimoine bâti', 'Environnement', 'Personnalités', 'Associations',
  'Enseignement', 'Économie locale', 'Numismatique & Archives',
  'Immigration & Diaspora', 'Jeunesse', 'Régionalisme & Politique linguistique',
  'Divers',
]

interface Props {
  categorie: string
  annee: string
  mois: string
  onSetCategorie: (v: string) => void
  onSetAnnee: (v: string) => void
  onSetMois: (v: string) => void
}

export default function ArticleFilters({ categorie, annee, mois, onSetCategorie, onSetAnnee, onSetMois }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
      <select
        value={categorie}
        onChange={(e) => onSetCategorie(e.target.value)}
        style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
      >
        <option value="">Toutes les catégories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        placeholder="Année"
        value={annee}
        onChange={(e) => onSetAnnee(e.target.value)}
        style={{ width: 90, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}
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
