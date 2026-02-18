/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig, updateConfig } from '@/lib/config';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

// GET - 获取系统模式和推广卡密类型配置
export async function GET(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    if (storageType === 'localstorage') {
      return NextResponse.json(
        { error: '不支持本地存储进行卡密管理' },
        { status: 400 },
      );
    }

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    const config = await getConfig();

    let isAdmin = false;
    if (username === process.env.USERNAME) {
      isAdmin = true;
    } else {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (user && user.role === 'admin' && !user.banned) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 401 });
    }

    const cardKeyConfig = config.CardKeyConfig || {
      enabled: false,
      requireCardKeyOnRegister: true,
    };

    const systemMode = cardKeyConfig.systemMode || 'operation';
    const promotionCardKeyType = cardKeyConfig.promotionCardKeyType || 'week';

    const promotionStats = await cardKeyService.getPromotionStats();

    return NextResponse.json({
      systemMode,
      promotionCardKeyType,
      promotionStats,
    });
  } catch (error) {
    console.error('获取系统模式配置失败:', error);
    return NextResponse.json(
      { error: '获取系统模式配置失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}

// POST - 设置系统模式和推广卡密类型
export async function POST(request: NextRequest) {
  try {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    if (storageType === 'localstorage') {
      return NextResponse.json(
        { error: '不支持本地存储进行卡密管理' },
        { status: 400 },
      );
    }

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    const config = await getConfig();

    let isAdmin = false;
    if (username === process.env.USERNAME) {
      isAdmin = true;
    } else {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (user && user.role === 'admin' && !user.banned) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 401 });
    }

    const body = await request.json();
    const { systemMode, promotionCardKeyType } = body;

    if (systemMode && !['promotion', 'operation'].includes(systemMode)) {
      return NextResponse.json({ error: '系统模式无效' }, { status: 400 });
    }

    if (
      promotionCardKeyType &&
      !['year', 'quarter', 'month', 'week'].includes(promotionCardKeyType)
    ) {
      return NextResponse.json({ error: '卡密类型无效' }, { status: 400 });
    }

    const existingCardKeyConfig = config.CardKeyConfig || {
      enabled: false,
      requireCardKeyOnRegister: true,
    };

    const newCardKeyConfig = {
      ...existingCardKeyConfig,
      ...(systemMode && { systemMode }),
      ...(promotionCardKeyType && { promotionCardKeyType }),
    };

    config.CardKeyConfig = newCardKeyConfig;

    await updateConfig(config);
    clearConfigCache();

    console.log(
      `系统模式已更新: ${newCardKeyConfig.systemMode || 'operation'}, 推广卡密类型: ${newCardKeyConfig.promotionCardKeyType || 'week'}`,
    );

    const promotionStats = await cardKeyService.getPromotionStats();

    return NextResponse.json({
      success: true,
      systemMode: newCardKeyConfig.systemMode || 'operation',
      promotionCardKeyType: newCardKeyConfig.promotionCardKeyType || 'week',
      promotionStats,
    });
  } catch (error) {
    console.error('设置系统模式失败:', error);
    return NextResponse.json(
      { error: '设置系统模式失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
