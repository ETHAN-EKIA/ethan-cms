const API_BASE = '/api'

/**
 * ✅ 安全修复：不再依赖 localStorage 中的 Bearer Token。
 *
 * 当前认证策略：
 * - 登录成功后服务端写入 httpOnly cookie: auth_token
 * - 前端请求同源 API 时自动携带 cookie
 * - API 端（withAuth）同时支持 Authorization Bearer 与 auth_token cookie（优先 Bearer）
 *
 * 仍保留 localStorage 的 ethan_user 作为展示用途（非敏感信息），登出时清理。
 */
export function clearLocalState() {
  // 兼容清理历史遗留的 token（即使当前不再写入）
  localStorage.removeItem('ethan_token')
  localStorage.removeItem('ethan_user')
}

/**
 * 完整登出：清除服务端 cookie + 本地存储
 * 必须调用此函数以确保 httpOnly cookie 被清除
 */
export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // 即使网络失败也继续清除本地状态
  }
  clearLocalState()
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    // 同源请求默认会带 cookie，但这里显式声明，避免后续改为跨域时踩坑
    credentials: 'include',
  })

  if (res.status === 401) {
    clearLocalState()
    // 同步清除服务端 httpOnly cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
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
