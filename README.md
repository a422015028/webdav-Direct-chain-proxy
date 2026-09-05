# WebDAV 直链代理（Cloudflare Pages Functions）

一个功能强大、兼容性广的 WebDAV **直链下载 / 目录浏览 / 分享码 / 管理面板** 项目，专为 **CloudFlareAssistant（Android）** 一键部署设计，采用 `functions/` 标准模式，零第三方依赖、纯 Workers 原生 API 实现。

```
域名/zip/kkk.zip   →   直链下载网盘文件
域名/zip/           →   目录浏览（HTML 列表）
域名/zip/?list=json →   目录浏览（JSON 接口）
域名/admin          →   管理面板（文件浏览 / 分享生成 / 分享列表 / 批量生成）
```

---

## 一、功能特性

| 特性 | 说明 |
|------|------|
| 直链下载 | `https://xxx.xxx.xxx/<网盘路径>` 直接流式代理下载，支持大文件、断点续传 |
| 目录浏览 | 路径以 `/` 结尾或加 `?list=1` 渲染文件列表；`?list=json` 输出 JSON 接口 |
| 断点续传 / 视频拖拽 | 透传 `Range` / `206 Partial Content` / `Accept-Ranges`，支持在线视频播放 |
| 分享码·永久 | `expireAt=0` 的分享码永不失效，可限制可访问路径 |
| 分享码·限时 | 动态生成限时分享码（KV），到点自动失效 |
| 分享码两种携带方式 | `?code=xxx` 查询参数 或 `/s/xxx/路径` 路径形式 |
| 路径级权限 | 分享码可绑定路径通配（`**`、`/zip/*.zip`、`?`） |
| 多种认证适配 | Basic / Bearer / 自定义 Header / 无认证 / URL 内嵌凭据 |
| 管理 API | 鉴权后动态创建、查询、删除分享码 |
| 安全 | 分享码校验、管理令牌、脱敏状态接口、CORS/安全响应头 |
| 管理面板 | `/admin` 网页界面：文件浏览、分享生成、分享列表、批量生成 |
| 有效期选项 | 生成分享码可选 永久 / 7 天 / 30 天 / 自定义到期时间 |
| 批量分享 | 勾选多个文件/目录一键生成批量分享链接 |

---

## 二、目录结构

```
webdav-proxy.zip
├── functions/
│   ├── _middleware.js          → CORS / 安全头 / 全局错误兜底
│   ├── _routes.json            → 路由配置（全部走 Functions）
│   ├── index.js                → /  落地与状态页
│   ├── admin.js                → /admin 管理面板（网页界面）
│   ├── [[path]].js             → /* 直链下载 + 目录浏览（?code= 形式）
│   ├── s/
│   │   └── [[path]].js         → /s/<分享码>/<路径> 分享码路径形式
│   ├── api/
│   │   ├── info.js             → /api/info 运行状态（脱敏）
│   │   ├── codes.js            → /api/codes 分享码列表/创建
│   │   ├── codes/batch.js      → /api/codes/batch 批量生成分享链接
│   │   ├── codes/[code].js     → /api/codes/:code 查询/删除
│   │   └── list.js             → /api/list JSON 目录接口（管理员/分享码）
│   └── lib/
│       ├── config.js           → 配置加载（环境变量）
│       ├── webdav.js           → WebDAV 客户端（认证适配/流式/列目录）
│       ├── codes.js            → 分享码系统（静态+KV）
│       ├── auth.js             → 管理令牌鉴权
│       ├── listing.js          → PROPFIND 解析
│       ├── download.js         → 主请求处理器
│       ├── html.js             → 页面渲染
│       └── utils.js            → 工具函数
├── wrangler.toml.example       → 参考配置（仅参考）
└── README.md
```

---

## 三、部署步骤（CloudFlareAssistant）

1. **打包**：将本目录所有内容打包为 `webdav-proxy.zip`（`functions/` 位于压缩包根目录）。
2. **上传**：CloudFlareAssistant → 新建 Pages 项目 → 上传 `webdav-proxy.zip`。
   - 应用会识别 `functions/` 标准模式，自动完成文件路由打包。
   - 本项目**无裸 NPM 依赖**（全部相对导入），离线即可编译，无需联网下载 esbuild。
3. **配置环境变量**（项目设置 → 环境变量），必填项：

