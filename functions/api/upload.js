// 路由：POST /api/upload  → 上传文件到 WebDAV（需管理令牌）
// query: path=目标目录（以 / 结尾）  filename=文件名
// body: 文件二进制流（直接透传到上游 PUT）
import { json, error } from '../lib/utils.js';
import { checkAdmin } from '../lib/auth.js';
import { getConfig } from '../lib/config.js';
import { davPut } from '../lib/webdav.js';
import { encodePath } from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  const url = new URL(request.url);
  const dir = (url.searchParams.get('path') || '/').trim();
  const filename = (url.searchParams.get('filename') || '').trim();

  if (!filename) return error('filename 不能为空', 400);
  if (!dir.startsWith('/')) return error('path 必须以 / 开头', 400);

  // 安全：禁止文件名含路径分隔符或 ..
  if (filename.includes('/') || filename.includes('\\') || filename === '.' || filename === '..') {
    return error('文件名不合法', 400);
  }

  const cfg = getConfig(env);
  const fullPath = (dir.endsWith('/') ? dir : dir + '/') + filename;
  const encodedPath = encodePath(fullPath);

  try {
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    await davPut(cfg.webdav, encodedPath, request.body, contentType);
    return json({ ok: true, path: fullPath, name: filename }, 201);
  } catch (e) {
    return error((e && e.message) || '上传失败', e.status || 502);
  }
}

export async function onRequest(context) {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
