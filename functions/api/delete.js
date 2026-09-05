// 路由：POST /api/delete  → 批量删除文件/目录（需管理令牌）
// body: { "paths": ["/a.zip","/dir/"] }
import { json, error } from '../lib/utils.js';
import { checkAdmin } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import { davDelete } from '../lib/webdav.js';
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

  const paths = Array.isArray(body.paths) ? body.paths.map((p) => String(p).trim()).filter(Boolean) : [];
  if (!paths.length) return error('paths 不能为空', 400);
  if (paths.length > 200) return error('单次批量最多 200 个路径', 400);

  const cfg = getConfig(env);
  const results = [];
  let failed = 0;

  for (const p of paths) {
    if (!p.startsWith('/')) {
      results.push({ path: p, ok: false, error: '路径必须以 / 开头' });
      failed++;
      continue;
    }
    try {
      await davDelete(cfg.webdav, encodePath(p));
      results.push({ path: p, ok: true });
    } catch (e) {
      results.push({ path: p, ok: false, error: (e && e.message) || '删除失败', status: e.status });
      failed++;
    }
  }

  return json({
    ok: failed === 0,
    total: paths.length,
    success: paths.length - failed,
    failed,
    results,
  }, failed === 0 ? 200 : 207);
}

export async function onRequest(context) {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
