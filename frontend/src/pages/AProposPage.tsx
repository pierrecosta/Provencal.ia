export default function AProposPage() {
  return (
    <div
      style={{
        maxWidth: 'var(--container-text-max)',
        margin: '0 auto',
      }}
    >
      <h1>À propos</h1>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>La démarche</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Provencal.ia est un portail culturel dédié à la langue et à la culture provençales. Il
          propose un dictionnaire bilingue français–provençal (graphie mistralienne), un traducteur
          lexical mot-à-mot, un agenda des événements culturels régionaux, une bibliothèque
          d'histoires et de légendes, ainsi qu'un espace d'actualités sur la vie de la langue d'oc
          en Provence.
        </p>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Ce projet s'inscrit dans une démarche de valorisation et de transmission du patrimoine
          linguistique provençal, en utilisant des sources lexicographiques historiques du XIXème
          siècle numérisées et enrichies par une communauté de contributeurs bénévoles.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>Les contributeurs</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Le contenu est maintenu par un collectif de passionnés de langue provençale. Les
          contributeurs inscrits peuvent proposer des ajouts, corrections et enrichissements via
          l'interface dédiée.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>Les sources lexicographiques</h2>
        <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-3)' }}>
          <li>
            <strong>E. Garcin</strong> (1823) — Dictionnaire provençal-français, Grasse/Var
          </li>
          <li>
            <strong>Autran</strong> — Vocabulaire provençal, Alpes-Maritimes
          </li>
          <li>
            <strong>Achard</strong> (1785) — Dictionnaire de la Provence et du Comté-Venaissin,
            Alpes-Maritimes
          </li>
          <li>
            <strong>Honnorat</strong> (1846) — Dictionnaire provençal-français, Var
          </li>
          <li>
            <strong>Avril</strong> (1834) — Dictionnaire provençal-français, Marseille
          </li>
          <li>
            <strong>Pellas</strong> (1723) — Dictionnaire provençal-français, Marseille
          </li>
          <li>
            <strong>Xavier de Fourvières</strong> (1901) — Lou Pichot Tresor, Vallée du Rhône
          </li>
        </ul>
      </section>
    </div>
  )
}
