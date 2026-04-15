import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import iconAccueil from '../../assets/icons/icon-accueil.svg'
import iconArticles from '../../assets/icons/icon-articles.svg'
import iconLangue from '../../assets/icons/icon-langue.svg'
import iconAgenda from '../../assets/icons/icon-agenda.svg'
import iconCulture from '../../assets/icons/icon-culture.svg'
import iconAPropos from '../../assets/icons/icon-a-propos.svg'
import iconConnexion from '../../assets/icons/icon-connexion.svg'
import iconDeconnexion from '../../assets/icons/icon-deconnexion.svg'
import LanguageSubmenu from './LanguageSubmenu'
import './NavbarDesktop.css'

const LANGUAGE_ROUTES = ['/dictionnaire', '/traducteur']

export default function NavbarDesktop() {
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated, pseudo, logout } = useAuth()

  const isLangueActive = LANGUAGE_ROUTES.includes(location.pathname)

  return (
    <nav className="navbar-desktop" aria-label="Navigation principale">
      <div className="navbar-desktop__inner">
        <NavLink to="/" className="navbar-desktop__logo" aria-label="Provençal.ia — Accueil">
          Provençal.ia
        </NavLink>

        <ul className="navbar-desktop__menu" role="menubar">
          <li role="none">
            <NavLink
              to="/"
              end
              className="navbar-desktop__entry"
              aria-label="Accueil"
              role="menuitem"
            >
              <img src={iconAccueil} alt="" aria-hidden="true" width={20} height={20} />
              <span>Accueil</span>
            </NavLink>
          </li>

          <li role="none">
            <NavLink
              to="/articles"
              className="navbar-desktop__entry"
              aria-label="Actualités"
              role="menuitem"
            >
              <img src={iconArticles} alt="" aria-hidden="true" width={20} height={20} />
              <span>Actualités</span>
            </NavLink>
          </li>

          <li role="none" className="navbar-desktop__langue-wrapper">
            <button
              className={`navbar-desktop__entry navbar-desktop__entry--button${isLangueActive ? ' active' : ''}`}
              aria-label="Langue"
              aria-expanded={langMenuOpen}
              aria-haspopup="true"
              role="menuitem"
              onClick={() => setLangMenuOpen((v) => !v)}
            >
              <img src={iconLangue} alt="" aria-hidden="true" width={20} height={20} />
              <span>Langue</span>
            </button>
            <LanguageSubmenu
              open={langMenuOpen}
              onClose={() => setLangMenuOpen(false)}
              mode="desktop"
            />
          </li>

          <li role="none">
            <NavLink
              to="/agenda"
              className="navbar-desktop__entry"
              aria-label="Agenda"
              role="menuitem"
            >
              <img src={iconAgenda} alt="" aria-hidden="true" width={20} height={20} />
              <span>Agenda</span>
            </NavLink>
          </li>

          <li role="none">
            <NavLink
              to="/bibliotheque"
              className="navbar-desktop__entry"
              aria-label="Culture"
              role="menuitem"
            >
              <img src={iconCulture} alt="" aria-hidden="true" width={20} height={20} />
              <span>Culture</span>
            </NavLink>
          </li>

          <li role="none">
            <NavLink
              to="/a-propos"
              className="navbar-desktop__entry"
              aria-label="À propos"
              role="menuitem"
            >
              <img src={iconAPropos} alt="" aria-hidden="true" width={20} height={20} />
              <span>À propos</span>
            </NavLink>
          </li>
        </ul>

        {isAuthenticated ? (
          <div className="navbar-desktop__compte">
            <span className="navbar-desktop__pseudo">{pseudo}</span>
            <button
              className="navbar-desktop__entry navbar-desktop__entry--button"
              aria-label="Se déconnecter"
              onClick={() => { void logout() }}
            >
              <img src={iconDeconnexion} alt="" aria-hidden="true" width={20} height={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        ) : (
          <NavLink
            to="/connexion"
            className="navbar-desktop__entry navbar-desktop__compte"
            aria-label="Connexion"
          >
            <img src={iconConnexion} alt="" aria-hidden="true" width={20} height={20} />
            <span>Connexion</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
