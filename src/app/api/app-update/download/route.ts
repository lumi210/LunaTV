import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

const APP_WGT_PREFIX = 'app_wgt_';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'android';
  const versionCode = searchParams.get('versionCode');

  if (!versionCode) {
    return NextResponse.json(
      { success: false, error: 'Missing versionCode' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
    const wgtData = await db.getCache(cacheKey);

    if (!wgtData || !wgtData.data) {
      return NextResponse.json(
        { success: false, error: 'WGT file not found' },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(wgtData.data, 'base64');

    console.log('[AppUpdate] download WGT:', {
      fileName: wgtData.fileName,
      version: wgtData.version,
      platform: wgtData.platform,
      size: wgtData.size,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${wgtData.fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[AppUpdate] download error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
}
