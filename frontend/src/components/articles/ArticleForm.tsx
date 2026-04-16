import { useRef, useState } from 'react'
import { uploadImageFile } from '../../services/uploadService'
import { compressImage } from '../../utils/imageCompression'
import type { ArticleBody } from '../../services/types'
import iconValider from '../../assets/icons/icon-valider.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'

const CATEGORIES = [
  'Langue & Culture', 'Littérature', 'Poésie', 'Histoire & Mémoire',
  'Traditions & Fêtes', 'Musique', 'Danse', 'Gastronomie', 'Artisanat',
  'Patrimoine bâti', 'Environnement', 'Personnalités', 'Associations',
  'Enseignement', 'Économie locale', 'Numismatique & Archives',
  'Immigration & Diaspora', 'Jeunesse', 'Régionalisme & Politique linguistique',
  'Divers',
]

interface ArticleFormData {
  titre: string
  description: string
  image_file: File | null
  image_url: string
  source_url: string
  date_publication: string
  auteur: string
  categorie: string
}

interface FormErrors {
  titre?: string
  date_publication?: string
}

const ACTION_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'white', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', padding: '4px', cursor: 'pointer',
  minWidth: 36, minHeight: 36,
}

const INPUT_STYLE: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)', fontFamily: 'inherit', boxSizing: 'border-box',
}

function validateForm(form: ArticleFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  if (!form.date_publication) errors.date_publication = 'Champ obligatoire'
  return errors
}

interface Props {
  title: string
  initialValues?: Partial<Omit<ArticleFormData, 'image_file'>>
  onSubmit: (body: ArticleBody) => Promise<void>
  onCancel: () => void
  onSnackbar?: (msg: string, type: 'success' | 'error') => void
}

export default function ArticleForm({ title, initialValues, onSubmit, onCancel, onSnackbar }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ArticleFormData>({
    titre: initialValues?.titre ?? '',
    description: initialValues?.description ?? '',
    image_file: null,
    image_url: initialValues?.image_url ?? '',
    source_url: initialValues?.source_url ?? '',
    date_publication: initialValues?.date_publication ?? new Date().toISOString().slice(0, 10),
    auteur: initialValues?.auteur ?? '',
    categorie: initialValues?.categorie ?? '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function uploadImage(file: File): Promise<string | null> {
    const compressed = await compressImage(file, 2)
    try {
      return await uploadImageFile(compressed)
    } catch {
      onSnackbar?.("Erreur lors de l'upload de l'image", 'error')
      return null
    }
  }

  async function handleSubmit() {
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      let image_ref: string | null = null
      if (form.image_file) {
        image_ref = await uploadImage(form.image_file)
        if (image_ref === null) return
      } else if (form.image_url.trim()) {
        image_ref = form.image_url.trim()
      }
      const body: ArticleBody = {
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        image_ref,
        source_url: form.source_url.trim() || null,
        date_publication: form.date_publication,
        auteur: form.auteur.trim() || null,
        categorie: form.categorie || null,
      }
      await onSubmit(body)
    } finally {
      setSubmitting(false)
    }
  }

  const errBorder = (f?: string) => f ? 'var(--color-error)' : 'var(--color-border)'

  return (
    <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-md)' }}>{title}</h2>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Titre *</label>
        <input type="text" style={{ ...INPUT_STYLE, borderColor: errBorder(errors.titre) }} value={form.titre}
          onChange={(e) => setForm({ ...form, titre: e.target.value })} />
        {errors.titre && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.titre}</span>}
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description / chapeau</label>
        <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 60 } as React.CSSProperties} rows={2}
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — fichier (prioritaire, ≤ 2 Mo)</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ fontSize: 'var(--text-sm)' }}
          onChange={(e) => setForm({ ...form, image_file: e.target.files?.[0] ?? null })} />
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — URL</label>
        <input type="url" style={{ ...INPUT_STYLE, opacity: form.image_file ? 0.45 : 1 }}
          value={form.image_url} disabled={!!form.image_file}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Date de publication *</label>
        <input type="date" style={{ ...INPUT_STYLE, borderColor: errBorder(errors.date_publication) }}
          value={form.date_publication} onChange={(e) => setForm({ ...form, date_publication: e.target.value })} />
        {errors.date_publication && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.date_publication}</span>}
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Auteur</label>
        <input type="text" style={INPUT_STYLE} value={form.auteur}
          onChange={(e) => setForm({ ...form, auteur: e.target.value })} />
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Catégorie</label>
        <select style={INPUT_STYLE} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
          <option value="">— Aucune —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>URL source</label>
        <input type="url" style={INPUT_STYLE} value={form.source_url}
          onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
      </div>

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
