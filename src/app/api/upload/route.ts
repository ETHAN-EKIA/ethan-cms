import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

// 安全修复: 允许的文件夹白名单
const ALLOWED_FOLDERS = ['general', 'products', 'blogs', 'solutions', 'testimonials', 'downloads']

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 })
    }

    // 安全修复: 严格文件类型验证 (MIME + 扩展名双重验证)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/zip']
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'zip']
    if (!file.type || !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
    }

    // 安全修复: 验证文件扩展名
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: '不支持的文件扩展名' }, { status: 400 })
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 })
    }

    // 安全修复: 文件夹白名单验证，防止路径遍历
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: '不允许的上传目录' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
    await mkdir(uploadDir, { recursive: true })

    // 安全修复: 使用安全的文件名（仅字母数字和随机字符串）
    const timestamp = Date.now()
    const safeFilename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = join(uploadDir, safeFilename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${folder}/${safeFilename}`

    const media = await prisma.media.create({
      data: {
        url,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        folder,
        alt: file.name
      }
    })

    return NextResponse.json({ url, media })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
})
