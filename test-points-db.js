#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function testPointsSystem() {
  console.log('=== 测试积分系统 ===\n');

  try {
    // 从环境变量或配置文件中获取数据库连接
    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'moontv',
      });
    } catch (err) {
      console.log('无法连接到 MySQL 数据库，这是正常的（因为可能没有配置）');
      console.log('错误:', err.message);
      return;
    }

    console.log('✓ 成功连接到数据库\n');

    // 检查 user_points 表是否存在
    const [tables] = await connection.query("SHOW TABLES LIKE 'user_points'");
    if (tables.length === 0) {
      console.log('❌ user_points 表不存在');
      await connection.end();
      return;
    }
    console.log('✓ user_points 表存在\n');

    // 查询所有用户的积分记录
    const [users] = await connection.query('SELECT * FROM user_points LIMIT 5');
    console.log('用户积分记录:');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\n共找到 ${users.length} 条记录\n`);

    await connection.end();
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testPointsSystem();
