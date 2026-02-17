/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

    if (storageType === 'localstorage') {
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;

    const userCardKeys = await db.getUserCardKeys(username);

    const allCardKeys = await db.getAllCardKeys();

    const now = Date.now();
    const redeemedCardKeys = userCardKeys
      .filter((uck) => uck.source === 'redeem')
      .map((uck) => {
        const fullCardKey = allCardKeys.find(
          (ck) => ck.keyHash === uck.keyHash,
        );
        const daysRemaining = Math.max(
          0,
          Math.ceil((uck.expiresAt - now) / (1000 * 60 * 60 * 24)),
        );

        return {
          id: uck.id,
          plainKey: fullCardKey?.key || '',
          type: uck.type,
          status: uck.status,
          source: uck.source,
          createdAt: uck.createdAt,
          expiresAt: uck.expiresAt,
          daysRemaining,
          isExpired: uck.expiresAt < now,
        };
      });

    return NextResponse.json(
      { cardKeys: redeemedCardKeys },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('获取已兑换卡密列表失败:', error);
    return NextResponse.json(
      {
        error: '获取已兑换卡密列表失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
