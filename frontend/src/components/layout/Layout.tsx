import { Outlet, useLocation } from 'react-router-dom'
import NavbarDesktop from './NavbarDesktop'
import NavbarMobile from './NavbarMobile'
import './Layout.css'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Accueil',
  '/articles': 'Actualités',
  '/dictionnaire': 'Dictionnaire',
  '/traducteur': 'Traducteur',
  '/agenda': 'Agenda',
  '/bibliotheque': 'Culture',
  '/a-propos': 'À propos',
  '/connexion': 'Compte',
}

export default function Layout() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div className="layout">
      <NavbarDesktop />
      <header className="layout__mobile-header">
        <span className="layout__mobile-title">{pageTitle}</span>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
      <NavbarMobile />
    </div>
  )
}
