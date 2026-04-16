// ── Erreur API typée ────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface PaginationParams {
  page?: number
  per_page?: number
}

// ── Proverbes / Dictons ──────────────────────────────────────────────────────
export interface Saying {
  id: number
  terme_provencal: string
  localite_origine: string
  traduction_sens_fr: string
  type: string | null
  contexte: string | null
  source: string | null
  is_locked: boolean
  locked_by: number | null
}

export interface SayingCreate {
  terme_provencal: string
  localite_origine: string
  traduction_sens_fr: string
  type: string | null
  contexte: string | null
  source: string | null
}

export type SayingUpdate = SayingCreate

export interface SayingsParams extends PaginationParams {
  type?: string
  localite?: string
}

// ── Articles ─────────────────────────────────────────────────────────────────
export interface Article {
  id: number
  titre: string
  description: string | null
  auteur: string | null
  date_publication: string | null
  categorie: string | null
  image_ref: string | null
  source_url: string | null
  is_locked: boolean
  locked_by: number | null
}

export interface ArticleBody {
  titre: string
  description: string | null
  image_ref: string | null
  source_url: string | null
  date_publication: string
  auteur: string | null
  categorie: string | null
}

export interface ArticlesParams extends PaginationParams {
  categorie?: string
  annee?: string
  mois?: string
}

// ── Agenda ───────────────────────────────────────────────────────────────────
export interface AgendaEvent {
  id: number
  titre: string
  date_debut: string
  date_fin: string
  lieu: string | null
  description: string | null
  lien_externe: string | null
  is_locked: boolean
  locked_by: number | null
}

export interface EventBody {
  titre: string
  date_debut: string
  date_fin: string
  lieu: string | null
  description: string | null
  lien_externe: string | null
}

export interface EventsParams extends PaginationParams {
  archive?: boolean
  lieu?: string
  annee?: string
  mois?: string
}

// ── Bibliothèque ─────────────────────────────────────────────────────────────
export interface LibraryEntry {
  id: number
  titre: string
  description_courte: string | null
  description_longue: string | null
  periode: string | null
  typologie: string | null
  source_url: string | null
  image_ref: string | null
  lang: string | null
  traduction_id: number | null
  is_locked: boolean
  locked_by: number | null
}

export interface LibraryEntryDetail extends LibraryEntry {
  has_translation: boolean
  translation_lang: string | null
}

export interface LibraryBody {
  titre: string
  description_courte: string | null
  description_longue: string | null
  periode: string | null
  typologie: string | null
  image_ref: string | null
  source_url: string | null
  lang: string
  traduction_id: number | null
}

export interface LibraryParams extends PaginationParams {
  type?: string
  periode?: string
  lieu?: string
}

// ── Dictionnaire ─────────────────────────────────────────────────────────────
export interface DictTranslation {
  id: number
  traduction: string
  graphie: string | null
  source: string | null
  region: string | null
}

export interface DictEntry {
  id: number
  mot_fr: string
  theme: string | null
  categorie: string | null
  translations: DictTranslation[]
}

export type ThemeCategories = Record<string, string[]>

export interface DictSearchParams extends PaginationParams {
  q?: string
  theme?: string
  categorie?: string
  graphie?: string
  source?: string
}

export interface ProvSearchParams extends PaginationParams {
  q?: string
  graphie?: string
  source?: string
}

export interface DictPage {
  items: DictEntry[]
  total: number
  page: number
  per_page: number
  suggestions?: string[]
}

// ── Authentification ─────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string
}

// ── Traducteur ───────────────────────────────────────────────────────────────
export interface TranslateResult {
  translated: string
  unknown_words: string[]
}

// ── À propos ──────────────────────────────────────────────────────────────────
export interface AProposBlocOut {
  bloc: string
  contenu: string
  locked_by: number | null
  locked_at: string | null
}

export interface AProposOut {
  demarche: AProposBlocOut
  sources: AProposBlocOut
  contributors: string[]
}
