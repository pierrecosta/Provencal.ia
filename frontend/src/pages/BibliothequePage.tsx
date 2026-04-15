import { useEffect, useRef } from 'react'

export default function BibliothequePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <h1 ref={headingRef} tabIndex={-1}>
      Culture
    </h1>
  )
}
