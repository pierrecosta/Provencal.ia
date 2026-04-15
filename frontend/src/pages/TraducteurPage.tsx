import { useEffect, useRef } from 'react'

export default function TraducteurPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <h1 ref={headingRef} tabIndex={-1}>
      Traducteur
    </h1>
  )
}
