/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// GET - 获取注册配置（公开接口，用于前端判断是否显示卡密输入项）
export async function GET() {
  try {
    const config = await getConfig();

    const allowRegister = config.UserConfig?.AllowRegister !== false;
    const cardKeyConfig = config.CardKeyConfig || {
      enabled: false,
      requireCardKeyOnRegister: true,
    };

    const cardKeyEnabled = cardKeyConfig.enabled === true;
    const systemMode = cardKeyConfig.systemMode || 'operation';
    const requireCardKeyOnRegister =
      cardKeyConfig.requireCardKeyOnRegister !== false;

    const showCardKeyInput =
      cardKeyEnabled && requireCardKeyOnRegister && systemMode === 'operation';

    return NextResponse.json({
      allowRegister,
      cardKeyEnabled,
      systemMode,
      showCardKeyInput,
    });
  } catch (error) {
    console.error('获取注册配置失败:', error);
    return NextResponse.json({ error: '获取注册配置失败' }, { status: 500 });
  }
}
