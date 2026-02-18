# LunaTV 项目功能说明书

> **版本**: v6.1.1  
> **更新日期**: 2026-02-18  
> **项目定位**: 全功能影视聚合播放平台

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [核心功能模块](#3-核心功能模块)
4. [用户系统](#4-用户系统)
5. [管理后台](#5-管理后台)
6. [API接口](#6-api接口)
7. [数据存储](#7-数据存储)
8. [部署配置](#8-部署配置)
9. [环境变量](#9-环境变量)

---

## 1. 项目概述

### 1.1 项目简介

LunaTV（MoonTV增强版）是一个基于 Next.js 16 开发的全功能影视聚合播放平台，支持多源聚合搜索、豆瓣/TMDB集成、直播/IPTV、AI智能推荐、弹幕系统、卡密系统等丰富功能。

### 1.2 核心特性

- **多源聚合搜索**: 支持多个资源站同时搜索，流式输出结果
- **豆瓣/TMDB集成**: 获取影片详情、评分、演员信息
- **直播/IPTV**: 支持M3U订阅、TVBox格式、EPG节目单
- **AI智能推荐**: 基于GPT模型的智能推荐系统
- **弹幕系统**: 多平台弹幕聚合（腾讯、爱奇艺、优酷、B站）
- **卡密系统**: 支持推广模式和运营模式切换
- **积分邀请**: 完整的积分和邀请奖励系统

---

## 2. 技术架构

### 2.1 技术栈

| 分类       | 技术                        | 版本     |
| ---------- | --------------------------- | -------- |
| 前端框架   | Next.js (App Router)        | 16.1.0   |
| UI框架     | React                       | 19.0.0   |
| 开发语言   | TypeScript                  | 5.8.3    |
| 样式框架   | Tailwind CSS                | 4.1.18   |
| 动画库     | Framer Motion               | 12.18.1  |
| 视频播放器 | ArtPlayer                   | 5.3.0    |
| 视频流处理 | HLS.js / FLV.js             | 最新     |
| 弹幕插件   | artplayer-plugin-danmuku    | 5.2.0    |
| 状态管理   | TanStack Query              | 5.90.20  |
| 虚拟滚动   | react-window                | 2.2.3    |
| 数据存储   | Kvrocks/Redis/Upstash/MySQL | 多种支持 |
| 包管理器   | pnpm                        | 10.14.0  |

### 2.2 项目目录结构

```
/workspace/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/               # API路由
│   │   ├── admin/             # 管理后台页面
│   │   ├── play/              # 播放页面
│   │   ├── douban/            # 豆瓣浏览页面
│   │   ├── release-calendar/  # 发布日历页面
│   │   ├── register/          # 注册页面
│   │   └── login/             # 登录页面
│   ├── components/            # React组件
│   │   ├── play/              # 播放器组件
│   │   ├── watch-room/        # 观影房组件
│   │   └── ...                # 其他组件
│   ├── lib/                   # 核心库
│   │   ├── db.ts              # 数据库管理
│   │   ├── config.ts          # 配置管理
│   │   ├── auth.ts            # 认证系统
│   │   ├── cardkey.ts         # 卡密系统
│   │   └── ...                # 其他库
│   └── contexts/              # React Context
├── public/                    # 静态资源
└── 配置文件
```

---

## 3. 核心功能模块

### 3.1 内容聚合搜索

#### 功能描述

支持多个资源站同时搜索，智能匹配影片，提供繁简中文自动转换和模糊匹配功能。

#### 特性

- **多源聚合**: 同时搜索多个资源站，流式输出结果
- **智能变体检测**: 繁简中文自动转换，提高匹配率
- **备用API**: 主API失败自动切换备用源
- **成人内容过滤**: 双层过滤系统，可配置开关
- **搜索历史**: 本地存储搜索记录

#### 相关文件

- `src/lib/downstream.ts` - 下游搜索逻辑
- `src/app/api/search/` - 搜索API

### 3.2 豆瓣集成

#### 功能描述

集成豆瓣电影数据，提供分类浏览、详情展示、评论预览等功能。

#### 特性

- **分类浏览**: 电影、电视剧、综艺、动漫等分类
- **详情页**: 评分、导演、演员、剧情简介
- **预告片**: 自动播放预告片，过期自动刷新
- **用户评论**: 播放页展示豆瓣用户评论
- **反爬虫支持**: Cookies认证绕过验证

#### 相关文件

- `src/lib/douban.client.ts` - 豆瓣API客户端
- `src/lib/douban.ts` - 豆瓣爬虫逻辑
- `src/app/douban/` - 豆瓣浏览页面

### 3.3 TMDB集成

#### 功能描述

集成The Movie Database API，提供演员搜索、相似推荐等功能。

#### 特性

- **演员搜索**: 按演员/导演搜索作品
- **相似推荐**: 基于TMDB算法的相似影片推荐
- **关键词标签**: 影片关键词提取和展示

#### 相关文件

- `src/lib/tmdb.client.ts` - TMDB客户端
- `src/lib/tmdb-cache.ts` - TMDB缓存

### 3.4 直播/IPTV

#### 功能描述

支持标准M3U/M3U8订阅、TVBox格式配置，提供EPG节目单功能。

#### 特性

- **M3U订阅**: 标准M3U/M3U8格式解析
- **TVBox支持**: TXT和JSON配置格式
- **EPG节目单**: XMLTV格式解析和显示
- **频道Logo**: 自动提取和代理显示
- **DVR检测**: 自动检测时移支持
- **CORS直连**: 智能检测节省带宽

#### 相关文件

- `src/lib/live.ts` - 直播核心逻辑
- `src/app/api/proxy/m3u8/` - M3U8代理API

### 3.5 视频播放器

#### 功能描述

基于ArtPlayer的全功能播放器，支持多种视频格式和流媒体协议。

#### 特性

- **多格式支持**: HLS、FLV、MP4等
- **弹幕系统**: 多平台弹幕聚合
- **跳过片头片尾**: 可配置多片段跳过
- **M3U8下载**: 6倍并发下载
- **Chromecast投屏**: 智能设备检测
- **Anime4K超分辨率**: WebGPU画质增强
- **多人观影房**: 实时同步播放

#### 相关文件

- `src/components/play/` - 播放器组件
- `src/lib/artplayer-plugin-*.js` - 播放器插件

### 3.6 AI智能推荐

#### 功能描述

基于GPT模型的智能推荐系统，支持影视推荐、联网搜索等功能。

#### 特性

- **多模型支持**: GPT-5/o系列模型
- **流式传输**: SSE实时响应
- **联网搜索**: Tavily API集成
- **意图分析**: 自动判断问题类型
- **视频上下文**: 自动注入豆瓣/TMDB数据
- **多API Key轮询**: 提高可用性

#### 相关文件

- `src/lib/ai-orchestrator.ts` - AI编排器
- `src/lib/ai-recommend.client.ts` - AI推荐客户端

### 3.7 弹幕系统

#### 功能描述

多平台弹幕聚合系统，支持腾讯、爱奇艺、优酷、B站等平台。

#### 特性

- **多平台支持**: 腾讯、爱奇艺、优酷、B站
- **智能匹配**: 过滤预告片弹幕
- **性能优化**: 设备性能分级渲染
- **Web Worker加速**: 提升渲染性能
- **完整配置**: 字号、速度、透明度、防重叠

#### 相关文件

- `src/components/play/DanmuSettingsPanel.tsx` - 弹幕设置
- `src/app/api/danmu-external/` - 外部弹幕API

### 3.8 YouTube集成

#### 功能描述

YouTube视频搜索和播放功能。

#### 特性

- **视频搜索**: 按关键词搜索YouTube视频
- **直播支持**: YouTube直播流播放
- **时间筛选**: 按上传时间筛选
- **无Cookie域名**: 减少验证弹窗

#### 相关文件

- `src/components/YouTubeConfig.tsx` - YouTube配置
- `src/components/DirectYouTubePlayer.tsx` - YouTube播放器

### 3.9 短剧功能

#### 功能描述

短剧内容聚合和播放功能。

#### 特性

- **短剧搜索**: 关键词搜索短剧内容
- **分类浏览**: 短剧分类列表
- **AI聊天**: 短剧相关AI对话
- **备用API**: 自动切换备用源

#### 相关文件

- `src/lib/shortdrama.client.ts` - 短剧客户端
- `src/components/ShortDramaCard.tsx` - 短剧卡片组件

### 3.10 发布日历

#### 功能描述

即将上映内容预览和收藏功能。

#### 特性

- **上映日历**: 按日期显示即将上映内容
- **分类筛选**: 电影/电视剧分类
- **收藏功能**: 收藏感兴趣的即将上映内容
- **自动更新**: 上映后自动标记可播放

#### 相关文件

- `src/app/release-calendar/` - 发布日历页面
- `src/lib/release-calendar-scraper.ts` - 数据抓取

---

## 4. 用户系统

### 4.1 用户角色

| 角色  | 权限                     |
| ----- | ------------------------ |
| owner | 站长，拥有所有权限       |
| admin | 管理员，可管理用户和配置 |
| user  | 普通用户，基本功能权限   |

### 4.2 认证方式

#### 基础认证

- **用户名/密码登录**: HMAC-SHA256签名验证
- **Cookie认证**: `user_auth` cookie存储认证信息
- **时间戳防重放**: 登录时记录时间戳

#### OIDC认证

支持多种OAuth Provider：

| Provider  | 说明              |
| --------- | ----------------- |
| Google    | 标准OIDC          |
| Microsoft | 标准OIDC          |
| GitHub    | 适配非标准实现    |
| LinuxDo   | 社区认证          |
| 微信      | 网站应用扫码登录  |
| Apple     | form_post响应模式 |

#### 其他认证

- **Telegram认证**: Magic Link登录
- **信任网络模式**: 内网部署免登录，IP白名单

### 4.3 用户权限

用户可通过以下方式配置权限：

- **用户组(tags)**: 分组权限管理
- **enabledApis**: 用户级别API权限
- **成人内容控制**: 用户级别开关

---

## 5. 管理后台

### 5.1 站点配置

| 配置项       | 说明                 |
| ------------ | -------------------- |
| 站点名称     | 显示在页面标题和Logo |
| 公告内容     | 首页公告显示         |
| 搜索最大页数 | 限制搜索结果页数     |
| 豆瓣代理     | 豆瓣API代理配置      |
| TMDB API     | TMDB API密钥配置     |

### 5.2 用户管理

| 功能           | 说明                   |
| -------------- | ---------------------- |
| 用户列表       | 查看所有用户           |
| 角色分配       | 修改用户角色           |
| 用户组管理     | 分配用户组             |
| 封禁管理       | 封禁/解封用户          |
| 非活跃用户清理 | 自动清理长期未登录用户 |

### 5.3 资源源管理

| 功能         | 说明           |
| ------------ | -------------- |
| 添加资源源   | 添加新的视频源 |
| 编辑配置     | 修改源配置     |
| 源验证       | 测试源可用性   |
| 成人内容标记 | 标记成人内容源 |
| 权重配置     | 调整源优先级   |

### 5.4 直播源管理

| 功能      | 说明          |
| --------- | ------------- |
| M3U订阅   | 添加M3U直播源 |
| TVBox配置 | TVBox格式支持 |
| EPG配置   | 节目单配置    |
| 频道统计  | 显示频道数量  |

### 5.5 卡密管理

#### 系统模式

| 模式     | 说明                         |
| -------- | ---------------------------- |
| 推广模式 | 新用户注册自动生成并绑定卡密 |
| 运营模式 | 用户需手动输入卡密注册       |

#### 卡密类型

| 类型 | 有效期 |
| ---- | ------ |
| 年卡 | 365天  |
| 季卡 | 90天   |
| 月卡 | 30天   |
| 周卡 | 7天    |

#### 功能

- **卡密生成**: 批量生成指定类型卡密
- **卡密导出**: CSV格式导出
- **过期清理**: 清理过期未使用卡密
- **来源追踪**: 标记卡密来源（管理员创建/推广注册/积分兑换）

### 5.6 积分邀请管理

| 配置项       | 说明               |
| ------------ | ------------------ |
| 邀请奖励积分 | 邀请一人获得的积分 |
| 兑换门槛     | 兑换卡密所需积分   |
| 兑换卡密类型 | 兑换的卡密有效期   |

### 5.7 性能监控

| 功能       | 说明               |
| ---------- | ------------------ |
| API性能    | 各API响应时间统计  |
| 流量监控   | 请求量和带宽统计   |
| 数据库统计 | 查询次数和性能     |
| 行业基准   | 与行业标准对比评级 |

---

## 6. API接口

### 6.1 认证接口

| 路径                      | 方法 | 功能         |
| ------------------------- | ---- | ------------ |
| `/api/login`              | POST | 用户登录     |
| `/api/logout`             | POST | 用户登出     |
| `/api/register`           | POST | 用户注册     |
| `/api/register/config`    | GET  | 获取注册配置 |
| `/api/auth/oidc/login`    | GET  | OIDC登录发起 |
| `/api/auth/oidc/callback` | GET  | OIDC回调处理 |

### 6.2 内容接口

| 路径               | 方法 | 功能         |
| ------------------ | ---- | ------------ |
| `/api/detail`      | GET  | 获取视频详情 |
| `/api/parse`       | POST | 解析视频源   |
| `/api/image-proxy` | GET  | 图片代理     |
| `/api/video-proxy` | GET  | 视频代理     |

### 6.3 豆瓣接口

| 路径                     | 功能         |
| ------------------------ | ------------ |
| `/api/douban`            | 豆瓣分类列表 |
| `/api/douban/details`    | 豆瓣详情     |
| `/api/douban/comments`   | 豆瓣评论     |
| `/api/douban/categories` | 豆瓣分类     |

### 6.4 直播接口

| 路径                 | 功能         |
| -------------------- | ------------ |
| `/api/proxy/m3u8`    | M3U8代理     |
| `/api/proxy/stream`  | 流代理       |
| `/api/proxy/segment` | 视频分片代理 |

### 6.5 TVBox接口

| 路径                | 功能      |
| ------------------- | --------- |
| `/api/tvbox`        | TVBox配置 |
| `/api/tvbox/search` | TVBox搜索 |
| `/api/tvbox/health` | 健康检查  |

### 6.6 管理接口

| 路径                             | 功能         |
| -------------------------------- | ------------ |
| `/api/admin/config`              | 站点配置     |
| `/api/admin/user`                | 用户管理     |
| `/api/admin/source`              | 资源源管理   |
| `/api/admin/cardkey`             | 卡密管理     |
| `/api/admin/cardkey/system-mode` | 系统模式设置 |
| `/api/admin/points/*`            | 积分管理     |
| `/api/admin/performance`         | 性能监控     |

### 6.7 特殊功能接口

| 路径                    | 功能        |
| ----------------------- | ----------- |
| `/api/ai-recommend`     | AI智能推荐  |
| `/api/release-calendar` | 发布日历    |
| `/api/danmu-external`   | 外部弹幕API |
| `/api/redeem/cardkey`   | 卡密兑换    |
| `/api/points/balance`   | 积分余额    |
| `/api/invitation/info`  | 邀请信息    |

---

## 7. 数据存储

### 7.1 存储类型

项目支持多种存储后端：

| 存储类型        | 适用场景      | 配置变量                        |
| --------------- | ------------- | ------------------------------- |
| Kvrocks         | 生产环境推荐  | `KVROCKS_URL`                   |
| Redis           | 需开启持久化  | `REDIS_URL`                     |
| Upstash         | 无服务器环境  | `UPSTASH_URL` + `UPSTASH_TOKEN` |
| MySQL-Redis混合 | 高性能+持久化 | MySQL + Redis配置               |
| localStorage    | 仅开发测试    | 无需配置                        |

### 7.2 数据结构

#### 播放记录

```typescript
interface PlayRecord {
  title: string; // 视频标题
  source_name: string; // 来源名称
  cover: string; // 封面图
  year: string; // 年份
  index: number; // 第几集
  total_episodes: number; // 总集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总时长（秒）
  save_time: number; // 保存时间戳
  search_title: string; // 搜索标题
  douban_id?: number; // 豆瓣ID
}
```

#### 收藏

```typescript
interface Favorite {
  source_name: string; // 来源名称
  title: string; // 标题
  cover: string; // 封面图
  year: string; // 年份
  save_time: number; // 保存时间戳
  origin?: 'vod' | 'live' | 'shortdrama';
}
```

#### 卡密

```typescript
interface CardKey {
  key: string; // 卡密明文
  keyHash: string; // 卡密哈希
  keyType: 'year' | 'quarter' | 'month' | 'week';
  status: 'unused' | 'used' | 'expired';
  createdAt: number; // 创建时间
  expiresAt: number; // 过期时间
  boundTo?: string; // 绑定用户
  source?: 'admin_created' | 'promotion_register' | 'points_redeem';
}
```

### 7.3 缓存策略

| 缓存类型 | TTL     | 说明             |
| -------- | ------- | ---------------- |
| 豆瓣缓存 | 2-4小时 | 详情和列表数据   |
| TMDB缓存 | 4-6小时 | 演员和推荐数据   |
| EPG缓存  | 24小时  | 节目单数据       |
| 弹幕缓存 | 30分钟  | 本地localStorage |

---

## 8. 部署配置

### 8.1 部署方式

- **Docker**: 支持Docker容器化部署
- **Zeabur**: 一键部署到Zeabur平台
- **Vercel**: 支持Vercel无服务器部署
- **自托管**: 传统服务器部署

### 8.2 推荐配置

| 部署规模 | 存储推荐        | 服务器配置 |
| -------- | --------------- | ---------- |
| 小型     | Upstash         | 1核1G      |
| 中型     | Redis/Kvrocks   | 2核4G      |
| 大型     | MySQL-Redis混合 | 4核8G+     |

---

## 9. 环境变量

### 9.1 必填变量

| 变量                       | 说明     | 示例            |
| -------------------------- | -------- | --------------- |
| `USERNAME`                 | 站长账号 | `admin`         |
| `PASSWORD`                 | 站长密码 | `your_password` |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型 | `kvrocks`       |

### 9.2 存储配置

| 变量             | 说明             |
| ---------------- | ---------------- |
| `KVROCKS_URL`    | Kvrocks连接URL   |
| `REDIS_URL`      | Redis连接URL     |
| `UPSTASH_URL`    | Upstash REST URL |
| `UPSTASH_TOKEN`  | Upstash Token    |
| `MYSQL_HOST`     | MySQL主机        |
| `MYSQL_USER`     | MySQL用户        |
| `MYSQL_PASSWORD` | MySQL密码        |
| `MYSQL_DATABASE` | MySQL数据库      |

### 9.3 功能配置

| 变量                    | 说明         |
| ----------------------- | ------------ |
| `TMDB_API_KEY`          | TMDB API密钥 |
| `NEXT_PUBLIC_SITE_NAME` | 站点名称     |
| `ANNOUNCEMENT`          | 公告内容     |
| `SITE_BASE`             | 站点基础URL  |

### 9.4 AI配置

| 变量                   | 说明              |
| ---------------------- | ----------------- |
| `AI_RECOMMEND_API_URL` | AI API地址        |
| `AI_RECOMMEND_API_KEY` | AI API密钥        |
| `AI_RECOMMEND_MODEL`   | 模型名称          |
| `TAVILY_API_KEYS`      | Tavily搜索API密钥 |

---

## 附录

### A. 更新日志

详见 `CHANGELOG.md`

### B. 贡献指南

详见 `CONTRIBUTING.md`

### C. 许可证

详见 `LICENSE`
