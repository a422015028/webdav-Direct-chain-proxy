// 路由：/api/info  → 运行状态（脱敏公开信息，无密钥泄露）
import { getConfig } from './../lib/config.js';

export async function onRequestGet(context) {
  const { env } = context;
  const cfg = getConfig(env);
  const info = {
    ok: true,
    app: cfg.appName,
    webdav: {
      url: maskUrl(cfg.webdav.url),
      authType: cfg.webdav.authType,
      hasAuth: !!(cfg.webdav.username || cfg.webdav.password || cfg.webdav.token),
      rootPath: cfg.webdav.rootPath,
    },
    publicMode: cfg.publicMode,
    kvEnabled: !!env.CODES_KV,
    codesConfigured: cfg.codes.length,
    time: new Date().toISOString(),
  };
  return new Response(JSON.stringify(info, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function maskUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.username) {
      u.username = '***';
      u.password = '***';
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}
