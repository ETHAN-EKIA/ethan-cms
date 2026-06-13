import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 允许上传的文件类型
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/zip',
]);

// 文件夹白名单
const ALLOWED_FOLDERS = new Set(['general', 'products', 'blogs', 'categories', 'solutions', 'testimonials']);

// 最大文件大小：10MB
const MAX_SIZE = 10 * 1024 * 1024;

export const maxDuration = 30;

/**
 * 检查 public/ 是否可写
 */
async function isPublicWritable(): Promise<boolean> {
  try {
    const testPath = join(process.cwd(), 'public', '.write_test');
    await writeFile(testPath, '');
    try { await import('fs/promises').then(m => m.unlink(testPath)); } catch { /* */ }
    return true;
  } catch { return false; }
}

/**
 * 本地文件系统上传
 */
async function uploadToPublic(pathname: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = join(process.cwd(), 'public', pathname);
  await mkdir(join(process.cwd(), 'public', pathname.split('/').slice(0, -1).join('/')), { recursive: true });
  await writeFile(fullPath, buffer);
  return `/${pathname.replace(/\\/g, '/')}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      request.cookies.get('auth_token')?.value ||
      null;

    const user = token ? verifyToken(token) : null;
    if (!user) return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type))
      return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFolder = folder.replace(/[^a-zA-Z0-9-]/g, '') || 'general';
    if (!ALLOWED_FOLDERS.has(safeFolder))
      return NextResponse.json({ error: `不允许的文件夹: ${safeFolder}` }, { status: 400 });

    const blobPath = `uploads/${safeFolder}/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let imageUrl: string;

    if (await isPublicWritable()) {
      // 本地开发：写 public/
      imageUrl = await uploadToPublic(blobPath, file);
    } else {
      // Vercel 生产：存入 MySQL Media 表
      const media = await prisma.media.create({
        data: {
          url: `/api/images/${safeFolder}/${Date.now()}-${safeName}`,
          filename: safeName,
          mimeType: file.type,
          size: file.size,
          folder: safeFolder,
          data: fileBuffer,
        },
      });
      imageUrl = media.url;
    }

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: `上传失败: ${(error as Error).message}` }, { status: 500 });
  }
}
