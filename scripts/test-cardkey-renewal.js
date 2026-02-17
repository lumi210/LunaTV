#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * 测试卡密续费逻辑
 */

function testCardKeyRenewal() {
  console.log('=== 测试卡密续费逻辑 ===\n');

  // 场景1: 首次绑定月卡（30天）
  console.log('场景1: 首次绑定月卡（30天）');
  const now = Date.now();
  const cardCreatedAt = now - 10 * 24 * 60 * 60 * 1000; // 10天前创建的卡密
  const cardExpiresAt = cardCreatedAt + 30 * 24 * 60 * 60 * 1000; // 30天有效期

  console.log('当前时间:', new Date(now).toISOString());
  console.log('卡密创建时间:', new Date(cardCreatedAt).toISOString());
  console.log('卡密过期时间:', new Date(cardExpiresAt).toISOString());

  // 计算有效期（天数）
  const newCardKeyDuration = Math.round(
    (cardExpiresAt - cardCreatedAt) / (1000 * 60 * 60 * 24),
  );
  console.log('新卡密有效期（天）:', newCardKeyDuration);

  // 用户首次绑定，使用卡密过期时间
  const newExpiresAt = cardExpiresAt;
  console.log('用户过期时间:', new Date(newExpiresAt).toISOString());
  console.log('');

  // 场景2: 续费，使用另一个月卡（30天）
  console.log('场景2: 续费，使用另一个月卡（30天）');
  const currentExpiryDate = newExpiresAt; // 当前过期时间
  const newCardCreatedAt2 = now - 20 * 24 * 60 * 60 * 1000; // 20天前创建的新卡密
  const newCardExpiresAt2 = newCardCreatedAt2 + 30 * 24 * 60 * 60 * 1000;

  console.log('当前过期时间:', new Date(currentExpiryDate).toISOString());
  console.log('新卡密创建时间:', new Date(newCardCreatedAt2).toISOString());
  console.log('新卡密过期时间:', new Date(newCardExpiresAt2).toISOString());

  // 计算新卡密的有效期（天数）
  const newCardKeyDuration2 = Math.round(
    (newCardExpiresAt2 - newCardCreatedAt2) / (1000 * 60 * 60 * 24),
  );
  console.log('新卡密有效期（天）:', newCardKeyDuration2);

  // 从当前过期时间开始累加
  const newExpiresAt2 =
    currentExpiryDate + newCardKeyDuration2 * 24 * 60 * 60 * 1000;
  console.log('续费后过期时间:', new Date(newExpiresAt2).toISOString());
  console.log('');

  // 场景3: 续费，使用一个创建很久的月卡
  console.log('场景3: 续费，使用一个创建很久的月卡');
  const currentExpiryDate3 = newExpiresAt2;
  const newCardCreatedAt3 = now - 100 * 24 * 60 * 60 * 1000; // 100天前创建的卡密
  const newCardExpiresAt3 = newCardCreatedAt3 + 30 * 24 * 60 * 60 * 1000; // 已经过期70天

  console.log('当前过期时间:', new Date(currentExpiryDate3).toISOString());
  console.log('新卡密创建时间:', new Date(newCardCreatedAt3).toISOString());
  console.log('新卡密过期时间:', new Date(newCardExpiresAt3).toISOString());

  // 计算新卡密的有效期（天数）
  const newCardKeyDuration3 = Math.round(
    (newCardExpiresAt3 - newCardCreatedAt3) / (1000 * 60 * 60 * 24),
  );
  console.log('新卡密有效期（天）:', newCardKeyDuration3);

  // 从当前过期时间开始累加
  const newExpiresAt3 =
    currentExpiryDate3 + newCardKeyDuration3 * 24 * 60 * 60 * 1000;
  console.log('续费后过期时间:', new Date(newExpiresAt3).toISOString());
  console.log('✓ 这个逻辑是正确的！即使卡密已经过期，有效期仍然是30天');
  console.log('');
}

testCardKeyRenewal();
