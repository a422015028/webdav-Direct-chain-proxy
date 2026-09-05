// 路由：POST /api/mkdir  → 新建文件夹（需管理令牌）
// body: { "path": "/目标目录/新文件夹/" }
import { json, error } from '../lib/utils.js';
import { checkAdmin } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import { davMkcol } from '../lib/webdav.js';
import { encodePath } from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return error('请求体必须是 JSON', 400);
  }

  let path = String(body.path || '').trim();
  if (!path || !path.startsWith('/')) return error('path 必须以 / 开头', 400);
  // 目录路径以 / 结尾
  if (!path.endsWith('/')) path += '/';

  const cfg = getConfig(env);
  try {
    await davMkcol(cfg.webdav, encodePath(path));
    return json({ ok: true, path }, 201);
  } catch (e) {
    return error((e && e.message) || '新建文件夹失败', e.status || 502);
  }
}

export async function onRequest(context) {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
