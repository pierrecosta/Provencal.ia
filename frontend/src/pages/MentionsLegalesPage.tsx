export default function MentionsLegalesPage() {
  return (
    <div
      style={{
        maxWidth: 'var(--container-text-max)',
        margin: '0 auto',
      }}
    >
      <h1>Mentions légales</h1>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>Hébergeur</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>Non applicable (hébergement privé).</p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>Éditeur</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Non applicable (projet privé non commercial).
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>SIRET</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>Non applicable (particulier).</p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>Données personnelles</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Aucune collecte de données personnelles identifiables. Pas de cookies tiers. Pas de
          tracking.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>Contact</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Pour toute question :{' '}
          <a
            href="mailto:contact@provencal.ia"
            style={{ color: 'var(--color-primary)' }}
          >
            contact@provencal.ia
          </a>
        </p>
      </section>
    </div>
  )
}
