import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useFocusOnNavigation() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)

    const h1 = document.querySelector<HTMLHeadingElement>('h1')
    if (h1) {
      if (!h1.hasAttribute('tabindex')) {
        h1.setAttribute('tabindex', '-1')
      }
      h1.focus({ preventScroll: true })
    }
  }, [location.pathname])
}
