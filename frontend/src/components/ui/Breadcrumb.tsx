import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'ariane" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index}>
            {index > 0 && (
              <span aria-hidden="true" style={{ margin: '0 4px', color: 'var(--color-border)' }}>
                ›
              </span>
            )}
            {isLast || !item.path ? (
              <span aria-current={isLast ? 'page' : undefined} style={{ color: 'var(--color-text)' }}>
                {item.label}
              </span>
            ) : (
              <Link to={item.path} style={{ color: 'var(--color-primary)' }}>
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
