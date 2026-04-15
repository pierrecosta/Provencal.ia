import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import iconAccueil from '../../assets/icons/icon-accueil.svg'
import iconArticles from '../../assets/icons/icon-articles.svg'
import iconLangue from '../../assets/icons/icon-langue.svg'
import iconAgenda from '../../assets/icons/icon-agenda.svg'
import iconCulture from '../../assets/icons/icon-culture.svg'
import iconAPropos from '../../assets/icons/icon-a-propos.svg'
import iconCompte from '../../assets/icons/icon-compte.svg'
import LanguageSubmenu from './LanguageSubmenu'
import './NavbarMobile.css'

const LANGUAGE_ROUTES = ['/dictionnaire', '/traducteur']

export default function NavbarMobile() {
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const location = useLocation()

  const isLangueActive = LANGUAGE_ROUTES.includes(location.pathname)

  return (
    <>
      <nav className="navbar-mobile" aria-label="Navigation principale">
        <NavLink
          to="/"
          end
          className="navbar-mobile__entry"
          aria-label="Accueil"
        >
          <img src={iconAccueil} alt="" aria-hidden="true" width={22} height={22} />
          <span>Accueil</span>
        </NavLink>

        <NavLink
          to="/articles"
          className="navbar-mobile__entry"
          aria-label="Actualités"
        >
          <img src={iconArticles} alt="" aria-hidden="true" width={22} height={22} />
          <span>Actus</span>
        </NavLink>

        <button
          className={`navbar-mobile__entry navbar-mobile__entry--button${isLangueActive ? ' active' : ''}`}
          aria-label="Langue"
          aria-expanded={langMenuOpen}
          aria-haspopup="dialog"
          onClick={() => setLangMenuOpen((v) => !v)}
        >
          <img src={iconLangue} alt="" aria-hidden="true" width={22} height={22} />
          <span>Langue</span>
        </button>

        <NavLink
          to="/agenda"
          className="navbar-mobile__entry"
          aria-label="Agenda"
        >
          <img src={iconAgenda} alt="" aria-hidden="true" width={22} height={22} />
          <span>Agenda</span>
        </NavLink>

        <NavLink
          to="/bibliotheque"
          className="navbar-mobile__entry"
          aria-label="Culture"
        >
          <img src={iconCulture} alt="" aria-hidden="true" width={22} height={22} />
          <span>Culture</span>
        </NavLink>

        <NavLink
          to="/a-propos"
          className="navbar-mobile__entry"
          aria-label="À propos"
        >
          <img src={iconAPropos} alt="" aria-hidden="true" width={22} height={22} />
          <span>À propos</span>
        </NavLink>

        <NavLink
          to="/connexion"
          className="navbar-mobile__entry"
          aria-label="Compte"
        >
          <img src={iconCompte} alt="" aria-hidden="true" width={22} height={22} />
          <span>Compte</span>
        </NavLink>
      </nav>

      <LanguageSubmenu
        open={langMenuOpen}
        onClose={() => setLangMenuOpen(false)}
        mode="mobile"
      />
    </>
  )
}
