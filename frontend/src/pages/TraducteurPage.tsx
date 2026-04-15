import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../services/api'

interface TranslateResponse {
  translated: string
  unknown_words: string[]
}

export default function TraducteurPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [text, setText] = useState('')
  const [result, setResult] = useState<TranslateResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) { setResult(null); return }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      apiFetch('/api/v1/translate', { method: 'POST', body: JSON.stringify({ text }) })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((data: TranslateResponse) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text])

  const renderTranslated = () => {
    if (!result) return null
    const unknownSet = new Set(result.unknown_words.map(w => w.toLowerCase()))
    // Split on word boundaries preserving separators
    const tokens = result.translated.match(/([a-zA-ZÀ-ÿ'-]+|[^a-zA-ZÀ-ÿ'-]+)/g) ?? []
    return tokens.map((token, i) => {
      if (unknownSet.has(token.toLowerCase())) {
        return <mark key={i} style={{ background: 'var(--color-highlight, #FFF9C4)', borderRadius: 2 }}>{token}</mark>
      }
      return <span key={i}>{token}</span>
    })
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1}>Traducteur lexical</h1>

      {/* Mention permanente */}
      <div style={{ background: 'var(--color-bg-alt, #F5F0E8)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 'var(--space-3)' }}>
        <p style={{ margin: 0, fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
          Traducteur mot à mot — la traduction automatique de phrases complètes est prévue dans une version future.
        </p>
      </div>

      {/* Layout 50/50 desktop, empilé mobile */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {/* Zone de saisie */}
        <div style={{ flex: '1 1 280px' }}>
          <label htmlFor="trad-input" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-1)' }}>
            Texte en français
          </label>
          <textarea
            id="trad-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Saisissez votre texte en français…"
            rows={10}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-base)', resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Zone de résultat */}
        <div style={{ flex: '1 1 280px' }}>
          <p id="trad-result-label" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)', marginTop: 0 }}>
            Traduction provençale
          </p>
          <div
            aria-live="polite"
            aria-labelledby="trad-result-label"
            style={{ minHeight: 160, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-alt, #FAFAF7)', fontSize: 'var(--text-base)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
          >
            {loading ? (
              <span style={{ color: 'var(--color-text-muted)' }}>Traduction en cours…</span>
            ) : result ? (
              renderTranslated()
            ) : null}
          </div>
          {result && result.unknown_words.length > 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              <mark style={{ background: 'var(--color-highlight, #FFF9C4)', borderRadius: 2, padding: '0 2px' }}>Surligné</mark>
              {' '}= mot non trouvé dans le dictionnaire ({result.unknown_words.length} mot{result.unknown_words.length > 1 ? 's' : ''})
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
