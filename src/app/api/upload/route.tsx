import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 允许上传的文件类型
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/zip',
]);

// 文件夹白名单 — 防止路径遍历攻击
const ALLOWED_FOLDERS = new Set(['general', 'products', 'blogs', 'categories', 'solutions', 'testimonials']);

// 最大文件大小：10MB
const MAX_SIZE = 10 * 1024 * 1024;

// Next.js App Router Route Segment 配置
export const maxDuration = 30;

/**
 * 检测 public/ 目录是否可写
 * Vercel Serverless 文件系统为只读（/tmp 除外）
 */
async function isPublicWritable(): Promise<boolean> {
  try {
    const testPath = join(process.cwd(), 'public', '.write_test');
    await writeFile(testPath, '');
    // 清理
    try { await import('fs/promises').then(m => m.unlink(testPath)); } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

/**
 * Vercel Blob 上传
 */
async function uploadToBlob(pathname: string, file: File) {
  const { put } = await import('@vercel/blob');
  try {
    return await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    });
  } catch (publicErr) {
    const errMsg = publicErr instanceof Error ? publicErr.message : '';
    if (errMsg.includes('private') || errMsg.includes('access')) {
      return await put(pathname, file, {
        access: 'private',
        addRandomSuffix: false,
      });
    }
    throw publicErr;
  }
}

/**
 * 本地文件系统上传（开发环境：public/uploads/）
 */
async function uploadToPublic(pathname: string, file: File): Promise<{ url: string; pathname: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = join(process.cwd(), 'public', pathname);
  const dir = join(process.cwd(), 'public', pathname.split('/').slice(0, -1).join('/'));

  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, buffer);

  const url = `/${pathname.replace(/\\/g, '/')}`;
  return { url, pathname };
}

/**
 * /tmp 临时文件上传（Vercel Serverless 降级方案）
 * 文件通过 /api/file 代理端点访问
 */
async function uploadToTmp(pathname: string, file: File): Promise<{ url: string; pathname: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = join(tmpdir(), pathname);
  const dir = join(tmpdir(), pathname.split('/').slice(0, -1).join('/'));

  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, buffer);

  // 返回代理 URL
  const url = `/api/file?path=${encodeURIComponent(pathname)}`;
  return { url, pathname };
}

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const authHeader = request.headers.get('authorization');
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      request.cookies.get('auth_token')?.value ||
      null;

    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }

    // 文件类型校验
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}，仅支持 JPG/PNG/WebP/GIF/PDF/ZIP` },
        { status: 400 }
      );
    }

    // 文件大小校验
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // 安全处理文件名
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFolder = folder.replace(/[^a-zA-Z0-9-]/g, '') || 'general';

    if (!ALLOWED_FOLDERS.has(safeFolder)) {
      return NextResponse.json(
        { error: `不允许的文件夹: ${safeFolder}，仅允许: ${[...ALLOWED_FOLDERS].join(', ')}` },
        { status: 400 }
      );
    }

    const blobPath = `uploads/${safeFolder}/${Date.now()}-${safeName}`;

    // ── 环境自适应存储 ──
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let imageUrl: string;

    if (blobToken) {
      // 1. Vercel Blob（生产环境最佳方案）
      const blob = await uploadToBlob(blobPath, file);
      const isPrivate = blob.url.includes('.private.') || blob.url.includes('.private.blob.');
      imageUrl = isPrivate ? `/api/blob?path=${blob.pathname}` : blob.url;
    } else if (await isPublicWritable()) {
      // 2. 本地 public/ 目录（开发环境）
      const result = await uploadToPublic(blobPath, file);
      imageUrl = result.url;
    } else {
      // 3. /tmp 临时存储 + 代理端点（Vercel Serverless 无 Blob Token 时的降级）
      const result = await uploadToTmp(blobPath, file);
      imageUrl = result.url;
    }

    // 同步创建媒体记录
    try {
      await prisma.media.create({
        data: {
          url: imageUrl,
          filename: safeName,
          mimeType: file.type,
          size: file.size,
          folder: safeFolder,
        },
      });
    } catch (dbErr) {
      console.warn('[Upload] 创建媒体记录失败:', dbErr);
    }

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: `上传失败: ${msg}` }, { status: 500 });
  }
}
