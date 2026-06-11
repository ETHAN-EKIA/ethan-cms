/**
 * 图片 URL 解析工具
 *
 * 将产品、博客等实体中的相对图片路径（如 /api/blob?path=...）
 * 转换为绝对 URL，确保外部网站（跨域）能正确加载 CMS 上的图片。
 *
 * 绝对 URL（如 https://xxx.vercel-storage.com/...）保持不变。
 */

import { NextRequest } from 'next/server'

/**
 * 获取 CMS 自身的稳定生产域名
 *
 * 优先级：
 * 1. VERCEL_PROJECT_PRODUCTION_URL — Vercel 生产别名（如 ethan-cms.vercel.app），稳定不变
 * 2. 请求头 x-forwarded-host / host — 通用回退方案
 *
 * 注意：不使用 VERCEL_URL，因为它是每次部署的唯一域名，会被 Deployment Protection 拦截
 */
export function getCmsOrigin(req?: NextRequest): string {
  // 1. 环境变量显式配置（最可靠）
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (prodUrl) {
    return prodUrl.startsWith('http') ? prodUrl : `https://${prodUrl}`
  }

  // 2. 硬编码 Vercel 生产域名（稳定、无 Deployment Protection）
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'https://ethan-cms.vercel.app'
  }

  // 3. 本地开发: 从请求头推断
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host')
    const host = forwardedHost || req.headers.get('host') || ''
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`
  }

  return 'https://ethan-cms.vercel.app'
}

/**
 * 判断 URL 是否为相对路径（需要 CMS 域名前缀）
 */
function isRelativeUrl(url: string): boolean {
  // 匹配 /api/blob?... 和 images/... 等相对路径，排除 http/https 和 // 开头的协议相对 URL
  return !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')
}

/**
 * 将单个 URL 转为绝对 URL
 */
function resolveUrl(url: string, cmsOrigin: string): string {
  if (!url || !isRelativeUrl(url)) return url
  // 确保路径以 / 开头
  const path = url.startsWith('/') ? url : `/${url}`
  return `${cmsOrigin}${path}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

/**
 * 解析产品图片字段中的 URL（images.main + images.gallery[]）
 * 返回浅拷贝的产品对象，图片 URL 已替换为绝对路径
 */
export function resolveImageUrls(
  product: AnyRecord,
  cmsOrigin: string
): AnyRecord {
  if (!cmsOrigin) return product

  const result = { ...product }

  // 处理 images 字段（JSON: { main, gallery[] }）
  if (result.images && typeof result.images === 'object') {
    const images = result.images as { main?: string; gallery?: string[] }
    result.images = {
      ...images,
      main: images.main ? resolveUrl(images.main, cmsOrigin) : images.main,
      gallery: images.gallery?.map(url => resolveUrl(url, cmsOrigin)),
    }
  }

  // 处理其他常见图片字段
  for (const field of ['image', 'coverImage', 'avatar', 'icon']) {
    if (typeof result[field] === 'string') {
      result[field] = resolveUrl(result[field], cmsOrigin)
    }
  }

  return result
}

/**
 * 批量解析列表中每个项目的图片 URL
 */
export function resolveImageUrlsList(
  items: AnyRecord[],
  cmsOrigin: string
): AnyRecord[] {
  if (!cmsOrigin) return items
  return items.map(item => resolveImageUrls(item, cmsOrigin))
}