| 变量 | 必填 | 说明 | 示例 |
|------|:---:|------|------|
| `WEBDAV_URL` | ✅ | WebDAV 服务地址（带协议） | `https://dav.jianguoyun.com/dav/` |
| `WEBDAV_USERNAME` | 按需 | 用户名 / 应用密码账号 | `you@example.com` |
| `WEBDAV_PASSWORD` | 按需 | 密码 / 应用专属密码 | `xxxxx` |
| `WEBDAV_AUTH_TYPE` | 否 | `basic` / `bearer` / `header` / `none`，默认 `basic` | `basic` |
| `WEBDAV_TOKEN` | 按需 | Bearer 或自定义 Header 的令牌 | — |
| `WEBDAV_AUTH_HEADER` | 否 | 自定义认证 Header 名，默认 `Authorization` | `X-Auth-Token` |
| `WEBDAV_AUTH_PREFIX` | 否 | Header 认证前缀（如 `Bearer`） | — |
| `WEBDAV_ROOT` | 否 | 网盘内的根目录，默认 `/` | `/files` |
| `PUBLIC_MODE` | 否 | `true`=无需分享码公开；默认 `false`=必须分享码 | `false` |
| `SHARE_CODES` | 按需 | 静态分享码（JSON 数组或行格式，见下） | 见下 |
| `ADMIN_TOKEN` | 按需 | 管理 API 令牌 | `change-me` |
| `APP_NAME` | 否 | 站点名称 | `我的网盘直链` |
| `WEBDAV_EXTRA_HEADERS` | 否 | 额外请求头 JSON（兼容性用） | `{"User-Agent":"Mozilla/5.0"}` |
| `WEBDAV_CACHE_TTL` | 否 | 上游缓存秒数（0=不缓存） | `0` |
| `WEBDAV_TIMEOUT` | 否 | 请求超时秒数（0=不超时） | `30` |
| `CORS_ORIGIN` | 否 | 跨域来源，默认 `*` | `*` |

4. **（可选）KV 绑定**：如需**动态创建限时分享码**，在项目设置中新建 KV namespace，绑定名 **`CODES_KV`**。
5. **兼容性日期/标志**：默认即可；无需 `nodejs_compat`。

---

## 四、使用方式

### 1. 直链下载
```
https://xxx.xxx.xxx/zip/kkk.zip            # 直接下载
https://xxx.xxx.xxx/zip/kkk.zip?download=1 # 强制附件下载
```
- 大文件走流式传输，支持断点续传（Range）。
- 路径中的空格、中文等特殊字符请使用 URL 编码（浏览器自动处理）。

### 2. 目录浏览
```
https://xxx.xxx.xxx/zip/        # HTML 文件列表
https://xxx.xxx.xxx/zip?list=1  # 同上
https://xxx.xxx.xxx/zip?list=json  # JSON 接口
```

### 3. 分享码（永久 / 限时）

**静态配置（无需 KV）** —— 在 `SHARE_CODES` 环境变量中配置：

```json
[
  {"code": "public", "paths": ["**"], "expireAt": 0, "note": "永久全站码"},
  {"code": "zip7d", "paths": ["/zip/**"], "expireAt": 1799999999999, "note": "限时码，仅 /zip 目录"}
]
```
- `expireAt: 0` → **永久**；`expireAt` 为毫秒时间戳 → **限时**。
- `paths` 通配：`**` 任意多段、`*` 单段内、`?` 单字符；不填默认 `**`。
- **目录范围**：`paths` 中以 `/` 结尾的目录会自动覆盖整棵子树（`/docs/` 等价 `/docs/**`，可访问 `/docs/` 及其下所有文件），静态与动态码均适用。

**动态生成（需 KV）** —— 通过管理 API：

```
# 创建限时分享码（24 小时后过期，仅 /vip 目录）
curl -X POST https://xxx.xxx.xxx/api/codes \
  -H "X-Admin-Token: 你的ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"paths":["/vip/**"],"expireInHours":24,"note":"给朋友"}'

# 返回
{ "code": "xYz9AbCd", "expireAt": 1799999999999, "links": {
    "pathForm": "https://xxx.xxx.xxx/s/xYz9AbCd/<网盘路径>",
    "queryForm": "https://xxx.xxx.xxx/<网盘路径>?code=xYz9AbCd" } }
```

**访问时携带分享码（两种形式）**：
```
https://xxx.xxx.xxx/zip/kkk.zip?code=xYz9AbCd     # 查询参数
https://xxx.xxx.xxx/s/xYz9AbCd/zip/kkk.zip        # 路径形式
```

### 4. 管理 API（需 `X-Admin-Token` 或 `?admin=` 或 `Authorization: Bearer`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/info` | 运行状态（脱敏，公开） |
| GET | `/api/codes` | 列出全部分享码 |
| POST | `/api/codes` | 创建分享码（`paths`/`expireInHours`/`expireAt`/`note`） |
| POST | `/api/codes/batch` | 批量生成分享链接（`paths` 数组，每路径一个分享码） |
| GET | `/api/codes/:code` | 查询单个分享码 |
| DELETE | `/api/codes/:code` | 删除动态分享码（静态码需改环境变量） |
| GET | `/api/list?path=/zip&code=xxx` | JSON 目录接口（管理员鉴权优先，或 `&code=xxx`） |

