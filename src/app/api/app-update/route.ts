import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { db } from '@/lib/db';

export interface AppVersion {
  version: string;
  versionCode: number;
  platform: 'android' | 'ios';
  updateType: 'silent' | 'forced' | 'normal';
  updateLog?: string;
  wgtUrl?: string;
  pkgUrl?: string;
  publishTime: number;
}

const APP_VERSION_KEY = 'app_version_info';
const VERSION_FILE_PATH = path.join(process.cwd(), 'data', 'app_version.json');

function ensureDataDir(): void {
  const dataDir = path.dirname(VERSION_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

async function getAppVersionInfo(): Promise<AppVersion | null> {
  try {
    if (fs.existsSync(VERSION_FILE_PATH)) {
      const content = fs.readFileSync(VERSION_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed) {
        return parsed as AppVersion;
      }
    }
  } catch (e) {
    console.error('[AppUpdate] get version info from file failed:', e);
  }

  try {
    const cached = await db.getCache(APP_VERSION_KEY);
    if (cached) {
      return cached as AppVersion;
    }
  } catch (e) {
    console.error('[AppUpdate] get version info from cache failed:', e);
  }
  return null;
}

async function setAppVersionInfo(info: AppVersion): Promise<void> {
  try {
    ensureDataDir();
    fs.writeFileSync(VERSION_FILE_PATH, JSON.stringify(info, null, 2), 'utf-8');
    console.log('[AppUpdate] version info saved to file:', VERSION_FILE_PATH);
  } catch (e) {
    console.error('[AppUpdate] set version info to file failed:', e);
  }

  try {
    await db.setCache(APP_VERSION_KEY, info);
  } catch (e) {
    console.error('[AppUpdate] set version info to cache failed:', e);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'android';
  const currentVersionCode = parseInt(searchParams.get('versionCode') || '0', 10);
  const currentVersion = searchParams.get('version') || '1.0.0';

  console.log('[AppUpdate] check update:', {
    platform,
    currentVersionCode,
    currentVersion,
  });

  try {
    const versionInfo = await getAppVersionInfo();

    if (!versionInfo) {
      return NextResponse.json({
        success: true,
        hasUpdate: false,
        message: 'No version info configured',
      });
    }

    const hasUpdate = versionInfo.versionCode > currentVersionCode;

    if (!hasUpdate) {
      return NextResponse.json({
        success: true,
        hasUpdate: false,
        message: 'Already up to date',
        currentVersion: versionInfo.version,
      });
    }

    return NextResponse.json({
      success: true,
      hasUpdate: true,
      updateType: versionInfo.updateType,
      version: versionInfo.version,
      versionCode: versionInfo.versionCode,
      updateLog: versionInfo.updateLog,
      wgtUrl: versionInfo.wgtUrl,
      pkgUrl: versionInfo.pkgUrl,
      publishTime: versionInfo.publishTime,
    });
  } catch (error) {
    console.error('[AppUpdate] check update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Check update failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      version,
      versionCode,
      platform,
      updateType,
      updateLog,
      wgtUrl,
      pkgUrl,
    } = body;

    if (!version || !versionCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: version, versionCode',
        },
        { status: 400 }
      );
    }

    const versionInfo: AppVersion = {
      version,
      versionCode: parseInt(versionCode, 10),
      platform: platform || 'android',
      updateType: updateType || 'normal',
      updateLog: updateLog || '',
      wgtUrl: wgtUrl || '',
      pkgUrl: pkgUrl || '',
      publishTime: Date.now(),
    };

    await setAppVersionInfo(versionInfo);

    console.log('[AppUpdate] version info saved:', versionInfo);

    return NextResponse.json({
      success: true,
      message: 'Version info saved successfully',
      data: versionInfo,
    });
  } catch (error) {
    console.error('[AppUpdate] save version info error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Save version info failed',
      },
      { status: 500 }
    );
  }
}
