/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { db } from './db';
import {
  BindCardKeyRequest,
  BindCardKeyResponse,
  CardKey,
  CardKeySource,
  CardKeyType,
  CardKeyValidationResult,
  CreateCardKeyRequest,
  CreateCardKeyResponse,
  UserCardKeyInfo,
} from './types';

// 卡密有效期配置（天数）
const CARD_KEY_DURATION = {
  year: 365,
  quarter: 90,
  month: 30,
  week: 7,
};

export class CardKeyService {
  // 创建卡密
  async createCardKey(
    type: CardKeyType,
    count: number = 1,
    source: CardKeySource = 'admin_created',
  ): Promise<CreateCardKeyResponse> {
    const keys: string[] = [];

    for (let i = 0; i < count; i++) {
      const plainKey = this.generateRandomCardKey();
      const hashedKey = await this.hashCardKey(plainKey);

      const cardKey: CardKey = {
        key: plainKey, // 保存明文卡密
        keyHash: hashedKey, // 保存哈希用于验证
        keyType: type,
        status: 'unused',
        createdAt: Date.now(),
        expiresAt: this.calculateExpiryDate(type),
        source,
      };

      await db.createCardKey(cardKey);
      keys.push(plainKey);
    }

    return {
      keys,
      totalCount: keys.length,
      type,
    };
  }

  // 验证卡密有效性
  async validateCardKey(cardKey: string): Promise<CardKeyValidationResult> {
    const hashedKey = await this.hashCardKey(cardKey);

    // 由于我们现在使用 keyHash 作为查找键，需要查找所有卡密
    // 先获取所有卡密，然后匹配 keyHash
    const allCardKeys = await db.getAllCardKeys();
    const storedCardKey = allCardKeys.find((ck) => ck.keyHash === hashedKey);

    if (!storedCardKey) {
      return {
        valid: false,
        error: '卡密无效或不存在',
      };
    }

    if (storedCardKey.status === 'used') {
      return {
        valid: false,
        error: '卡密已被使用',
      };
    }

    if (storedCardKey.status === 'expired') {
      return {
        valid: false,
        error: '卡密已过期',
      };
    }

    const now = Date.now();
    if (storedCardKey.expiresAt < now) {
      // 自动标记为已过期
      await db.updateCardKey(storedCardKey.keyHash, { status: 'expired' });
      return {
        valid: false,
        error: '卡密已过期',
      };
    }

    return {
      valid: true,
      cardKey: storedCardKey,
    };
  }