### 5. 管理面板（`/admin`）
浏览器打开 `https://xxx.xxx.xxx/admin`，输入 `ADMIN_TOKEN` 登录（令牌保存在本机浏览器，仅用于请求 `X-Admin-Token`）。
- **文件浏览**：面包屑导航浏览网盘目录，可勾选多个文件/目录，全选/取消选择。
- **分享生成**：选中文件/目录点击「生成分享链接」，弹窗内选择有效期：**永久 / 7 天 / 30 天 / 自定义到期时间**，路径范围可编辑，备注可选。
- **批量生成**：勾选多项后统一生成，每个路径生成独立分享码与链接，可逐条复制或一键复制全部链接。
- **分享列表**：展示全部（静态+动态）分享码，含路径范围、有效期/剩余时间、状态（有效/已过期）、来源；可一键复制访问链接、删除动态码。
> 动态生成分享码需绑定 KV（`CODES_KV`）；静态码（`SHARE_CODES`）在列表中以「静态」标记，不可删除。

---

## 五、WebDAV 提供商适配

| 提供商 | 认证方式 | 配置要点 |
|--------|----------|----------|
| 坚果云 | Basic | 用户名=邮箱，密码=应用密码，URL=`https://dav.jianguoyun.com/dav/` |
| Nextcloud / ownCloud | Basic / Bearer | Basic 应用密码或 Bearer 令牌 |
| OneDrive(个人) WebDAV | Basic | URL=`https://dav.dropbox.com`（Dropbox）或微软 WebDAV 端点 |
| 群晖 Synology | Basic | 启用 WebDAV 服务后按提示填写 |
| 威联通 QNAP | Basic | 同上 |
| alist 挂载的各类网盘 | Basic | alist 开启 WebDAV 后 Basic 认证 |
| 天翼云盘 / 百度网盘(经 alist) | Basic | 走 alist WebDAV 网关 |
| 自定义 Bearer/Header 服务 | Bearer / Header | 设 `WEBDAV_AUTH_TYPE` 与 `WEBDAV_TOKEN` |

通用适配能力：
- **认证**：Basic（UTF-8 安全编码，支持中文密码）/ Bearer / 自定义 Header / 无认证 / URL 内嵌凭据。
- **路径**：支持服务端子路径（`/dav` 等）与 `WEBDAV_ROOT` 根目录。
- **重定向**：自动跟随（适配对象存储签名跳转）。
- **编码**：路径逐段解码/编码，兼容中文、空格与特殊字符。
- **目录识别**：优先按 `resourcetype` 判断，服务商未返回 `<collection/>` 时自动按 href 以 `/` 结尾兜底识别目录。
- **扩展头**：`WEBDAV_EXTRA_HEADERS` 可注入 UA 等，绕过部分服务端风控。
- **Range/流式**：透传 Range 与大文件流式响应。

---

## 六、安全说明

- 默认 **分享码模式**（`PUBLIC_MODE=false`）：无分享码返回 401。
- 分享码支持**路径白名单**，未授权路径返回 403。
- 管理接口需 `ADMIN_TOKEN`，恒定时间比较防时序攻击。
- `/api/info` 已脱敏，不暴露用户名/密码/令牌。
- `X-Frame-Options` / `nosniff` / `Referrer-Policy` 等安全头已内置。
- 静态分享码随环境变量配置；动态分享码存于 KV（可随时吊销）。

> 提示：免费版 Cloudflare 对单请求响应体约 100MB 上限（流式传输下一般不受影响）；超大文件建议拆分或用付费套餐。

---

## 七、常见问题

**Q：直链 401？**
未配置分享码或分享码无效/过期。先确认 `PUBLIC_MODE` 或正确携带分享码。

**Q：目录打不开？**
确认 `WEBDAV_URL` 可访问、凭据正确；部分服务端限制 PROPFIND，可改用 `?list=json` 排查。目录识别已含 trailing-slash 兜底。

**Q：动态分享码创建返回 400？**
未绑定 `CODES_KV` KV namespace，请到项目设置创建并绑定。
**Q：/admin 登录失败？**
确认已配置 `ADMIN_TOKEN` 环境变量，且输入的是该值；未配置管理接口会返回 503。
**Q：/admin 按钮（登录/生成/切换）点了没反应，回车却有效？**
旧版本按钮为内联 `onclick` 调用 IIFE 内部函数导致失效，已修复为暴露全局函数；请重新部署最新 zip。
**Q：首页 / 返回 401「缺少分享码」？**
首页已内置落地页兜底（`/` 无需分享码），请重新部署最新 zip；若仍 401，检查项目域名与 `_routes.json` 是否已上传。
**Q：管理面板生成了分享链接但访问 401？**
生成的链接需带分享码；确认链接完整（含 `?code=` 或 `/s/码/`），且分享码未过期、路径在授权范围内。

**Q：中文文件名乱码？**
本项目已按 UTF-8 处理；若服务端非 UTF-8 编码文件名，建议在网盘侧统一编码。

**Q：如何彻底开放，不加分享码？**
将 `PUBLIC_MODE` 设为 `true`。
