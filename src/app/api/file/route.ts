import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * /tmp 文件代理端点
 *
 * Vercel Serverless 环境中，文件系统除 /tmp 外均为只读。
 * 当未配置 BLOB_READ_WRITE_TOKEN 时，上传文件存于 /tmp，
 * 通过此端点代理访问。
 *
 * 用法：GET /api/file?path=uploads%2Fproducts%2F1234-image.jpg
 */

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml',
  pdf: 'application/pdf', zip: 'application/zip',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
  }

  // 安全检查：防止路径遍历
  if (rawPath.includes('..') || rawPath.startsWith('/')) {
    return NextResponse.json({ error: '无效路径' }, { status: 400 });
  }

  const safePath = rawPath.replace(/\\/g, '/');
  const fullPath = join(tmpdir(), safePath);

  try {
    const buffer = await readFile(fullPath);

    // 推断 Content-Type
    const ext = safePath.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: '文件不存在或已过期' }, { status: 404 });
  }
}
