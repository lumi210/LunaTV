import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { db } from '@/lib/db';

const APP_WGT_PREFIX = 'app_wgt_';
const DATA_DIR = path.join(process.cwd(), 'data');
const VERSION_FILE_PATH = path.join(DATA_DIR, 'app_version.json');
const WGT_DIR = path.join(DATA_DIR, 'wgt');

interface VersionInfo {
  version: string;
  versionCode: number;
  platform: string;
}

function getVersionInfo(): VersionInfo | null {
  try {
    if (fs.existsSync(VERSION_FILE_PATH)) {
      const content = fs.readFileSync(VERSION_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[AppUpdate] get version info from file failed:', e);
  }
  return null;
}

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
    const versionInfo = getVersionInfo();
    
    if (versionInfo && fs.existsSync(WGT_DIR)) {
      const expectedFileName = `lunauinapp_${versionInfo.version}_${platform}.wgt`;
      const wgtFilePath = path.join(WGT_DIR, expectedFileName);
      
      if (fs.existsSync(wgtFilePath)) {
        const fileBuffer = fs.readFileSync(wgtFilePath);
        
        console.log('[AppUpdate] download WGT from file:', {
          fileName: expectedFileName,
          version: versionInfo.version,
          platform: platform,
          size: fileBuffer.length,
        });

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${expectedFileName}"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }
    }

    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
    const wgtData = await db.getCache(cacheKey);

    if (!wgtData || !wgtData.data) {
      return NextResponse.json(
        { success: false, error: 'WGT file not found' },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(wgtData.data, 'base64');

    console.log('[AppUpdate] download WGT from cache:', {
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