  // 绑定卡密到用户
  async bindCardKeyToUser(
    cardKey: string,
    username: string,
  ): Promise<{ success: boolean; error?: string }> {
    console.log('=== 开始绑定卡密 ===');
    console.log('username:', username);
    console.log('cardKey:', cardKey);

    // 确保用户存在于 users 表
    await this.ensureUserExists(username);

    // 验证卡密
    const validation = await this.validateCardKey(cardKey);
    console.log('验证结果:', validation);

    if (!validation.valid || !validation.cardKey) {
      console.log('卡密验证失败');
      return {
        success: false,
        error: validation.error || '卡密验证失败',
      };
    }

    const hashedKey = validation.cardKey.keyHash;
    console.log('keyHash:', hashedKey);

    // 获取用户当前卡密信息
    const currentCardKeyInfo = await db.getUserCardKeyInfo(username);
    console.log('用户当前卡密信息:', currentCardKeyInfo);

    // 计算新的过期时间
    let newExpiresAt = validation.cardKey.expiresAt;
    let isNewCardKey = !currentCardKeyInfo;

    if (currentCardKeyInfo) {
      // 用户已有卡密，计算新卡密的额外天数
      const currentExpiryDate = currentCardKeyInfo.expiresAt;
      const newCardKeyExpiryDate = validation.cardKey.expiresAt;
      const newCardKeyCreatedAt = validation.cardKey.createdAt;

      console.log(
        '当前过期时间:',
        new Date(currentExpiryDate).toLocaleString('zh-CN'),
      );
      console.log(
        '新卡密过期时间:',
        new Date(newCardKeyExpiryDate).toLocaleString('zh-CN'),
      );
      console.log(
        '新卡密创建时间:',
        new Date(newCardKeyCreatedAt).toLocaleString('zh-CN'),
      );

      // 计算新卡密的有效期（天数）
      const newCardKeyDuration = Math.round(
        (newCardKeyExpiryDate - newCardKeyCreatedAt) / (1000 * 60 * 60 * 24),
      );
      console.log('新卡密有效期（天）:', newCardKeyDuration);

      // 如果当前卡密已过期，从现在开始累加；否则从当前过期时间开始累加
      const baseTime =
        currentExpiryDate < Date.now() ? Date.now() : currentExpiryDate;
      newExpiresAt = baseTime + newCardKeyDuration * 24 * 60 * 60 * 1000;

      console.log('累加基数:', new Date(baseTime).toLocaleString('zh-CN'));
      console.log(
        `绑定卡密 - 用户已有卡密，累加时间: ${newCardKeyDuration}天，新过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`,
      );
    } else {
      console.log(
        `绑定卡密 - 用户新绑定，过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`,
      );
    }

    // 更新卡密状态为已使用
    console.log('更新卡密状态为已使用，keyHash:', hashedKey);
    await db.updateCardKey(hashedKey, {
      status: 'used',
      boundTo: username,
      boundAt: Date.now(),
    });

    // 检查是否已有该卡密对应的用户卡密记录（积分兑换的卡密）
    const existingUserCardKeys = await db.getUserCardKeys(username);
    const existingCardKeyRecord = existingUserCardKeys.find(
      (k) => k.keyHash === hashedKey,
    );

    if (existingCardKeyRecord) {
      // 更新已存在的卡密记录状态为已使用，并更新过期时间
      await db.updateUserCardKey(existingCardKeyRecord.id, {
        status: 'used',
        expiresAt: newExpiresAt,
      });
      console.log('更新用户卡密记录状态和过期时间:', existingCardKeyRecord.id);
    } else {
      // 创建新的用户卡密记录
      const userCardKeyId = this.generateUUID();
      const cardKeySource = validation.cardKey!.source;
      // 将 CardKeySource 转换为 UserCardKey.source 允许的类型
      const userCardKeySource:
        | 'invitation'
        | 'redeem'
        | 'manual'
        | 'promotion_register' =
        cardKeySource === 'admin_created' || cardKeySource === 'points_redeem'
          ? 'manual'
          : (cardKeySource as
              | 'invitation'
              | 'redeem'
              | 'manual'
              | 'promotion_register') || 'redeem';

      const userCardKey: import('./types').UserCardKey = {
        id: userCardKeyId,
        keyHash: hashedKey,
        username: username,
        type: validation.cardKey!.keyType,
        status: 'used',
        source: userCardKeySource,
        createdAt: Date.now(),
        expiresAt: newExpiresAt,
      };
      await db.addUserCardKey(userCardKey);
      console.log('创建用户卡密记录:', userCardKeyId);
    }

    // 检查是否有其他活跃的卡密记录需要更新过期时间
    const existingActive = existingUserCardKeys.find(
      (k) =>
        k.status === 'used' &&
        k.keyHash !== hashedKey &&
        k.expiresAt > Date.now(),
    );

    if (existingActive) {
      // 更新现有记录的过期时间
      await db.updateUserCardKey(existingActive.id, {
        expiresAt: newExpiresAt,
      });
      console.log('更新其他活跃卡密记录过期时间:', existingActive.id);
    }

    // 更新用户卡密信息（admin_configs）
    const userCardKeyInfo: import('./admin.types').UserCardKeyData = {
      boundKey: hashedKey,
      expiresAt: newExpiresAt,
      boundAt: Date.now(),
    };
    console.log('准备更新用户卡密信息:', userCardKeyInfo);
    await db.updateUserCardKeyInfo(username, userCardKeyInfo);

    console.log('=== 卡密绑定完成 ===');
    return { success: true };
  }

