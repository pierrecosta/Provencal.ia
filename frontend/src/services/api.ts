const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type TokenGetter = () => string | null
type OnUnauthorized = () => void

let getToken: TokenGetter = () => null
let onUnauthorized: OnUnauthorized = () => {}

export function configureApi(tokenGetter: TokenGetter, unauthorizedHandler: OnUnauthorized) {
  getToken = tokenGetter
  onUnauthorized = unauthorizedHandler
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    onUnauthorized()
  }

  return response
}
