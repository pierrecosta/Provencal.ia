import { Outlet, useLocation } from 'react-router-dom'
import NavbarDesktop from './NavbarDesktop'
import NavbarMobile from './NavbarMobile'
import Footer from './Footer'
import SessionWarning from '../ui/SessionWarning'
import { useFocusOnNavigation } from '../../hooks/useFocusOnNavigation'
import './Layout.css'
import './Footer.css'

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

  useFocusOnNavigation()

  return (
    <div className="layout">
      <NavbarDesktop />
      <header className="layout__mobile-header">
        <span className="layout__mobile-title">{pageTitle}</span>
      </header>
      <SessionWarning isEditFormOpen={false} />
      <main className="layout__main">
        <Outlet />
      </main>
      <Footer />
      <NavbarMobile />
    </div>
  )
}
