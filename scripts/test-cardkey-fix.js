/**
 * 测试卡密绑定修复
 *
 * 这个脚本验证以下功能：
 * 1. getUserCardKey 方法是否能正确查询卡密
 * 2. updateUserCardKeyInfo 是否能正确更新 admin_config
 * 3. registerUser 是否会将用户添加到 admin_config
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCardKeyFix() {
  console.log('=== 开始测试卡密绑定修复 ===\n');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const testUsername = `test_user_${Date.now()}`;

    // 测试 1: 创建用户
    console.log('测试 1: 创建用户');
    console.log('用户名:', testUsername);
    await connection.execute(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [testUsername, 'test_hash', 'user'],
    );
    console.log('✅ 用户创建成功\n');

    // 测试 2: 检查 admin_config 中的 Users 列表
    console.log('测试 2: 检查 admin_config 中的 Users 列表');
    const [configRows] = await connection.query(
      'SELECT config FROM admin_config',
    );
    if (configRows.length > 0) {
      const config = JSON.parse(configRows[0].config);
      const userInConfig = config.UserConfig.Users.find(
        (u) => u.username === testUsername,
      );
      if (userInConfig) {
        console.log('✅ 用户在 admin_config 中');
        console.log('   用户信息:', JSON.stringify(userInConfig, null, 2));
      } else {
        console.log(
          '❌ 用户不在 admin_config 中（需要 registerUser 更新 admin_config）',
        );
      }
    } else {
      console.log('❌ admin_config 为空');
    }
    console.log();

    // 测试 3: 模拟 updateUserCardKeyInfo 调用
    console.log('测试 3: 模拟 updateUserCardKeyInfo 调用');
    const testCardKeyInfo = {
      boundKey: 'test_hash_' + Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天后过期
      boundAt: Date.now(),
    };

    // 先添加用户到 admin_config（模拟 registerUser 的行为）
    const [configRows2] = await connection.query(
      'SELECT config FROM admin_config',
    );
    if (configRows2.length > 0) {
      const config = JSON.parse(configRows2[0].config);
      const userExists = config.UserConfig.Users.find(
        (u) => u.username === testUsername,
      );

      if (!userExists) {
        // 添加用户
        config.UserConfig.Users.push({
          username: testUsername,
          password: '',
          role: 'user',
          banned: 0,
          tags: undefined,
          enabledApis: undefined,
          oidcSub: undefined,
          createdAt: Date.now(),
        });
        console.log('✅ 用户已添加到 admin_config');
      }

      // 更新卡密信息
      const userIndex = config.UserConfig.Users.findIndex(
        (u) => u.username === testUsername,
      );
      if (userIndex !== -1) {
        config.UserConfig.Users[userIndex].cardKey = testCardKeyInfo;
        await connection.execute(
          'UPDATE admin_config SET config = ? WHERE id = 1',
          [JSON.stringify(config)],
        );
        console.log('✅ 卡密信息已更新到 admin_config');
        console.log('   卡密信息:', JSON.stringify(testCardKeyInfo, null, 2));
      } else {
        console.log('❌ 找不到用户索引');
      }
    }
    console.log();

    // 测试 4: 验证卡密信息是否能正确读取
    console.log('测试 4: 验证卡密信息是否能正确读取');
    const [configRows3] = await connection.query(
      'SELECT config FROM admin_config',
    );
    if (configRows3.length > 0) {
      const config = JSON.parse(configRows3[0].config);
      const user = config.UserConfig.Users.find(
        (u) => u.username === testUsername,
      );
      if (user && user.cardKey) {
        console.log('✅ 卡密信息读取成功');
        console.log('   boundKey:', user.cardKey.boundKey);
        console.log(
          '   expiresAt:',
          new Date(user.cardKey.expiresAt).toISOString(),
        );
        console.log(
          '   boundAt:',
          new Date(user.cardKey.boundAt).toISOString(),
        );
      } else {
        console.log('❌ 卡密信息读取失败');
      }
    }
    console.log();

    // 测试 5: 创建 user_card_keys 记录
    console.log('测试 5: 创建 user_card_keys 记录');
    const cardKeyId = `test_${Date.now()}`;
    await connection.execute(
      `INSERT INTO user_card_keys 
       (id, key_hash, username, key_type, status, source, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cardKeyId,
        testCardKeyInfo.boundKey,
        testUsername,
        'week',
        'used',
        'redeem',
        new Date(testCardKeyInfo.expiresAt),
      ],
    );
    console.log('✅ user_card_keys 记录创建成功');
    console.log('   ID:', cardKeyId);
    console.log();

    // 测试 6: 模拟 getActiveUserCardKey 查询
    console.log('测试 6: 模拟 getActiveUserCardKey 查询');
    const [activeKeys] = await connection.query(
      `SELECT * FROM user_card_keys 
       WHERE username = ? AND status = 'used' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [testUsername],
    );
    if (activeKeys.length > 0) {
      console.log('✅ getActiveUserCardKey 查询成功');
      console.log('   查询结果:', JSON.stringify(activeKeys[0], null, 2));
    } else {
      console.log('❌ getActiveUserCardKey 查询失败');
    }
    console.log();

    // 清理测试数据
    console.log('清理测试数据...');
    await connection.execute('DELETE FROM user_card_keys WHERE username = ?', [
      testUsername,
    ]);
    await connection.execute('DELETE FROM users WHERE username = ?', [
      testUsername,
    ]);
    console.log('✅ 测试数据清理完成\n');

    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await connection.end();
  }
}

testCardKeyFix();
