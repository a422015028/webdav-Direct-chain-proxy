// 路由：/api/codes/:code  → 单个分享码查询 / 删除（需管理令牌）
import { json, error } from '../../lib/utils.js';
import { checkAdmin } from '../../lib/auth.js';
import { findCode, deleteDynamicCode } from '../../lib/codes.js';

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  const code = params && params.code ? safeDecode(params.code) : '';
  const found = await findCode(env, code);
  if (!found) return error('分享码不存在', 404);

  return json({
    ok: true,
    code: found.code,
    paths: found.paths,
    expireAt: found.expireAt,
    permanent: !found.expireAt,
    expired: found.expireAt ? Date.now() > found.expireAt : false,
    note: found.note,
    source: found.source,
    createdAt: found.createdAt,
  });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  const code = params && params.code ? safeDecode(params.code) : '';
  const found = await findCode(env, code);
  if (!found) return error('分享码不存在', 404);
  if (found.source === 'static') {
    return error('静态分享码无法删除，请直接修改环境变量 SHARE_CODES', 400);
  }

  await deleteDynamicCode(env, code);
  return json({ ok: true, message: `分享码 ${code} 已删除` });
}
