import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

const APP_WGT_PREFIX = 'app_wgt_';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const version = formData.get('version') as string;
    const versionCode = formData.get('versionCode') as string;
    const platform = formData.get('platform') as string || 'android';
    const updateType = formData.get('updateType') as string || 'normal';
    const updateLog = formData.get('updateLog') as string || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!version || !versionCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: version, versionCode' },
        { status: 400 }
      );
    }

    const fileName = `lunauinapp_${version}_${platform}.wgt`;
    const fileBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
    await db.setCache(cacheKey, {
      fileName,
      version,
      versionCode: parseInt(versionCode, 10),
      platform,
      data: base64Data,
      size: file.size,
      uploadTime: Date.now(),
    });

    const wgtUrl = `/api/app-update/download?platform=${platform}&versionCode=${versionCode}`;

    const versionInfo = {
      version,
      versionCode: parseInt(versionCode, 10),
      platform,
      updateType,
      updateLog,
      wgtUrl,
      pkgUrl: '',
      publishTime: Date.now(),
    };
    await db.setCache('app_version_info', versionInfo);

    console.log('[AppUpdate] WGT file uploaded:', {
      fileName,
      version,
      versionCode,
      platform,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      message: 'WGT file uploaded successfully',
      data: {
        fileName,
        version,
        versionCode,
        platform,
        wgtUrl,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('[AppUpdate] upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
