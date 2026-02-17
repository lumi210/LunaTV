# 卡密绑定后不显示到期日期问题修复

## 问题描述

用户绑定卡密后，卡密到期日期没有显示在以下位置：

1. 欢迎栏（用户菜单中的"卡密到期"部分）
2. 卡密绑定页面

从日志中可以看到绑定流程是成功的：

- 验证卡密成功
- 更新卡密状态为已使用
- 创建用户卡密记录到 `user_card_keys` 表
- 更新用户卡密信息到 `admin_config`

但是查询卡密信息时返回 null：

```
db.getUserCardKey - cardKeyInfo from getUserCardKeyInfo: null
cardKeyInfo: null
用户没有绑定卡密
```

## 根本原因分析

### 问题 1: `HybridStorage` 没有实现 `getFullUserCardKey` 方法

`db.getUserCardKey` 的逻辑是：

1. 首先检查 storage 是否实现了 `getFullUserCardKey` 方法
2. 如果有，调用 `storage.getFullUserCardKey(userName)`
3. 如果没有，调用 `storage.getUserCardKeyInfo(userName)` 作为 fallback

`HybridStorage` 实现了 `getUserCardKey` 方法（从 MySQL 查询），但没有实现 `getFullUserCardKey` 方法，导致每次查询都走 fallback 逻辑。

### 问题 2: `registerUser` 不更新 `admin_config`

`HybridStorage.registerUser` 只创建 MySQL 用户，不更新 `admin_config` 的 Users 列表。

而 `updateUserCardKeyInfo` 需要从 `admin_config` 的 Users 列表中查找用户：

```typescript
const userIndex = config.UserConfig.Users.findIndex(
  (u) => u.username === userName,
);
if (userIndex === -1) return; // 用户不在列表中，直接返回
config.UserConfig.Users[userIndex].cardKey = info;
await this.setAdminConfig(config);
```

如果用户不在 admin_config 的 Users 列表中，`updateUserCardKeyInfo` 会直接返回，不更新卡密信息。

### 问题 3: OIDC 注册用户

OIDC 用户注册时调用 `db.createUserV2`，只创建 MySQL 用户，不更新 admin_config。虽然 `configSelfCheck` 会自动添加用户，但这需要在配置缓存被清除后才会触发。

## 解决方案

### 修复 1: 添加 `getFullUserCardKey` 方法

在 `HybridStorage` 中添加 `getFullUserCardKey` 方法，直接调用 `getUserCardKey`：

```typescript
async getFullUserCardKey(userName: string): Promise<UserCardKeyInfo | null> {
  return this.getUserCardKey(userName);
}
```

这样 `db.getUserCardKey` 会优先调用 `storage.getUserCardKey`，直接从 MySQL 的 `user_card_keys` 表查询，而不是走 fallback 逻辑。

### 修复 2: 更新 `registerUser` 以同步 admin_config

在 `HybridStorage.registerUser` 中同时更新 `admin_config` 的 Users 列表：

```typescript
async registerUser(userName: string, password: string): Promise<void> {
  incrementDbQuery();
  const passwordHash = await hashPassword(password);
  await userQueries.createUser(userName, passwordHash, 'user');

  // 同时更新 admin_config 中的 Users 列表
  const config = await this.getAdminConfig();
  if (config) {
    const userExists = config.UserConfig.Users.find(u => u.username === userName);
    if (!userExists) {
      config.UserConfig.Users.push({
        username: userName,
        password: '',
        role: 'user',
        banned: 0,
        tags: undefined,
        enabledApis: undefined,
        oidcSub: undefined,
        createdAt: Date.now(),
      });
      await this.setAdminConfig(config);
    }
  }
}
```

这样确保每个新注册的用户都会被添加到 admin_config 中，`updateUserCardKeyInfo` 可以正常更新卡密信息。

## 测试计划

1. **测试普通用户绑定卡密**
   - 创建一个新用户
   - 绑定一个测试卡密
   - 验证卡密到期日期是否显示

2. **测试 OIDC 用户绑定卡密**
   - 通过 OIDC 注册新用户
   - 绑定一个测试卡密
   - 验证卡密到期日期是否显示

3. **测试 `getFullUserCardKey` 方法**
   - 调用 `db.getUserCardKey`
   - 验证是否从 `user_card_keys` 表查询
   - 验证是否返回正确的卡密信息

4. **测试 `registerUser` 同步 admin_config**
   - 调用 `db.registerUser`
   - 验证用户是否被添加到 admin_config 的 Users 列表

## 注意事项

1. **清除缓存**: 由于 `configSelfCheck` 会从数据库获取最新用户列表，如果用户已经在数据库中但不在 admin_config 中，需要清除配置缓存来触发 `configSelfCheck`。

2. **向后兼容**: 这个修复是向后兼容的，不会影响现有的 Redis 存储实现。

3. **性能考虑**: `getFullUserCardKey` 方法直接调用 `getUserCardKey`，不会引入额外的性能开销。

## 修改文件

- `/workspace/src/lib/hybrid-storage.ts`: 添加 `getFullUserCardKey` 方法，更新 `registerUser` 方法
