import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ArticlesPage from './pages/ArticlesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import DictionnairePage from './pages/DictionnairePage'
import TraducteurPage from './pages/TraducteurPage'
import AgendaPage from './pages/AgendaPage'
import AgendaDetailPage from './pages/AgendaDetailPage'
import BibliothequePage from './pages/BibliothequePage'
import BibliothequeDetailPage from './pages/BibliothequeDetailPage'
import AProposPage from './pages/AProposPage'
import MentionsLegalesPage from './pages/MentionsLegalesPage'
import ConnexionPage from './pages/ConnexionPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="articles/:id" element={<ArticleDetailPage />} />
            <Route path="dictionnaire" element={<DictionnairePage />} />
            <Route path="traducteur" element={<TraducteurPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="agenda/:id" element={<AgendaDetailPage />} />
            <Route path="bibliotheque" element={<BibliothequePage />} />
            <Route path="bibliotheque/:id" element={<BibliothequeDetailPage />} />
            <Route path="a-propos" element={<AProposPage />} />
            <Route path="mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="connexion" element={<ConnexionPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
