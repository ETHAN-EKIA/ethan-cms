const API_BASE = '/api'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ethan_token')
}

export function setToken(token: string) {
  localStorage.setItem('ethan_token', token)
}

export function removeToken() {
  localStorage.removeItem('ethan_token')
  localStorage.removeItem('ethan_user')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('ethan_user')
  return user ? JSON.parse(user) : null
}

export function setUser(user: unknown) {
  localStorage.setItem('ethan_user', JSON.stringify(user))
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    removeToken()
    if (typeof window !== 'undefined') {
      window.location.assign('/admin/login')
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (res.status === 503) {
    throw new Error('服务暂时不可用，请稍后重试')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path)
}

export function apiPost<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: 'DELETE' })
}
