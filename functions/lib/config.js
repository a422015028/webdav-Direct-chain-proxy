// ---- 配置加载：优先读取环境变量（CloudFlareAssistant 项目设置中配置），缺省用默认值 ----

function parseBool(v, dflt = false) {
  if (v === undefined || v === null || v === '') return dflt;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

/**
 * 解析 SHARE_CODES 环境变量，支持两种格式：
 * 1) JSON 数组：[{"code":"abc","paths":["**"],"expireAt":0,"note":""}]
 *    expireAt=0 表示永久；也可用 expireInHours 表示小时数
 * 2) 每行一个：code,expireAt毫秒,路径1|路径2,备注
 */
function parseCodes(str) {
  if (!str) return [];
  const s = String(str).trim();
  if (!s) return [];

  // 尝试 JSON
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (!Array.isArray(arr)) return [];
      return arr
        .map((c) => {
          const code = String(c.code || c.key || '').trim();
          if (!code) return null;
          let expireAt = 0;
          if (c.expireAt) expireAt = Number(c.expireAt);
          else if (c.expireInHours) expireAt = Date.now() + Number(c.expireInHours) * 3600000;
          return {
            code,
            paths: Array.isArray(c.paths) && c.paths.length ? c.paths.map(String) : ['**'],
            expireAt,
            note: c.note || '',
            source: 'static',
            createdAt: c.createdAt || 0,
          };
        })
        .filter(Boolean);
    } catch {
      /* fallthrough */
    }
  }

  // 尝试行格式
  return s
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split(',').map((x) => x.trim());
      const code = parts[0] || '';
      if (!code) return null;
      const expireAt = parts[1] ? Number(parts[1]) : 0;
      const paths = parts[2] ? parts[2].split('|').map(String) : ['**'];
      return { code, paths, expireAt, note: parts[3] || '', source: 'static', createdAt: 0 };
    })
    .filter(Boolean);
}

/** 读取完整运行配置 */
export function getConfig(env) {
  const cfg = {
    appName: env.APP_NAME || 'WebDAV 直链下载',
    publicMode: parseBool(env.PUBLIC_MODE, false),
    corsOrigin: env.CORS_ORIGIN || '*',
    adminToken: env.ADMIN_TOKEN || '',
    webdav: {
      url: String(env.WEBDAV_URL || '').trim(),
      username: env.WEBDAV_USERNAME || '',
      password: env.WEBDAV_PASSWORD || '',
      authType: String(env.WEBDAV_AUTH_TYPE || 'basic').toLowerCase(),
      token: env.WEBDAV_TOKEN || '',
      authHeader: env.WEBDAV_AUTH_HEADER || 'Authorization',
      authPrefix: env.WEBDAV_AUTH_PREFIX || '',
      rootPath: env.WEBDAV_ROOT || '/',
      cacheTtl: Number(env.WEBDAV_CACHE_TTL) || 0,
      timeout: Number(env.WEBDAV_TIMEOUT) || 0,
      extraHeaders: parseExtraHeaders(env.WEBDAV_EXTRA_HEADERS),
    },
    codes: parseCodes(env.SHARE_CODES),
  };

  // 兼容 URL 内嵌凭据：https://user:pass@host/path
  try {
    const u = new URL(cfg.webdav.url);
    if (u.username) {
      if (!cfg.webdav.username) cfg.webdav.username = decodeURIComponent(u.username);
      if (!cfg.webdav.password) cfg.webdav.password = decodeURIComponent(u.password);
      u.username = '';
      u.password = '';
      cfg.webdav.url = u.toString();
    }
  } catch {
    /* 非完整 URL 时忽略 */
  }

  return cfg;
}

function parseExtraHeaders(str) {
  if (!str) return {};
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj === 'object') return obj;
  } catch {
    /* ignore */
  }
  return {};
}