  // 获取用户卡密信息
  async getUserCardKey(username: string): Promise<UserCardKeyInfo | null> {
    return await db.getUserCardKey(username);
  }

  // 检查用户卡密是否过期
  async isUserCardKeyExpired(username: string): Promise<boolean> {
    return await db.isUserCardKeyExpired(username);
  }

  // 获取所有卡密列表（管理员）
  async getAllCardKeys(): Promise<CardKey[]> {
    return await db.getAllCardKeys();
  }

  // 删除未使用的卡密
  async deleteUnusedCardKey(cardKeyHash: string): Promise<boolean> {
    try {
      await db.deleteCardKey(cardKeyHash);
      return true;
    } catch (error) {
      console.error('删除卡密失败:', error);
      return false;
    }
  }

  // 清理过期的未使用卡密
  async cleanupExpiredCardKeys(): Promise<number> {
    try {
      const allCardKeys = await db.getAllCardKeys();
      const now = Date.now();
      let cleanedCount = 0;

      for (const cardKey of allCardKeys) {
        if (cardKey.status === 'unused' && cardKey.expiresAt < now) {
          // 标记为已过期
          await db.updateCardKey(cardKey.key, { status: 'expired' });
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('清理过期卡密失败:', error);
      return 0;
    }
  }

  // 导出卡密列表
  async exportCardKeys(): Promise<string> {
    const cardKeys = await db.getAllCardKeys();

    // CSV 格式
    const headers = [
      '密钥哈希',
      '类型',
      '状态',
      '创建时间',
      '过期时间',
      '绑定用户',
      '绑定时间',
    ];
    const rows = cardKeys.map((ck) => [
      ck.key,
      ck.keyType,
      ck.status,
      new Date(ck.createdAt).toISOString(),
      new Date(ck.expiresAt).toISOString(),
      ck.boundTo || '',
      ck.boundAt ? new Date(ck.boundAt).toISOString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    return csvContent;
  }

  // 计算卡密过期时间
  calculateExpiryDate(type: CardKeyType): number {
    const days = CARD_KEY_DURATION[type];
    const msPerDay = 1000 * 60 * 60 * 24;
    return Date.now() + days * msPerDay;
  }

  // 生成 UUID
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // 确保用户存在于 users 表
  async ensureUserExists(username: string): Promise<void> {
    const ownerUser = process.env.USERNAME;
    const role = username === ownerUser ? 'owner' : 'user';

    // 检查用户是否存在（使用 V2 版本，检查新版本的用户存储位置）
    const existsV2 = await db.checkUserExistV2(username);
    // 也检查旧版本（兼容性）
    const existsV1 = await db.checkUserExist(username);

    if (!existsV2 && !existsV1) {
      // 创建用户（空密码，用户需要通过其他方式设置密码）
      await db.registerUser(username, '');
      console.log(`[CardKeyService] 自动创建用户: ${username}, 角色: ${role}`);
    }
  }

  // 生成随机卡密（明文）
  generateRandomCardKey(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 16;
    let result = '';

    // 使用 crypto.getRandomValues 生成安全的随机数
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }

    return result;
  }

  // 哈希卡密
  async hashCardKey(cardKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(cardKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 验证卡密哈希
  async verifyCardKeyHash(cardKey: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashCardKey(cardKey);
    return computedHash === hash;
  }

  // 生成推广卡密并绑定到用户
  async generateAndBindPromotionCardKey(
    username: string,
    cardKeyType: CardKeyType,
  ): Promise<{ success: boolean; cardKey?: CardKey; error?: string }> {
    console.log('=== 开始生成推广卡密 ===');
    console.log('username:', username);
    console.log('cardKeyType:', cardKeyType);

    try {
      // 确保用户存在于 users 表
      await this.ensureUserExists(username);

      // 生成推广卡密
      const plainKey = this.generateRandomCardKey();
      const hashedKey = await this.hashCardKey(plainKey);
      const now = Date.now();

      const cardKey: CardKey = {
        key: plainKey,
        keyHash: hashedKey,
        keyType: cardKeyType,
        status: 'used', // 直接标记为已使用
        createdAt: now,
        expiresAt: this.calculateExpiryDate(cardKeyType),
        boundTo: username,
        boundAt: now,
        source: 'promotion_register',
      };

      // 保存卡密到数据库
      await db.createCardKey(cardKey);
      console.log('推广卡密已创建:', hashedKey);

      // 获取用户当前卡密信息
      const currentCardKeyInfo = await db.getUserCardKeyInfo(username);
      console.log('用户当前卡密信息:', currentCardKeyInfo);

      // 计算新的过期时间
      let newExpiresAt = cardKey.expiresAt;

      if (currentCardKeyInfo) {
        // 用户已有卡密，累加时间
        const baseTime =
          currentCardKeyInfo.expiresAt < now
            ? now
            : currentCardKeyInfo.expiresAt;
        const daysToAdd = CARD_KEY_DURATION[cardKeyType];
        newExpiresAt = baseTime + daysToAdd * 24 * 60 * 60 * 1000;
        console.log(
          `推广卡密 - 用户已有卡密，累加时间: ${daysToAdd}天，新过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`,
        );
      } else {
        console.log(
          `推广卡密 - 用户新绑定，过期时间: ${new Date(newExpiresAt).toLocaleString('zh-CN')}`,
        );
      }

      // 生成用户卡密记录 ID
      const userCardKeyId = this.generateUUID();

      // 创建用户卡密记录
      const userCardKey: import('./types').UserCardKey = {
        id: userCardKeyId,
        keyHash: hashedKey,
        username: username,
        type: cardKeyType,
        status: 'used',
        source: 'promotion_register',
        createdAt: now,
        expiresAt: newExpiresAt,
      };

      // 检查是否已有用户卡密记录
      const existingUserCardKeys = await db.getUserCardKeys(username);
      const existingActive = existingUserCardKeys.find(
        (k) => k.status === 'used' && k.expiresAt > now,
      );

      if (existingActive) {
        await db.updateUserCardKey(existingActive.id, {
          expiresAt: newExpiresAt,
        });
        console.log('更新用户卡密记录过期时间:', existingActive.id);
      } else {
        await db.addUserCardKey(userCardKey);
        console.log('创建用户卡密记录:', userCardKeyId);
      }

      // 更新用户卡密信息（admin_configs）
      const userCardKeyInfo: import('./admin.types').UserCardKeyData = {
        boundKey: hashedKey,
        expiresAt: newExpiresAt,
        boundAt: now,
      };
      await db.updateUserCardKeyInfo(username, userCardKeyInfo);

      console.log('=== 推广卡密生成并绑定完成 ===');
      return { success: true, cardKey };
    } catch (error) {
      console.error('生成推广卡密失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成推广卡密失败',
      };
    }
  }

  // 获取推广模式统计
  async getPromotionStats(): Promise<{
    totalPromotionCardKeys: number;
    activePromotionCardKeys: number;
  }> {
    try {
      const allCardKeys = await db.getAllCardKeys();
      const now = Date.now();

      const promotionCardKeys = allCardKeys.filter(
        (ck) => ck.source === 'promotion_register',
      );
      const activePromotionCardKeys = promotionCardKeys.filter(
        (ck) => ck.status === 'used' && ck.expiresAt > now,
      );

      return {
        totalPromotionCardKeys: promotionCardKeys.length,
        activePromotionCardKeys: activePromotionCardKeys.length,
      };
    } catch (error) {
      console.error('获取推广统计失败:', error);
      return {
        totalPromotionCardKeys: 0,
        activePromotionCardKeys: 0,
      };
    }
  }
}

// 导出默认实例
export const cardKeyService = new CardKeyService();
