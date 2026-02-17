/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { PointsService } from '@/lib/invitation-points';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/points/balance] 开始处理请求');
    const authInfo = getAuthInfoFromCookie(request);
    console.log('[API /api/points/balance] authInfo:', authInfo);

    if (!authInfo?.username) {
      console.log('[API /api/points/balance] 未授权');
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      );
    }

    const balance = await PointsService.getUserBalance(authInfo.username);
    console.log('[API /api/points/balance] 获取到余额:', balance);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('[API /api/points/balance] 获取积分余额失败:', error);
    return NextResponse.json({ error: '获取积分余额失败' }, { status: 500 });
  }
}
