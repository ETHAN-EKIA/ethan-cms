import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const maxDuration = 30;

/**
 * Vercel Blob 图片代理路由
 *
 * 当 Blob Store 配置为 private 模式时，直接 URL 无法访问文件。
 * 此路由通过服务端 get() + token 获取文件内容并代理返回，
 * 同时添加 Cache-Control 头以利用 CDN/浏览器缓存。
 *
 * 用法：GET /api/blob?path=products/1234567890-image.jpg
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('path');

  if (!pathname) {
    return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 });
  }

  // 安全检查：防止路径遍历
  if (pathname.includes('..') || pathname.startsWith('/')) {
    return NextResponse.json({ error: '无效路径' }, { status: 400 });
  }

  try {
    // 使用 get() 获取 private blob 内容
    const blob = await get(pathname, { access: 'private' });

    if (!blob) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 从 blob 元数据推断 Content-Type
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', pdf: 'application/pdf',
      zip: 'application/zip',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // 缓存 1 天 + stale-while-revalidate 7 天
    return new NextResponse(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Blob proxy] Error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';

    if (msg.includes('not found') || msg.includes('does not exist')) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    return NextResponse.json({ error: '文件获取失败' }, { status: 500 });
  }
}
