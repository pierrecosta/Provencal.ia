import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ArticlesPage from './pages/ArticlesPage'
import DictionnairePage from './pages/DictionnairePage'
import TraducteurPage from './pages/TraducteurPage'
import AgendaPage from './pages/AgendaPage'
import BibliothequePage from './pages/BibliothequePage'
import AProposPage from './pages/AProposPage'
import ConnexionPage from './pages/ConnexionPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="dictionnaire" element={<DictionnairePage />} />
          <Route path="traducteur" element={<TraducteurPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="bibliotheque" element={<BibliothequePage />} />
          <Route path="a-propos" element={<AProposPage />} />
          <Route path="connexion" element={<ConnexionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
