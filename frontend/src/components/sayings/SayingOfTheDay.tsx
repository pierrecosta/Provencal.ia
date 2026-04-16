import type { Saying } from '../../services/types'

interface Props {
  saying: Saying | null
  loading: boolean
  error: boolean
}

export default function SayingOfTheDay({ saying, loading, error }: Props) {
  return (
    <section className="today-card" aria-label="Terme du jour">
      {loading && (
        <div className="today-card__loading">
          <span className="spinner" aria-label="Chargement" />
        </div>
      )}
      {error && !loading && (
        <p className="today-card__empty">Aucun terme du jour disponible.</p>
      )}
      {saying && !loading && (
        <>
          <p className="today-card__terme">{saying.terme_provencal}</p>
          {saying.type && (
            <span className="today-card__badge">{saying.type}</span>
          )}
          <p className="today-card__localite">{saying.localite_origine}</p>
          <p className="today-card__traduction">{saying.traduction_sens_fr}</p>
        </>
      )}
    </section>
  )
}
