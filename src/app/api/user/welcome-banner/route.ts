/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardKeyService } from '@/lib/cardkey';

export const runtime = 'nodejs';

// 欢迎栏信息响应接口
interface WelcomeBannerInfo {
  type: 'promotion_expiring' | 'normal_expiration' | 'no_cardkey' | 'admin';
  message: string;
  expirationDate?: string;
  daysRemaining?: number;
  actionText?: string;
  actionUrl?: string;
  urgency: 'low' | 'medium' | 'high';
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/user/welcome-banner 开始 ===');
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

    if (storageType === 'localstorage') {
      return NextResponse.json({ error: '不支持本地存储' }, { status: 400 });
    }

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      console.log('用户未登录');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authInfo.username;
    console.log('username:', username);

    const config = await db.getAdminConfig();
    const user = config.UserConfig.Users.find((u) => u.username === username);

    if (!user) {
      console.log('用户不存在');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || user.role === 'owner';

    if (isAdmin) {
      console.log('管理员用户，不显示卡密信息');
      const adminInfo: WelcomeBannerInfo = {
        type: 'admin',
        message: `欢迎回来，管理员 ${username}`,
        urgency: 'low',
      };
      return NextResponse.json(adminInfo, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const cardKeyInfo = await cardKeyService.getUserCardKey(username);
    console.log('cardKeyInfo:', JSON.stringify(cardKeyInfo, null, 2));

    if (!cardKeyInfo) {
      console.log('用户没有绑定卡密');
      const noCardKeyInfo: WelcomeBannerInfo = {
        type: 'no_cardkey',
        message: '账户将于7日后到期',
        daysRemaining: 7,
        urgency: 'medium',
        actionText: '推荐好友注册',
        actionUrl: '/settings',
      };
      return NextResponse.json(noCardKeyInfo, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const isPromotionUser = cardKeyInfo.source === 'promotion_register';
    console.log(
      'isPromotionUser:',
      isPromotionUser,
      'source:',
      cardKeyInfo.source,
    );

    const now = Date.now();
    const daysRemaining = Math.ceil(
      (cardKeyInfo.expiresAt - now) / (1000 * 60 * 60 * 24),
    );

    const expirationDate = new Date(cardKeyInfo.expiresAt);
    const formattedDate = expirationDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    let bannerInfo: WelcomeBannerInfo;

    if (isPromotionUser) {
      console.log('推广模式用户');
      if (daysRemaining <= 0) {
        console.log('卡密已过期');
        bannerInfo = {
          type: 'promotion_expiring',
          message: '卡密已过期',
          expirationDate: formattedDate,
          daysRemaining: 0,
          urgency: 'high',
          actionText: '推荐好友注册',
          actionUrl: '/settings',
        };
      } else {
        console.log('推广用户');
        bannerInfo = {
          type: 'promotion_expiring',
          message: `卡密到期日期: ${formattedDate}`,
          expirationDate: formattedDate,
          daysRemaining,
          urgency:
            daysRemaining <= 7
              ? 'high'
              : daysRemaining <= 30
                ? 'medium'
                : 'low',
          actionText: '推荐好友注册',
          actionUrl: '/settings',
        };
      }
    } else {
      console.log('普通用户');
      if (daysRemaining <= 0) {
        console.log('卡密已过期');
        bannerInfo = {
          type: 'normal_expiration',
          message: '卡密已过期，请绑定新卡密',
          urgency: 'high',
        };
      } else if (daysRemaining === 1) {
        console.log('卡密今日到期');
        bannerInfo = {
          type: 'normal_expiration',
          message: '卡密今日到期',
          expirationDate: formattedDate,
          daysRemaining,
          urgency: 'high',
        };
      } else {
        console.log('普通用户正常');
        bannerInfo = {
          type: 'normal_expiration',
          message: `卡密到期日期: ${formattedDate}`,
          expirationDate: formattedDate,
          daysRemaining,
          urgency: daysRemaining <= 30 ? 'medium' : 'low',
        };
      }
    }

    console.log('返回欢迎栏信息:', JSON.stringify(bannerInfo, null, 2));
    return NextResponse.json(bannerInfo, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('获取欢迎栏信息失败:', error);
    console.error('错误堆栈:', (error as Error).stack);
    return NextResponse.json(
      {
        error: '获取欢迎栏信息失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
