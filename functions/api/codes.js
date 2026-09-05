// 路由：/api/codes  → 分享码管理（需管理令牌）
// GET  ：列出全部分享码（静态 + 动态）
// POST ：创建分享码（限时/永久，需 KV 绑定）
import { json, error } from '../lib/utils.js';
import { checkAdmin } from '../lib/auth.js';
import { getStaticCodes, getDynamicCodes, createDynamicCode, isValidCodeFormat, normalizeSharePaths, displayPath } from '../lib/codes.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  const staticCodes = getStaticCodes(env).map((c) => ({
    code: c.code,
    paths: c.paths,
    expireAt: c.expireAt,
    note: c.note,
    source: c.source,
    expired: c.expireAt ? Date.now() > c.expireAt : false,
  }));
  const dynamicCodes = (await getDynamicCodes(env)).map((c) => ({
    code: c.code,
    paths: c.paths,
    expireAt: c.expireAt,
    note: c.note,
    source: 'dynamic',
    createdAt: c.createdAt,
    expired: c.expireAt ? Date.now() > c.expireAt : false,
  }));

  return json({ ok: true, kvEnabled: !!env.CODES_KV, codes: [...staticCodes, ...dynamicCodes] });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body 可空 */
  }

  const code = body.code ? String(body.code).trim() : '';
  if (code && !isValidCodeFormat(code)) {
    return error('分享码格式不合法：仅支持字母数字中划线下划线，长度 4-64', 400);
  }

  const paths = normalizeSharePaths(body.paths);
  let expireAt = body.expireAt ? Number(body.expireAt) : 0;
  if (body.expireInHours) {
    const h = Number(body.expireInHours);
    if (!(h > 0)) return error('expireInHours 必须为正数', 400);
    expireAt = Date.now() + h * 3600000;
  }
  if (expireAt && expireAt < Date.now()) {
    return error('过期时间已过', 400);
  }

  try {
    const record = await createDynamicCode(env, { code, paths, expireAt, note: body.note || '' });
    const origin = new URL(request.url).origin;
    // 用 displayPath 把权限路径转为规范显示路径（去掉 /** 通配符后缀）
    const pathSuffix = encodeURI(displayPath(record.paths[0]));
    return json(
      {
        ok: true,
        code: record.code,
        paths: record.paths,
        expireAt: record.expireAt,
        permanent: !record.expireAt,
        note: record.note,
        links: {
          pathForm: `${origin}/s/${encodeURIComponent(record.code)}${pathSuffix}`,
          queryForm: `${origin}${pathSuffix}?code=${encodeURIComponent(record.code)}`,
        },
      },
      201
    );
  } catch (e) {
    return error((e && e.message) || '创建分享码失败', 400);
  }
}
