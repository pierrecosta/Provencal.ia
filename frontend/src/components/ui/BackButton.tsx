import { useNavigate } from 'react-router-dom'
import iconRetour from '../../assets/icons/icon-retour.svg'

export default function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Retour à la page précédente"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        minWidth: '44px',
        minHeight: '44px',
        padding: '0 var(--space-1)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        marginBottom: 'var(--space-2)',
      }}
    >
      <img src={iconRetour} alt="" aria-hidden="true" width={20} height={20} />
      Retour
    </button>
  )
}
