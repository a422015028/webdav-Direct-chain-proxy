// ---- 通用工具函数 ----

/** 构造 JSON 响应 */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

/** 构造文本/HTML 响应 */
export function textResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers },
  });
}

/** 统一错误响应（JSON） */
export function error(message, status = 500, extra = {}) {
  return json({ ok: false, error: message, ...extra }, status);
}

/** 对百分号编码的路径逐段解码（失败段保持原样） */
export function decodePath(pathname) {
  const segments = String(pathname).split('/');
  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  return decoded.join('/');
}

/** 对解码后的路径逐段重新编码（安全往返） */
export function encodePath(path) {
  return String(path)
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

/** 归一化斜杠：保证以 / 开头、不以 / 结尾（根路径返回 /） */
export function normalizeSlash(p) {
  if (!p) return '/';
  let s = String(p);
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

/** UTF-8 安全的 Base64 编码（兼容中文用户名/密码） */
export function base64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(String(str));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** 恒定时间字符串比较（防时序攻击） */
export function constantTimeEqual(a, b) {
  const ba = new TextEncoder().encode(String(a));
  const bb = new TextEncoder().encode(String(b));
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

/** 生成随机令牌 */
export function randomToken(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** 简单 glob → 正则。支持 *（非斜杠）、**（任意多段）、?（单字符） */
export function globToRegex(pattern) {
  const p = String(pattern);
  let re = '^';
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        re += '.*';
        i += 2;
        if (p[i] === '/') i += 1; // /**/ 中的斜杠并入
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  re += '$';
  return new RegExp(re);
}

/** 取路径最后一段（文件名） */
export function basename(path) {
  const s = String(path).replace(/\/+$/, '');
  const idx = s.lastIndexOf('/');
  return idx >= 0 ? s.slice(idx + 1) : s;
}
