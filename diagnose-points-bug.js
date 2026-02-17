/* eslint-disable no-console */

async function diagnosePointsIssue() {
  console.log('=== 诊断积分获取问题 ===\n');

  try {
    const { db } = await import('../src/lib/db.js');

    // 假设测试用户名
    const testUsername = process.argv[2] || 'testuser';

    console.log(`测试用户: ${testUsername}\n`);

    // 测试1: 使用 db.getUserPoints 直接获取
    console.log('测试1: 使用 db.getUserPoints 直接获取');
    const userPoints1 = await db.getUserPoints(testUsername);
    console.log('结果:', JSON.stringify(userPoints1, null, 2));
    console.log('余额:', userPoints1?.balance || 0);
    console.log('');

    // 测试2: 使用 PointsService.getUserBalance
    console.log('测试2: 使用 PointsService.getUserBalance');
    const { PointsService } = await import('../src/lib/invitation-points.js');
    const balance = await PointsService.getUserBalance(testUsername);
    console.log('余额:', balance);
    console.log('');

    // 测试3: 使用 InvitationService.getUserInvitationInfo
    console.log('测试3: 使用 InvitationService.getUserInvitationInfo');
    const { InvitationService } =
      await import('../src/lib/invitation-points.js');
    const invitationInfo =
      await InvitationService.getUserInvitationInfo(testUsername);
    console.log('结果:', JSON.stringify(invitationInfo, null, 2));
    console.log('');

    // 测试4: 使用 PointsService.getPointsHistory
    console.log('测试4: 使用 PointsService.getPointsHistory');
    const history = await PointsService.getPointsHistory(testUsername, 1, 10);
    console.log('历史记录数量:', history.length);
    console.log('历史记录:', JSON.stringify(history, null, 2));
    console.log('');

    // 测试5: 检查 user_points 表
    console.log('测试5: 直接查询数据库');
    const { executeQuery } = await import('../src/lib/mysql/connection.js');
    const rows = await executeQuery(
      'SELECT * FROM user_points WHERE username = ?',
      [testUsername],
    );
    console.log('数据库记录:', JSON.stringify(rows, null, 2));
    console.log('');
  } catch (error) {
    console.error('诊断失败:', error);
  }
}

diagnosePointsIssue();
