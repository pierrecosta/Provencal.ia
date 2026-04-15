import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

/**
 * Éditeur Markdown avec prévisualisation en temps réel.
 * - Desktop (≥ 768px) : textarea à gauche + prévisualisation à droite (50/50)
 * - Mobile (< 768px) : onglets Éditeur / Prévisualisation
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Saisir du Markdown…',
  rows = 10,
}: MarkdownEditorProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: `${rows * 1.5}rem`,
    padding: '8px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box',
    background: '#fafafa',
  }

  const previewStyle: React.CSSProperties = {
    minHeight: `${rows * 1.5}rem`,
    padding: '8px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    lineHeight: 1.6,
    overflowY: 'auto',
    background: '#fff',
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 16px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--color-primary)' : 'none',
    color: active ? '#fff' : 'var(--color-text)',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: 'var(--text-sm)',
    fontFamily: 'inherit',
  })

  if (isMobile) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <button type="button" style={tabBtnStyle(activeTab === 'editor')} onClick={() => setActiveTab('editor')}>
            Éditeur
          </button>
          <button type="button" style={tabBtnStyle(activeTab === 'preview')} onClick={() => setActiveTab('preview')}>
            Prévisualisation
          </button>
        </div>
        {activeTab === 'editor' ? (
          <textarea
            style={textareaStyle}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <div style={previewStyle}>
            {value ? <ReactMarkdown>{value}</ReactMarkdown> : <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Rien à prévisualiser.</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <textarea
        style={textareaStyle}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      <div style={previewStyle}>
        {value ? <ReactMarkdown>{value}</ReactMarkdown> : <span style={{ opacity: 0.4, fontStyle: 'italic' }}>La prévisualisation apparaîtra ici.</span>}
      </div>
    </div>
  )
}
