import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { db } from '@/lib/db';

const APP_VERSION_KEY = 'app_version_info';
const APP_WGT_PREFIX = 'app_wgt_';
const DATA_DIR = path.join(process.cwd(), 'data');
const VERSION_FILE_PATH = path.join(DATA_DIR, 'app_version.json');
const WGT_DIR = path.join(DATA_DIR, 'wgt');

async function getAppVersionInfo() {
  try {
    if (fs.existsSync(VERSION_FILE_PATH)) {
      const content = fs.readFileSync(VERSION_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[AppUpdate] get version info from file failed:', e);
  }

  try {
    const cached = await db.getCache(APP_VERSION_KEY);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.error('[AppUpdate] get version info from cache failed:', e);
  }
  return null;
}

async function getWgtList() {
  try {
    const versionInfo = await getAppVersionInfo();
    if (!versionInfo) return [];
    
    const platform = versionInfo.platform || 'android';
    const versionCode = versionInfo.versionCode;
    
    const wgtFiles: object[] = [];
    
    if (fs.existsSync(WGT_DIR)) {
      const files = fs.readdirSync(WGT_DIR);
      const targetFile = `lunauinapp_${versionInfo.version}_${platform}.wgt`;
      
      for (const file of files) {
        if (file === targetFile) {
          const filePath = path.join(WGT_DIR, file);
          const stats = fs.statSync(filePath);
          wgtFiles.push({
            fileName: file,
            version: versionInfo.version,
            versionCode: versionCode,
            platform: platform,
            size: stats.size,
            uploadTime: stats.mtimeMs,
          });
          break;
        }
      }
    }
    
    if (wgtFiles.length === 0) {
      const cacheKey = `${APP_WGT_PREFIX}${platform}_${versionCode}`;
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
    }
    
    return wgtFiles;
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
    try {
      await db.deleteCache(cacheKey);
    } catch (e) {
      console.error('[AppUpdate] delete from cache failed:', e);
    }
    
    if (fs.existsSync(WGT_DIR)) {
      const files = fs.readdirSync(WGT_DIR);
      for (const file of files) {
        if (file.includes(`_${platform}.wgt`) && file.includes(`_${versionCode}_`) === false) {
          const filePath = path.join(WGT_DIR, file);
          fs.unlinkSync(filePath);
          console.log('[AppUpdate] deleted WGT file:', filePath);
        }
      }
    }
    
    return NextResponse.json({ success: true, message: 'WGT file deleted' });
  } catch (e) {
    console.error('[AppUpdate] delete wgt failed:', e);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
