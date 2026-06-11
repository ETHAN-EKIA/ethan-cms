'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiGet, clearLocalState, getUser, logout, setUser } from '@/lib/api-client'

const menuItems = [
  { href: '/admin', label: '仪表盘', icon: '📊' },
  { href: '/admin/products', label: '产品管理', icon: '📦' },
  { href: '/admin/categories', label: '分类管理', icon: '🏷️' },
  { href: '/admin/inquiries', label: '询盘管理', icon: '📧' },
  { href: '/admin/customers', label: '客户管理', icon: '👥' },
  { href: '/admin/orders', label: '订单管理', icon: '🛒' },
  { href: '/admin/media', label: '媒体中心', icon: '🖼️' },
  { href: '/admin/blogs', label: '新闻博客', icon: '📰' },
  { href: '/admin/solutions', label: '解决方案', icon: '💡' },
  { href: '/admin/testimonials', label: '客户反馈', icon: '⭐' },
  { href: '/admin/downloads', label: '下载中心', icon: '📥' },
  { href: '/admin/translations', label: '多语言', icon: '🌐' },
  { href: '/admin/users', label: '用户管理', icon: '🔐' },
  { href: '/admin/settings', label: '站点设置', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUserState] = useState<{ displayName?: string | null; username: string; role: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // 登录页不需要权限校验
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) return
    // ✅ 安全修复：不再依赖 localStorage token，改为通过 /api/auth/me 校验 cookie 会话并获取用户信息
    apiGet<{ username: string; role: string; displayName?: string | null }>('/auth/me')
      .then((u) => {
        setUser(u)
        setUserState(u)
      })
      .catch(() => {
        // apiFetch 内部会处理 401 跳转；此处仅做兜底
        clearLocalState()
        router.push('/admin/login')
      })
  }, [router, isLoginPage, pathname])

  // 安全兜底：如果 3 秒后还没有 user，强制跳登录（必须在顶层，不能被条件包裹）
  useEffect(() => {
    if (isLoginPage || user) return
    const timer = setTimeout(() => {
      if (!getUser()) {
        clearLocalState()
        router.push('/admin/login')
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [isLoginPage, user, router])

  // 登录页：直接渲染，不做权限拦截
  if (isLoginPage) {
    return <>{children}</>
  }

  // 非登录页：没拿到 user 前显示 loading
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const handleLogout = async () => { await logout(); router.push('/admin/login') }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-700">
          <span className="text-xl font-bold text-cyan-400">ETHAN</span>
          {sidebarOpen && <span className="ml-2 text-sm text-slate-400">CMS</span>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm transition-colors ${pathname === item.href ? 'bg-cyan-600/20 text-cyan-400 border-r-2 border-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span>
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700 text-xl">☰</button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.displayName || user.username}</span>
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">{user.role}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">退出</button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
