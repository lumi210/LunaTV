# 需求文档

## 概述

本功能为 MoonTV 系统添加完整的推广码和积分兑换系统，实现用户邀请好友获得积分奖励，并支持使用积分兑换卡密。

## 术语表

- **推广码**: 用户注册时系统自动分配的专属邀请码，用于邀请好友注册
- **积分**: 用户通过邀请好友注册获得的奖励数值
- **卡密**: 用于激活会员权益的兑换码
- **兑换门槛**: 用户兑换卡密所需的最低积分数量

## 需求

### 需求 1: 新用户注册自动分配推广码

**用户故事:** AS 一个新用户, I want 注册时自动获得专属推广码, so that 我可以邀请好友获得奖励

#### 验收标准

1. WHEN 用户完成注册, 系统 SHALL 自动为用户生成 16 位随机推广码
2. WHEN 推广码生成成功, 系统 SHALL 将推广码与用户账户绑定存储
3. IF 推广码生成失败, 系统 SHALL 记录错误日志并允许注册流程继续（不影响用户注册）
4. WHILE 用户查看个人设置, 系统 SHALL 显示用户的专属推广码并支持复制

### 需求 2: 好友通过推广码注册奖励积分

**用户故事:** AS 一个用户, I want 好友通过我的推广码注册时我获得积分奖励, so that 激励我邀请更多好友

#### 验收标准

1. WHEN 新用户使用有效推广码注册, 系统 SHALL 验证推广码有效性
2. WHEN 推广码验证通过, 系统 SHALL 根据管理员设置的奖励积分数给推荐人发放积分
3. WHEN 积分发放成功, 系统 SHALL 创建积分变动记录并通知推荐人
4. IF 同一 IP 地址已获得过邀请奖励, 系统 SHALL 不再发放积分奖励（防止刷分）
5. IF 推广码无效, 系统 SHALL 允许注册继续但不发放积分奖励

### 需求 3: 管理员管理面板配置积分设置

**用户故事:** AS 管理员, I want 在管理面板配置邀请奖励积分和兑换门槛, so that 灵活控制积分系统

#### 验收标准

1. WHEN 管理员访问邀请配置页面, 系统 SHALL 显示当前积分配置（奖励积分、兑换门槛、兑换卡密类型）
2. WHEN 管理员修改配置并保存, 系统 SHALL 验证输入有效性（正整数）
3. WHEN 配置保存成功, 系统 SHALL 更新配置并显示成功提示
4. IF 输入无效（非正整数）, 系统 SHALL 显示错误提示并拒绝保存

### 需求 4: 用户使用积分兑换卡密

**用户故事:** AS 一个用户, I want 使用积分兑换卡密, so that 获取会员权益

#### 验收标准

1. WHEN 用户积分余额达到兑换门槛, 系统 SHALL 允许用户发起兑换请求
2. WHEN 用户发起兑换, 系统 SHALL 根据管理员设置的卡密类型生成新卡密
3. WHEN 卡密生成成功, 系统 SHALL 扣除用户对应积分并记录兑换历史
4. WHEN 兑换成功, 系统 SHALL 将卡密绑定到用户账户并自动激活
5. IF 用户积分不足, 系统 SHALL 显示错误提示并拒绝兑换

### 需求 5: 用户查看已兑换的卡密

**用户故事:** AS 一个用户, I want 查看我已兑换的卡密列表, so that 了解我的卡密状态和使用情况

#### 验收标准

1. WHEN 用户访问卡密管理页面, 系统 SHALL 显示用户所有已兑换的卡密列表
2. WHEN 显示卡密列表, 系统 SHALL 包含卡密明文、类型、状态、过期时间
3. WHEN 用户点击复制按钮, 系统 SHALL 将卡密明文复制到剪贴板并显示成功提示
4. WHEN 卡密状态为未使用, 系统 SHALL 明确标识状态
5. IF 用户没有已兑换卡密, 系统 SHALL 显示空状态提示

## 现有系统分析

### 已实现功能

1. **推广码生成**: `InvitationService.generateInvitationCode()` - 已实现 16 位随机推广码生成
2. **注册时分配推广码**: 注册流程中已自动为用户生成专属推广码
3. **邀请码验证**: `InvitationService.validateInvitationCode()` - 已实现
4. **积分奖励发放**: 注册时已实现邀请人积分奖励（需验证 IP 防刷）
5. **管理员配置**: `InvitationConfig` 组件 - 已支持配置奖励积分、兑换门槛、卡密类型
6. **积分兑换卡密**: `PointsService.redeemForCardKey()` - 已实现
7. **积分余额查询**: `PointsService.getUserBalance()` - 已实现

### 需要完善的功能

1. **用户推广码展示**: 需要在设置页面增加用户推广码展示和复制功能
2. **已兑换卡密列表**: 需要增加 API 和前端展示用户已兑换的卡密列表
3. **用户积分信息展示**: 需要在设置页面展示用户积分余额和兑换入口

### 数据结构（已存在）

```typescript
// 用户积分
interface UserPoints {
  username: string;
  invitationCode: string; // 专属推广码
  balance: number; // 当前积分余额
  totalEarned: number; // 累计获得积分
  totalRedeemed: number; // 累计兑换积分
  updatedAt: number;
}

// 邀请配置
interface InvitationConfig {
  enabled: boolean;
  rewardPoints: number; // 邀请奖励积分
  redeemThreshold: number; // 兑换门槛
  cardKeyType: CardKeyType; // 兑换卡密类型
  updatedAt: number;
}

// 用户卡密
interface UserCardKey {
  id: string;
  keyHash: string;
  username: string;
  type: CardKeyType;
  status: CardKeyStatus;
  source: 'invitation' | 'redeem' | 'manual'; // 来源
  createdAt: number;
  expiresAt: number;
}
```
