// ---- WebDAV 客户端：适配主流提供商的各种认证方式 ----
import { base64EncodeUtf8 } from './utils.js';

/** 自定义错误，携带 HTTP 状态码 */
export class WebdavError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'WebdavError';
    this.status = status;
  }
}

/** 根据认证配置构造请求头 */
export function buildAuthHeaders(cfg) {
  const { authType, username, password, token, authHeader, authPrefix } = cfg;
  const headers = {};
  switch (authType) {
    case 'basic':
      if (username || password) {
        headers['Authorization'] = 'Basic ' + base64EncodeUtf8(`${username}:${password}`);
      }
      break;
    case 'bearer':
      if (token) headers['Authorization'] = 'Bearer ' + token;
      break;
    case 'header':
      if (token && authHeader) {
        headers[authHeader] = (authPrefix ? authPrefix + ' ' : '') + token;
      }
      break;
    case 'none':
    default:
      break;
  }
  return headers;
}

/** 构造上游完整 URL：base + root + 请求路径（保留百分号编码） */
export function buildUrl(cfg, encodedPath) {
  let base = cfg.url;
  if (!base) return '';
  if (!base.endsWith('/')) base += '/';
  let root = String(cfg.rootPath || '/').replace(/^\/+|\/+$/g, '');
  let prefix = base;
  if (root) prefix += root + '/';
  const p = String(encodedPath || '/').replace(/^\/+/, '');
  return prefix + p;
}

function fetchWithTimeout(url, init, timeoutSec = 0) {
  if (!timeoutSec || timeoutSec <= 0) return fetch(url, init);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutSec * 1000);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function buildBaseHeaders(cfg) {
  return { ...buildAuthHeaders(cfg), ...(cfg.extraHeaders || {}) };
}

/** GET 下载文件，返回 { url, res }，res 为流式响应 */
export async function davGet(cfg, encodedPath, headers = {}) {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const init = {
    method: 'GET',
    headers: { ...buildBaseHeaders(cfg), ...headers },
    redirect: 'follow',
  };
  if (cfg.cacheTtl > 0) init.cf = { cacheTtl: cfg.cacheTtl, cacheEverything: true };
  const res = await fetchWithTimeout(url, init, cfg.timeout);
  return { url, res };
}

/** HEAD 探测文件，返回 { url, res } */
export async function davHead(cfg, encodedPath, headers = {}) {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const init = {
    method: 'HEAD',
    headers: { ...buildBaseHeaders(cfg), ...headers },
    redirect: 'follow',
  };
  if (cfg.cacheTtl > 0) init.cf = { cacheTtl: cfg.cacheTtl, cacheEverything: true };
  const res = await fetchWithTimeout(url, init, cfg.timeout);
  return { url, res };
}

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:resourcetype/>
    <d:getlastmodified/>
    <d:getetag/>
  </d:prop>
</d:propfind>`;

/** PROPFIND 列目录，返回解析后的条目数组 */
export async function davPropfind(cfg, encodedPath, depth = 1) {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const res = await fetchWithTimeout(
    url,
    {
      method: 'PROPFIND',
      headers: {
        ...buildBaseHeaders(cfg),
        Depth: String(depth),
        'Content-Type': 'application/xml; charset=utf-8',
        Accept: 'application/xml, text/xml, */*',
      },
      body: PROPFIND_BODY,
      redirect: 'follow',
    },
    cfg.timeout
  );
  if (!res.ok) {
    throw new WebdavError(`PROPFIND ${encodedPath} 失败：HTTP ${res.status}`, res.status);
  }
  const xml = await res.text();
  return parseMultiStatus(xml);
}

/** 解析 WebDAV multistatus XML（命名空间无关） */
export function parseMultiStatus(xml) {
  const items = [];
  const re = /<(?:[A-Za-z0-9_-]+:)?response[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?response>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const href = extractTag(block, 'href');
    if (!href) continue;
    const isCollection =
      /<(?:[A-Za-z0-9_-]+:)?collection\s*\/?>/i.test(block) ||
      /<(?:[A-Za-z0-9_-]+:)?resourcetype[^>]*>\s*<(?:[A-Za-z0-9_-]+:)?collection\s*\/?>/i.test(block) ||
      /\/$/.test(href); // href 以 / 结尾视为目录（部分服务商不返回 collection 标记）
    const lengthRaw = extractTag(block, 'getcontentlength');
    items.push({
      href: xmlUnescape(href),
      name: xmlUnescape(extractTag(block, 'displayname')),
      size: lengthRaw ? Number(lengthRaw.trim()) : 0,
      type: xmlUnescape(extractTag(block, 'getcontenttype')),
      isDir: isCollection,
      lastModified: xmlUnescape(extractTag(block, 'getlastmodified')),
      etag: xmlUnescape(extractTag(block, 'getetag')),
    });
  }
  return items;
}

function extractTag(block, tag) {
  const re = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${tag}>`,
    'i'
  );
  const m = re.exec(block);
  return m ? m[1].trim() : '';
}

function xmlUnescape(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** PUT 上传文件，body 为 ReadableStream / ArrayBuffer / 字符串 */
export async function davPut(cfg, encodedPath, body, contentType = 'application/octet-stream') {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const res = await fetchWithTimeout(
    url,
    {
      method: 'PUT',
      headers: {
        ...buildBaseHeaders(cfg),
        'Content-Type': contentType,
      },
      body,
      redirect: 'follow',
    },
    cfg.timeout
  );
  if (!res.ok) {
    throw new WebdavError(`PUT ${encodedPath} 失败：HTTP ${res.status}`, res.status);
  }
  return { url, status: res.status };
}

/** DELETE 删除文件或目录（目录需为空，部分服务商支持递归） */
export async function davDelete(cfg, encodedPath) {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const res = await fetchWithTimeout(
    url,
    {
      method: 'DELETE',
      headers: { ...buildBaseHeaders(cfg) },
      redirect: 'follow',
    },
    cfg.timeout
  );
  if (!res.ok && res.status !== 404) {
    throw new WebdavError(`DELETE ${encodedPath} 失败：HTTP ${res.status}`, res.status);
  }
  return { url, status: res.status };
}

/** MKCOL 新建文件夹 */
export async function davMkcol(cfg, encodedPath) {
  const url = buildUrl(cfg, encodedPath);
  if (!url) throw new WebdavError('WEBDAV_URL 未配置', 500);
  const res = await fetchWithTimeout(
    url,
    {
      method: 'MKCOL',
      headers: { ...buildBaseHeaders(cfg) },
      redirect: 'follow',
    },
    cfg.timeout
  );
  if (!res.ok && res.status !== 405) {
    throw new WebdavError(`MKCOL ${encodedPath} 失败：HTTP ${res.status}`, res.status);
  }
  return { url, status: res.status };
}
