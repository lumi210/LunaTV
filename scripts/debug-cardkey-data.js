const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugCardKey() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('=== 检查 user_card_keys 表 ===');
    const [rows] = await connection.query(
      'SELECT * FROM user_card_keys WHERE username = ?',
      ['magic'],
    );
    console.log('用户 magic 的卡密记录:', JSON.stringify(rows, null, 2));

    console.log('\n=== 检查 card_keys 表 ===');
    const [cardKeys] = await connection.query(
      'SELECT * FROM card_keys LIMIT 10',
    );
    console.log('卡密列表:', JSON.stringify(cardKeys, null, 2));

    console.log('\n=== 检查 admin_config 表 ===');
    const [configs] = await connection.query('SELECT * FROM admin_config');
    console.log('Admin Config 数量:', configs.length);
    if (configs.length > 0) {
      const config = JSON.parse(configs[0].config);
      const user = config.UserConfig.Users.find((u) => u.username === 'magic');
      console.log('用户 magic 的 cardKey:', user?.cardKey);
    }

    console.log('\n=== 测试 getActiveUserCardKey 查询 ===');
    const now = new Date();
    console.log('当前时间:', now.toISOString());
    const [activeKeys] = await connection.query(
      `SELECT * FROM user_card_keys
       WHERE username = ? AND status = 'used' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      ['magic'],
    );
    console.log('活跃卡密:', JSON.stringify(activeKeys, null, 2));
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await connection.end();
  }
}

debugCardKey();
