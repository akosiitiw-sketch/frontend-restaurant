const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
let token = localStorage.getItem('noah_pos_token') || ''
export function setToken(value) {
  token = value || ''
  if (token) localStorage.setItem('noah_pos_token', token)
  else localStorage.removeItem('noah_pos_token')
}
export function getToken() { return token }
export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const raw = await response.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) {
    const message = typeof data === 'object' && data ? (data.detail || data.message || `Request failed (${response.status})`) : `Request failed (${response.status})`
    if (response.status === 401 && path !== '/auth/login') setToken('')
    throw new Error(Array.isArray(message) ? message.map(x => x.msg).join(', ') : String(message))
  }
  return data
}
export { API_URL }
