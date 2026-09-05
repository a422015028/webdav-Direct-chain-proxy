// 路由：POST /api/codes/batch  → 批量生成分享链接（每路径独立分享码）
// 请求体：{ "paths": ["/zip/a.zip","/dir/"], "expireInHours": 168, "expireAt": 0, "note": "" }
import { json, error } from '../../lib/utils.js';
import { checkAdmin } from '../../lib/auth.js';
import { createDynamicCode, displayPath } from '../../lib/codes.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = checkAdmin(request, env);
  if (!admin.ok) return error(admin.message, admin.status);

  if (!env.CODES_KV) {
    return error('未配置 KV 绑定 CODES_KV，无法动态创建分享码。请在项目设置中创建 KV namespace 并绑定为 CODES_KV', 400);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return error('请求体必须是 JSON', 400);
  }

  const paths = Array.isArray(body.paths) ? body.paths.map((p) => String(p).trim()).filter(Boolean) : [];
  if (!paths.length) {
    return error('paths 不能为空（至少一个路径）', 400);
  }
  if (paths.length > 200) {
    return error('单次批量最多 200 个路径', 400);
  }

  // 有效期：永久 / expireAt / expireInHours
  let expireAt = body.expireAt ? Number(body.expireAt) : 0;
  if (body.expireInHours) {
    const h = Number(body.expireInHours);
    if (!(h > 0)) return error('expireInHours 必须为正数', 400);
    expireAt = Date.now() + h * 3600000;
  }
  if (expireAt && expireAt < Date.now()) {
    return error('过期时间已过', 400);
  }

  const note = body.note || '';
  const origin = new URL(request.url).origin;
  const items = [];

  // 逐个生成独立分享码
  for (const p of paths) {
    const record = await createDynamicCode(env, { paths: [p], expireAt, note });
    const dp = displayPath(p);
    items.push({
      path: p,
      code: record.code,
      expireAt: record.expireAt,
      permanent: !record.expireAt,
      links: {
        queryForm: `${origin}${encodeURI(dp)}?code=${encodeURIComponent(record.code)}`,
        pathForm: `${origin}/s/${encodeURIComponent(record.code)}${encodeURI(dp)}`,
      },
    });
  }

  return json({ ok: true, count: items.length, expireAt, items }, 201);
}
