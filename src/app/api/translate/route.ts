import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * 多语言翻译 API
 *
 * 使用 MyMemory 免费翻译 API（无需 Key，1000 字/天免费用量）
 * 支持中文 → 英文、西班牙语
 *
 * POST /api/translate
 * Body: { texts: string[], from: "zh", to: ["en", "es"] }
 */

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // 认证
    const authHeader = request.headers.get('authorization');
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      request.cookies.get('auth_token')?.value ||
      null;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { texts, from, to } = body as {
      texts: string[];
      from: string;
      to: string[];
    };

    if (!texts?.length || !to?.length) {
      return NextResponse.json({ error: '缺少翻译参数' }, { status: 400 });
    }

    // 语言代码映射
    const langMap: Record<string, string> = {
      zh: 'zh-CN',
      en: 'en-GB',
      es: 'es-ES',
    };

    const fromLang = langMap[from] || from;
    const translations: string[][] = [];

    // 并行翻译每个文本
    for (const text of texts) {
      const textTranslations: string[] = [];

      for (const targetLang of to) {
        const toLang = langMap[targetLang] || targetLang;
        const translated = await translateText(text, fromLang, toLang);
        textTranslations.push(translated);
      }

      translations.push(textTranslations);
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('[Translate] Error:', error);
    return NextResponse.json(
      { error: '翻译服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}

async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  if (!text.trim()) return '';

  try {
    // MyMemory Translation API (免费，无需 API Key)
    // 手动构建 URL 以确保中文正确编码
    const q = encodeURIComponent(text);
    const langpair = encodeURIComponent(`${from}|${to}`);
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      responseStatus: number;
      responseData: { translatedText: string; match: number };
    };

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    // 非200状态码意味着翻译真正失败，抛出错误触发降级
    throw new Error(`MyMemory responseStatus=${data.responseStatus}`);
  } catch {
    // 网络错误或API错误时重新抛出，让调用方知道翻译失败
    throw new Error(`Translation failed for text: ${text.substring(0, 50)}`);
  }
}
