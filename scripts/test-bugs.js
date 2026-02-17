#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * 详细测试卡密到期时间和观看记录保存
 */

const path = require('path');

async function testCardKeyDisplay() {
  console.log('=== 测试卡密到期时间显示 ===\n');

  // 模拟一个 UserCardKeyData
  const userCardKeyInfo = {
    boundKey: 'abc123',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天后过期
    boundAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前绑定
  };

  // 模拟卡密明文
  const cardKey = {
    key: 'TEST-CARD-KEY-12345',
    keyHash: 'abc123',
  };

  // 计算剩余天数（与 getFullUserCardKey 相同的逻辑）
  const now = Date.now();
  const daysRemaining = Math.max(
    0,
    Math.ceil((userCardKeyInfo.expiresAt - now) / (1000 * 60 * 60 * 24)),
  );
  const isExpired = userCardKeyInfo.expiresAt < now;
  const isExpiring = !isExpired && daysRemaining <= 30;

  console.log('测试数据:');
  console.log('  当前时间:', new Date(now).toISOString());
  console.log('  过期时间:', new Date(userCardKeyInfo.expiresAt).toISOString());
  console.log('  绑定时间:', new Date(userCardKeyInfo.boundAt).toISOString());
  console.log('');
  console.log('计算结果:');
  console.log('  daysRemaining:', daysRemaining);
  console.log('  isExpired:', isExpired);
  console.log('  isExpiring:', isExpiring);
  console.log('');

  // 模拟返回的结果
  const result = {
    plainKey: cardKey.key,
    boundKey: userCardKeyInfo.boundKey,
    expiresAt: userCardKeyInfo.expiresAt,
    boundAt: userCardKeyInfo.boundAt,
    daysRemaining,
    isExpiring,
    isExpired,
  };

  console.log('返回结果:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  // 测试格式化日期
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
  }

  console.log('前端显示:');
  console.log('  过期时间:', formatDate(result.expiresAt));
  console.log('  剩余天数:', result.daysRemaining, '天');
  console.log(
    '  状态:',
    result.isExpired ? '已过期' : result.isExpiring ? '即将过期' : '正常',
  );
}

async function testWatchRecordSave() {
  console.log('\n=== 测试观看记录保存 ===\n');

  // 模拟播放记录
  const record = {
    title: '测试动画',
    source_name: 'test',
    year: '2024',
    cover: 'https://example.com/cover.jpg',
    index: 5,
    total_episodes: 24,
    original_episodes: 24,
    play_time: 1200,
    total_time: 1440,
    save_time: Date.now(),
  };

  console.log('测试数据:');
  console.log(JSON.stringify(record, null, 2));
  console.log('');

  // 模拟 API 请求
  const key = 'test+123';

  console.log('发送请求到 /api/playrecords');
  console.log('  请求体:', JSON.stringify({ key, record }));
  console.log('');

  // 模拟响应
  const successResponse = { success: true };
  const failureResponse = { error: '保存失败' };

  console.log('成功响应:', JSON.stringify(successResponse));
  console.log('失败响应:', JSON.stringify(failureResponse));
  console.log('');

  // 测试错误处理逻辑
  function checkResponse(response) {
    if (!response.success) {
      throw new Error('保存播放记录失败: 服务器返回错误');
    }
    console.log('✓ 响应成功');
  }

  try {
    checkResponse(successResponse);
    console.log('✓ 成功处理成功响应');
  } catch (error) {
    console.log('✗ 错误:', error.message);
  }

  try {
    checkResponse(failureResponse);
    console.log('✗ 不应该到达这里');
  } catch (error) {
    console.log('✓ 正确捕获错误:', error.message);
  }
}

async function main() {
  await testCardKeyDisplay();
  await testWatchRecordSave();
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);
