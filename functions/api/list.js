// 路由：/api/list?path=/zip&code=xxx  → 目录 JSON 接口
// 鉴权：管理员（ADMIN_TOKEN）优先；否则按分享码/公开模式规则
import { json, error, decodePath, encodePath } from '../lib/utils.js';
import { getConfig } from '../lib/config.js';
import { checkAccess } from '../lib/codes.js';
import { checkAdmin } from '../lib/auth.js';
import { fetchListing } from '../lib/listing.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawPath = url.searchParams.get('path') || '/';
  const code = url.searchParams.get('code') || '';
  const pathDecoded = decodePath(rawPath);
  const pathEncoded = encodePath(pathDecoded);

  const cfg = getConfig(env);
  if (!cfg.webdav.url) return error('未配置 WEBDAV_URL', 500);

  // 管理员鉴权优先（用于管理面板浏览文件）
  const admin = checkAdmin(request, env);
  if (!admin.ok) {
    const access = await checkAccess(env, code || null, pathDecoded);
    if (!access.ok) return error(access.message, access.status);
  }

  try {
    const { self, members } = await fetchListing(cfg.webdav, pathEncoded);
    return json({
      ok: true,
      path: pathDecoded,
      items: members.map((m) => ({
        name: m.name,
        path: pathDecoded.replace(/\/+$/, '') + '/' + m.name + (m.isDir ? '/' : ''),
        isDir: m.isDir,
        size: m.isDir ? null : m.size,
        type: m.isDir ? null : m.type,
        lastModified: m.lastModified,
      })),
    });
  } catch (e) {
    const status = (e && e.status) || 502;
    return error(`目录读取失败：${(e && e.message) || e}`, status);
  }
}
