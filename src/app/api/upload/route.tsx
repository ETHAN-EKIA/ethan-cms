import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 允许上传的文件类型
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/zip',
]);

// 最大文件大小：10MB
const MAX_SIZE = 10 * 1024 * 1024;

// Next.js App Router Route Segment 配置
export const maxDuration = 30; // 最大执行时间 30秒

export async function POST(request: NextRequest) {
  try {
    // 认证检查（从 cookie 或 Authorization header 获取 token）
    const authHeader = request.headers.get('authorization');
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      request.cookies.get('auth_token')?.value ||
      null;

    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    // 解析 FormData（前端 ProductForm / MediaPage 发送的是 file + folder 格式）
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

    // 安全处理文件名：去除特殊字符
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFolder = folder.replace(/[^a-zA-Z0-9-]/g, '') || 'general';
    const blobPath = `${safeFolder}/${Date.now()}-${safeName}`;

    // 上传到 Vercel Blob（适用于 Vercel Serverless 只读文件系统）
    // 先尝试 public，若 Store 为 private 模式则自动降级
    let blob;
    try {
      blob = await put(blobPath, file, {
        access: 'public',
        addRandomSuffix: false,
      });
    } catch (publicErr) {
      const errMsg = publicErr instanceof Error ? publicErr.message : '';
      if (errMsg.includes('private') || errMsg.includes('access')) {
        // Store 为 private 模式，改用 private 上传 + 代理路由提供访问
        blob = await put(blobPath, file, {
          access: 'private',
          addRandomSuffix: false,
        });
      } else {
        throw publicErr;
      }
    }

    // 同步创建媒体记录，使文件出现在「媒体中心」
    // 若 private store，返回代理 URL；若 public store，返回原始 URL
    const isPrivate = blob.url.includes('.private.blob.') || blob.url.includes('.private.');
    const imageUrl = isPrivate ? `/api/blob?path=${blob.pathname}` : blob.url;

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
      // 媒体记录创建失败不阻止上传，仅记录日志
      console.warn('[Upload] 创建媒体记录失败:', dbErr);
    }

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';

    // 检查 BLOB_READ_WRITE_TOKEN 是否配置
    if (msg.includes('BLOB_READ_WRITE_TOKEN') || msg.includes('token')) {
      return NextResponse.json(
        { error: '服务器缺少 BLOB_READ_WRITE_TOKEN 环境变量，请在 Vercel 控制台中配置 Vercel Blob' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: `上传失败: ${msg}` }, { status: 500 });
  }
}