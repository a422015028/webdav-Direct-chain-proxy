// ---- 分享码系统：支持永久码（静态配置）与限时码（KV 动态管理）----
import { getConfig } from './config.js';
import { globToRegex, randomToken } from './utils.js';

const KV_PREFIX = 'code:';

/** 静态分享码（来自 SHARE_CODES 环境变量） */
export function getStaticCodes(env) {
  return getConfig(env).codes;
}

/** 动态分享码（来自 KV 绑定 CODES_KV） */
export async function getDynamicCodes(env) {
  if (!env.CODES_KV) return [];
  const out = [];
  try {
    const list = await env.CODES_KV.list({ prefix: KV_PREFIX });
    for (const key of list.keys) {
      const raw = await env.CODES_KV.get(key.name);
      if (raw) {
        try {
          out.push({ ...JSON.parse(raw), key: key.name });
        } catch {
          /* skip bad record */
        }
      }
    }
  } catch (e) {
    /* KV 不可用时忽略 */
  }
  return out;
}

/** 查找分享码（静态优先，其次 KV） */
export async function findCode(env, code) {
  if (!code) return null;
  const codeStr = String(code).trim();
  if (!codeStr) return null;

  const staticFound = getStaticCodes(env).find((c) => c.code === codeStr);
  if (staticFound) return staticFound;

  if (env.CODES_KV) {
    try {
      const raw = await env.CODES_KV.get(KV_PREFIX + codeStr);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, source: 'dynamic', key: KV_PREFIX + codeStr };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 判断分享码是否过期（expireAt=0 表示永久） */
export function codeExpired(code) {
  return !!(code && code.expireAt && Date.now() > code.expireAt);
}

/** 判断分享码是否有权访问指定路径（glob 匹配） */
export function codeMatchesPath(code, path) {
  const paths = Array.isArray(code.paths) && code.paths.length ? code.paths : ['**'];
  const p = String(path).replace(/\/+$/, '') || '/';
  const pNoSlash = p.replace(/^\//, '');
  return paths.some((pat) => {
    if (pat === '*' || pat === '**') return true;
    // 目录范围：以 / 结尾的路径匹配整棵子树（/docs/ 等价 /docs/**）
    const target = pat.endsWith('/') ? pat + '**' : pat;
    const re = globToRegex(target);
    return re.test(p) || re.test(pNoSlash) || re.test(p + '/');
  });
}

/**
 * 访问校验。返回 { ok, status, message, code, mode }
 * - 公开模式（PUBLIC_MODE=true）下无需分享码
 * - 否则必须携带有效且未过期、且有路径权限的分享码
 */
export async function checkAccess(env, code, path) {
  const cfg = getConfig(env);
  if (cfg.publicMode) {
    return { ok: true, code: null, mode: 'public' };
  }
  if (!code) {
    return {
      ok: false,
      status: 401,
      message: '缺少分享码：请携带 ?code=分享码，或使用 /s/分享码/路径 形式',
    };
  }
  const found = await findCode(env, code);
  if (!found) {
    return { ok: false, status: 403, message: '分享码无效' };
  }
  if (codeExpired(found)) {
    return { ok: false, status: 403, message: '分享码已过期' };
  }
  if (!codeMatchesPath(found, path)) {
    return { ok: false, status: 403, message: '该分享码无权访问此路径' };
  }
  return { ok: true, code: found, mode: 'code' };
}

/** 校验分享码字符串格式（字母数字中划线下划线，4-64 位） */
export function isValidCodeFormat(code) {
  return /^[A-Za-z0-9_-]{4,64}$/.test(String(code));
}

/** 动态创建分享码（需要 KV 绑定）。expireAt=0/缺省=永久；expireInHours=小时数 */
export async function createDynamicCode(env, { code, paths, expireAt, expireInHours, note }) {
  if (!env.CODES_KV) {
    throw new Error('未配置 KV 绑定 CODES_KV，无法动态创建分享码。请改为静态配置 SHARE_CODES。');
  }
  const finalCode = code || randomToken(10);
  if (!isValidCodeFormat(finalCode)) {
    throw new Error('分享码格式不合法：仅支持字母数字中划线下划线，长度 4-64');
  }
  let finalExpireAt = expireAt || 0;
  if (expireInHours) {
    const h = Number(expireInHours);
    if (!(h > 0)) throw new Error('expireInHours 必须为正数');
    finalExpireAt = Date.now() + h * 3600000;
  }
  const record = {
    code: finalCode,
    paths: normalizeSharePaths(paths),
    expireAt: finalExpireAt,
    note: note || '',
    createdAt: Date.now(),
    source: 'dynamic',
  };
  await env.CODES_KV.put(KV_PREFIX + finalCode, JSON.stringify(record));
  return record;
}

/** 分享路径规范化：目录路径 /docs/ → /docs/**（使其可访问整棵子树），空则默认全站 ** */
export function normalizeSharePaths(paths) {
  const arr = Array.isArray(paths) && paths.length ? paths : ['**'];
  return arr
    .map((p) => {
      const s = String(p).trim();
      if (!s) return null;
      if (s === '*' || s === '**') return '**';
      return s.endsWith('/') ? s + '**' : s;
    })
    .filter(Boolean);
}

/** 把权限匹配路径转为显示/链接用的规范路径（去掉 /** 通配符后缀，目录保留末尾 /） */
export function displayPath(p) {
  if (!p || p === '**' || p === '*') return '/';
  if (p.endsWith('/**')) return p.slice(0, -2);
  return p;
}

/** 删除动态分享码（返回是否删除成功） */
export async function deleteDynamicCode(env, code) {
  if (!env.CODES_KV) return false;
  const codeStr = String(code).trim();
  if (!codeStr) return false;
  await env.CODES_KV.delete(KV_PREFIX + codeStr);
  return true;
}
