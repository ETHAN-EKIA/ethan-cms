import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * 图片服务端点 — 从 MySQL Media.data 读取二进制并返回
 * GET /api/images/uploads/products/12345678-image.jpg
 *
 * URL 中的 path 必须与上传时存入 Media.url 的格式一致
 */
export const maxDuration = 15;

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml',
  pdf: 'application/pdf', zip: 'application/zip',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const urlPath = `/${segments.join('/')}`;

  try {
    const media = await prisma.media.findFirst({
      where: { url: { startsWith: urlPath } },
      orderBy: { createdAt: 'desc' },
    });

    if (!media || !media.data) {
      // Fallback: 尝试从 public/ 目录返回
      return new NextResponse('Not Found', { status: 404 });
    }

    const ext = media.filename.split('.').pop()?.toLowerCase() || '';
    const contentType = media.mimeType || MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(media.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(media.data.length),
      },
    });
  } catch {
    return NextResponse.json({ error: '图片加载失败' }, { status: 500 });
  }
}
