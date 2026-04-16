import { useEffect, useRef, useState } from 'react'
import { fetchLibraryEntries, fetchLibraryPeriodes } from '../../services/libraryService'
import { uploadImageFile } from '../../services/uploadService'
import { compressImage } from '../../utils/imageCompression'
import type { LibraryBody, LibraryEntry } from '../../services/types'
import MarkdownEditor from '../ui/MarkdownEditor'
import iconValider from '../../assets/icons/icon-valider.svg'
import iconAnnuler from '../../assets/icons/icon-annuler.svg'

interface LibraryFormData {
  titre: string
  typologie: string
  periode: string
  description_courte: string
  description_longue: string
  image_file: File | null
  image_url: string
  source_url: string
  lang: string
  traduction_id: string
}

interface FormErrors {
  titre?: string
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

function validateForm(form: LibraryFormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titre.trim()) errors.titre = 'Champ obligatoire'
  else if (form.titre.length > 200) errors.titre = '200 caractères max'
  return errors
}

interface Props {
  title: string
  initialValues?: Partial<Omit<LibraryFormData, 'image_file'>>
  onSubmit: (body: LibraryBody) => Promise<void>
  onCancel: () => void
  onSnackbar?: (msg: string, type: 'success' | 'error') => void
}

export default function LibraryForm({ title, initialValues, onSubmit, onCancel, onSnackbar }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<LibraryFormData>({
    titre: initialValues?.titre ?? '',
    typologie: initialValues?.typologie ?? '',
    periode: initialValues?.periode ?? '',
    description_courte: initialValues?.description_courte ?? '',
    description_longue: initialValues?.description_longue ?? '',
    image_file: null,
    image_url: initialValues?.image_url ?? '',
    source_url: initialValues?.source_url ?? '',
    lang: initialValues?.lang ?? 'fr',
    traduction_id: initialValues?.traduction_id ?? '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [periodes, setPeriodes] = useState<string[]>([])
  const [allEntries, setAllEntries] = useState<LibraryEntry[]>([])

  useEffect(() => {
    fetchLibraryPeriodes().then((data) => setPeriodes(data)).catch(() => {})
    fetchLibraryEntries({ per_page: 200 }).then((data) => setAllEntries(data.items)).catch(() => {})
  }, [])

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
      const body: LibraryBody = {
        titre: form.titre.trim(),
        typologie: form.typologie || null,
        periode: form.periode.trim() || null,
        description_courte: form.description_courte.trim() || null,
        description_longue: form.description_longue.trim() || null,
        image_ref,
        source_url: form.source_url.trim() || null,
        lang: form.lang || 'fr',
        traduction_id: form.traduction_id ? Number(form.traduction_id) : null,
      }
      await onSubmit(body)
    } finally {
      setSubmitting(false)
    }
  }

  const otherLang = form.lang === 'fr' ? 'oc' : 'fr'
  const otherEntries = allEntries.filter((e) => e.lang === otherLang)

  return (
    <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', background: '#fff', marginBottom: 'var(--space-3)' }}>
      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--text-md)' }}>{title}</h2>

      {/* Titre */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Titre *</label>
        <input type="text"
          style={{ ...INPUT_STYLE, borderColor: errors.titre ? 'var(--color-error)' : 'var(--color-border)' }}
          value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
        {errors.titre && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', display: 'block', marginTop: 2 }}>{errors.titre}</span>}
      </div>

      {/* Typologie */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Typologie</label>
        <select style={INPUT_STYLE} value={form.typologie} onChange={(e) => setForm({ ...form, typologie: e.target.value })}>
          <option value="">— Aucune —</option>
          <option value="Histoire">Histoire</option>
          <option value="Légende">Légende</option>
        </select>
      </div>

      {/* Période avec datalist */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Période</label>
        <input type="text" list="periodes-list" style={INPUT_STYLE} value={form.periode}
          onChange={(e) => setForm({ ...form, periode: e.target.value })} placeholder="ex : Moyen Âge, XIXe siècle…" />
        <datalist id="periodes-list">
          {periodes.map((p) => <option key={p} value={p} />)}
        </datalist>
      </div>

      {/* Description courte */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description courte</label>
        <input type="text" style={INPUT_STYLE} value={form.description_courte}
          onChange={(e) => setForm({ ...form, description_courte: e.target.value })} />
      </div>

      {/* Description longue — MarkdownEditor */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Description longue (Markdown)</label>
        <MarkdownEditor value={form.description_longue} onChange={(v) => setForm({ ...form, description_longue: v })} rows={8} />
      </div>

      {/* Image fichier */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — fichier (prioritaire, ≤ 2 Mo)</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ fontSize: 'var(--text-sm)' }}
          onChange={(e) => setForm({ ...form, image_file: e.target.files?.[0] ?? null })} />
      </div>

      {/* Image URL */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Image — URL</label>
        <input type="url" style={{ ...INPUT_STYLE, opacity: form.image_file ? 0.45 : 1 }}
          value={form.image_url} disabled={!!form.image_file}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
      </div>

      {/* URL source */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>URL source</label>
        <input type="url" style={INPUT_STYLE} value={form.source_url}
          onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
      </div>

      {/* Langue */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>Langue</label>
        <select style={INPUT_STYLE} value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value, traduction_id: '' })}>
          <option value="fr">Français (fr)</option>
          <option value="oc">Occitan (oc)</option>
        </select>
      </div>

      {/* Lien traduction */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>
          Lien traduction ({otherLang === 'fr' ? 'Français' : 'Occitan'})
        </label>
        <select style={INPUT_STYLE} value={form.traduction_id} onChange={(e) => setForm({ ...form, traduction_id: e.target.value })}>
          <option value="">— Aucun —</option>
          {otherEntries.map((e) => (
            <option key={e.id} value={e.id}>{e.titre}</option>
          ))}
        </select>
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
