import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

const APP_VERSION_KEY = 'app_version_info';
const APP_WGT_PREFIX = 'app_wgt_';

async function getAppVersionInfo() {
  try {
    const cached = await db.getCache(APP_VERSION_KEY);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.error('[AppUpdate] get version info failed:', e);
  }
  return null;
}

async function getWgtList() {
  try {
    // 获取所有 wgt 文件列表
    const versionInfo = await getAppVersionInfo();
    if (!versionInfo) return [];
    
    const platform = versionInfo.platform || 'android';
    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionInfo.versionCode}`;
    const wgtData = await db.getCache(cacheKey);
    
    if (wgtData) {
      return [{
        fileName: wgtData.fileName,
        version: wgtData.version,
        versionCode: wgtData.versionCode,
        platform: wgtData.platform,
        size: wgtData.size,
        uploadTime: wgtData.uploadTime,
      }];
    }
    return [];
  } catch (e) {
    console.error('[AppUpdate] get wgt list failed:', e);
    return [];
  }
}

export async function GET() {
  const versionInfo = await getAppVersionInfo();
  const wgtList = await getWgtList();
  
  return NextResponse.json({
    success: true,
    data: {
      versionInfo,
      wgtList,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'android';
  const versionCode = searchParams.get('versionCode');
  
  if (!versionCode) {
    return NextResponse.json({ success: false, error: 'Missing versionCode' }, { status: 400 });
  }
  
  try {
    const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
    await db.deleteCache(cacheKey);
    
    return NextResponse.json({ success: true, message: 'WGT file deleted' });
  } catch (e) {
    console.error('[AppUpdate] delete wgt failed:', e);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
