import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { db } from '@/lib/db';

const APP_WGT_PREFIX = 'app_wgt_';
const DATA_DIR = path.join(process.cwd(), 'data');
const VERSION_FILE_PATH = path.join(DATA_DIR, 'app_version.json');
const WGT_DIR = path.join(DATA_DIR, 'wgt');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(WGT_DIR)) {
    fs.mkdirSync(WGT_DIR, { recursive: true });
  }
}

function saveVersionInfo(info: object): void {
  ensureDataDir();
  fs.writeFileSync(VERSION_FILE_PATH, JSON.stringify(info, null, 2), 'utf-8');
  console.log('[AppUpdate] version info saved to file:', VERSION_FILE_PATH);
}

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

    const versionCodeNum = parseInt(versionCode, 10);
    const fileName = `lunauinapp_${version}_${platform}.wgt`;
    const wgtFilePath = path.join(WGT_DIR, fileName);

    ensureDataDir();

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    fs.writeFileSync(wgtFilePath, buffer);
    console.log('[AppUpdate] WGT file saved to:', wgtFilePath);

    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
    try {
      const base64Data = buffer.toString('base64');
      await db.setCache(cacheKey, {
        fileName,
        version,
        versionCode: versionCodeNum,
        platform,
        data: base64Data,
        size: file.size,
        uploadTime: Date.now(),
      });
    } catch (e) {
      console.error('[AppUpdate] save to cache failed (file saved to disk):', e);
    }

    const wgtUrl = `/api/app-update/download?platform=${platform}&versionCode=${versionCode}`;

    const versionInfo = {
      version,
      versionCode: versionCodeNum,
      platform,
      updateType,
      updateLog,
      wgtUrl,
      pkgUrl: '',
      publishTime: Date.now(),
    };

    saveVersionInfo(versionInfo);

    try {
      await db.setCache('app_version_info', versionInfo);
    } catch (e) {
      console.error('[AppUpdate] save version info to cache failed:', e);
    }

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
