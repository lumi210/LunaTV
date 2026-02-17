#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * 检查实际数据库中的卡密数据
 */

const { createStorage } = require('../src/lib/db');
const { cardKeyService } = require('../src/lib/cardkey');

async function checkCardKeyData() {
  console.log('=== 检查数据库中的卡密数据 ===\n');

  const db = createStorage();

  try {
    // 获取所有用户
    const allUsers = await db.getAllUsers();
    console.log('用户列表:', allUsers);
    console.log('');

    // 检查每个用户的卡密信息
    for (const username of allUsers) {
      console.log(`用户: ${username}`);

      // 获取卡密信息
      const cardKeyInfo = await db.getUserCardKeyInfo(username);
      if (cardKeyInfo) {
        console.log('  卡密信息:');
        console.log('    boundKey:', cardKeyInfo.boundKey);
        console.log('    expiresAt:', cardKeyInfo.expiresAt);
        console.log(
          '    expiresAt (日期):',
          new Date(cardKeyInfo.expiresAt).toISOString(),
        );
        console.log('    boundAt:', cardKeyInfo.boundAt);
        console.log(
          '    boundAt (日期):',
          new Date(cardKeyInfo.boundAt).toISOString(),
        );

        // 计算剩余天数
        const now = Date.now();
        const daysRemaining = Math.max(
          0,
          Math.ceil((cardKeyInfo.expiresAt - now) / (1000 * 60 * 60 * 24)),
        );
        console.log('    剩余天数:', daysRemaining);

        // 使用 cardKeyService 获取完整信息
        const fullInfo = await cardKeyService.getUserCardKey(username);
        if (fullInfo) {
          console.log('  完整卡密信息:');
          console.log('    plainKey:', fullInfo.plainKey);
          console.log('    daysRemaining:', fullInfo.daysRemaining);
          console.log('    isExpired:', fullInfo.isExpired);
          console.log('    isExpiring:', fullInfo.isExpiring);
        } else {
          console.log('  无法获取完整卡密信息');
        }
      } else {
        console.log('  未绑定卡密');
      }

      console.log('');
    }

    console.log('=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    // 关闭数据库连接（如果需要）
    if (db && db.close) {
      await db.close();
    }
  }
}

checkCardKeyData().catch(console.error);
