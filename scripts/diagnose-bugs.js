#!/usr/bin/env node

/* eslint-disable no-console */

const path = require('path');

// 简单的诊断脚本
async function diagnoseCardKeyIssue() {
  console.log('=== 诊断卡密到期时间显示问题 ===\n');

  // 1. 检查 redis-base.db.ts 中的 getFullUserCardKey 方法
  console.log('1. 检查 getFullUserCardKey 实现...');
  const dbPath = path.join(__dirname, '../src/lib/redis-base.db.ts');
  const fs = require('fs');

  if (fs.existsSync(dbPath)) {
    const content = fs.readFileSync(dbPath, 'utf8');

    // 检查是否有 daysRemaining 计算
    if (content.includes('daysRemaining = Math.max')) {
      console.log('✓ daysRemaining 计算存在');
    } else {
      console.log('✗ daysRemaining 计算缺失');
    }

    // 检查是否使用 userCardKeyInfo.expiresAt
    if (content.includes('userCardKeyInfo.expiresAt - now')) {
      console.log('✓ 使用正确的过期时间 (userCardKeyInfo.expiresAt)');
    } else {
      console.log('✗ 没有使用 userCardKeyInfo.expiresAt');
    }
  } else {
    console.log('✗ 文件不存在:', dbPath);
  }

  console.log('\n2. 检查 getUserCardKey 方法...');
  const dbManagerPath = path.join(__dirname, '../src/lib/db.ts');
  if (fs.existsSync(dbManagerPath)) {
    const content = fs.readFileSync(dbManagerPath, 'utf8');

    // 检查是否有 await
    const getFullUserCardKeyMatch = content.match(
      /getFullUserCardKey\(userName\)/,
    );
    const awaitGetFullUserCardKeyMatch = content.match(
      /await\s+\(this\.storage\s+as\s+any\)\.getFullUserCardKey\(userName\)/,
    );

    if (getFullUserCardKeyMatch && !awaitGetFullUserCardKeyMatch) {
      console.log('✗ 缺少 await 关键字');
    } else if (awaitGetFullUserCardKeyMatch) {
      console.log('✓ 正确使用 await');
    } else {
      console.log('? 无法确定');
    }
  }

  console.log('\n=== 诊断观看记录保存问题 ===\n');

  console.log('3. 检查 savePlayRecord 方法...');
  const dbClientPath = path.join(__dirname, '../src/lib/db.client.ts');
  if (fs.existsSync(dbClientPath)) {
    const content = fs.readFileSync(dbClientPath, 'utf8');

    // 检查是否有响应状态检查
    if (content.includes('if (!responseData.success)')) {
      console.log('✓ 有响应状态检查');
    } else {
      console.log('✗ 缺少响应状态检查');
    }

    // 检查是否有错误处理
    if (
      content.includes('throw new Error') &&
      content.includes('保存播放记录失败')
    ) {
      console.log('✓ 有错误处理');
    } else {
      console.log('✗ 缺少错误处理');
    }
  }

  console.log('\n=== 诊断完成 ===');
}

diagnoseCardKeyIssue().catch(console.error);
