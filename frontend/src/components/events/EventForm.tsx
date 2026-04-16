import { useState } from 'react'
import type { EventBody } from '../../services/types'
import iconValider from '../../assets/icons/icon-valider.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'

interface EventFormData {
  titre: string
  date_debut: string
  date_fin: string
  lieu: string
  description: string
  lien_externe: string
}

interface FormErrors {
  titre?: string
  date_debut?: string
  date_fin?: string
}

const EMPTY_FORM: EventFormData = {
  titre: '',
  date_debut: '',
  date_fin: '',
  lieu: '',
  description: '',
  lien_externe: '',
}

function validateForm(form: EventFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  if (!form.date_debut) errors.date_debut = 'Champ obligatoire'
  if (!form.date_fin) errors.date_fin = 'Champ obligatoire'
  else if (form.date_debut && form.date_fin < form.date_debut)
    errors.date_fin = 'Doit être ≥ date de début'
  return errors
}

const ACTION_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'white', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer',
  minWidth: 36, minHeight: 36,
}

interface Props {
  title: string
  initialValues?: Partial<EventFormData>
  onSubmit: (body: EventBody) => Promise<void>
  onCancel: () => void
}

export default function EventForm({ title, initialValues, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<EventFormData>({
    ...EMPTY_FORM,
    ...initialValues,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      const body: EventBody = {
        titre: form.titre.trim(),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        lieu: form.lieu.trim() || null,
        description: form.description.trim() || null,
        lien_externe: form.lien_externe.trim() || null,
      }
      await onSubmit(body)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = (error?: string): React.CSSProperties => ({
    display: 'block', width: '100%', padding: '6px 10px',
    border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)',
    fontFamily: 'inherit', boxSizing: 'border-box',
  })

  function renderField(
    label: string,
    name: keyof EventFormData,
    type: 'text' | 'date' | 'url' | 'textarea' = 'text',
  ) {
    const error = name in errors ? (errors as Record<string, string>)[name] : undefined
    return (
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            style={{ ...inputStyle(error), resize: 'vertical', minHeight: 60 }}
            value={form[name] ?? ''}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            rows={3}
          />
        ) : (
          <input
            type={type}
            style={inputStyle(error)}
            value={form[name] ?? ''}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          />
        )}
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-md)' }}>{title}</h2>
      {renderField('Titre *', 'titre')}
      {renderField('Date de début *', 'date_debut', 'date')}
      {renderField('Date de fin *', 'date_fin', 'date')}
      {renderField('Lieu', 'lieu')}
      {renderField('Description', 'description', 'textarea')}
      {renderField('Lien externe', 'lien_externe', 'url')}
      <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
        <button style={ACTION_BTN} onClick={() => void handleSubmit()} disabled={submitting} title="Valider">
          <img src={iconValider} alt="Valider" width={18} height={18} />
        </button>
        <button style={ACTION_BTN} onClick={onCancel} title="Annuler">
          <img src={iconAnnuler} alt="Annuler" width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
