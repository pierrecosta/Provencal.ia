import { useEffect, useRef } from 'react'

export default function HomePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <h1 ref={headingRef} tabIndex={-1}>
      Accueil
    </h1>
  )
}
