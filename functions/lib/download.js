// ---- 主请求处理器：直链下载 / 目录浏览 / 分享码校验（[[path]] 与 /s/ 共用）----
import { getConfig } from './config.js';
import { checkAccess } from './codes.js';
import { davGet, davHead } from './webdav.js';
import { fetchListing } from './listing.js';
import { renderListingPage, renderErrorPage } from './html.js';
import { json, error, decodePath, basename } from './utils.js';

const PASS_THROUGH_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
  'cache-control',
  'content-disposition',
];

/**
 * 统一入口。
 * @param context Pages Function context
 * @param opts { code, restPath, isHead }
 */
export async function handleRequest(context, opts) {
  const { request, env } = context;
  const { code = '', restPath: rawRestPath = '/', isHead = false } = opts || {};
  // 兼容旧分享链接：去掉目录通配符 /** 后缀，转为规范目录路径
  const restPath = rawRestPath.endsWith('/**') ? rawRestPath.slice(0, -2) : rawRestPath;

  const cfg = getConfig(env);
  if (!cfg.webdav.url) {
    return errResponse(request, cfg, 500, '未配置 WEBDAV_URL，请先在 CloudFlareAssistant 项目设置中配置环境变量');
  }

  const pathDecoded = decodePath(restPath);
  const origin = new URL(request.url).origin;

  // 1. 分享码访问校验
  const access = await checkAccess(env, code || null, pathDecoded);
  if (!access.ok) {
    return errResponse(request, cfg, access.status, access.message);
  }
  const activeCode = access.code ? access.code.code : '';

  // 2. 目录浏览：路径以 / 结尾，或 ?list=1 / ?list=json
  const q = new URL(request.url).searchParams;
  if (q.get('list') === 'json') {
    return jsonListing(env, cfg, restPath, pathDecoded, activeCode);
  }
  const isDirRequest = restPath.endsWith('/');
  if (isDirRequest || q.has('list')) {
    return dirListing(request, env, cfg, origin, restPath, pathDecoded, activeCode, isHead);
  }

  // 3. 文件直链下载
  return fileDownload(request, env, cfg, origin, restPath, activeCode, isHead);
}

/** 文件直链下载：转发到上游 WebDAV 并流式返回 */
async function fileDownload(request, env, cfg, origin, encodedPath, code, isHead) {
  const url = new URL(request.url);
  const headers = {};
  const range = request.headers.get('Range');
  if (range) headers['Range'] = range;
  const forceDownload = url.searchParams.get('download') === '1';

  let upstream;
  try {
    const fn = isHead ? davHead : davGet;
    const r = await fn(cfg.webdav, encodedPath, headers);
    upstream = r.res;
  } catch (e) {
    const status = (e && e.status) || 502;
    return errResponse(request, cfg, status, `上游请求失败：${(e && e.message) || e}`);
  }

  // 上游判定为目录（405/301/302）时，尝试目录浏览兜底
  if ([405, 301, 302].includes(upstream.status)) {
    try {
      return dirListing(request, env, cfg, origin, encodedPath, decodePath(encodedPath), code, isHead);
    } catch {
      /* fallthrough */
    }
  }

  const resHeaders = new Headers();
  for (const h of PASS_THROUGH_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) resHeaders.set(h, v);
  }

  if (forceDownload) {
    const name = basename(decodePath(encodedPath)) || 'download';
    resHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  }
  if (!resHeaders.has('Accept-Ranges')) resHeaders.set('Accept-Ranges', 'bytes');

  const status = upstream.status || 200;
  const body = isHead ? null : upstream.body;
  return new Response(body, { status, headers: resHeaders });
}

/** 目录浏览：HTML 列表页 */
async function dirListing(request, env, cfg, origin, encodedPath, pathDecoded, code, isHead) {
  try {
    const { self, members } = await fetchListing(cfg.webdav, encodedPath);
    if (isHead) return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response(renderListingPage(cfg, origin, encodedPath, pathDecoded, members, code), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const status = (e && e.status) || 502;
    return errResponse(request, cfg, status, `目录读取失败：${(e && e.message) || e}`);
  }
}

/** 目录浏览：JSON 接口 */
async function jsonListing(env, cfg, encodedPath, pathDecoded, code) {
  try {
    const { self, members } = await fetchListing(cfg.webdav, encodedPath);
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

/** 是否应返回 HTML 错误页 */
function wantsHtml(request) {
  const accept = (request && request.headers && request.headers.get('Accept')) || '';
  return /text\/html/.test(accept);
}

function errResponse(request, cfg, status, message) {
  if (wantsHtml(request)) {
    let origin = '';
    try {
      origin = new URL(request.url).origin;
    } catch {
      /* ignore */
    }
    return new Response(renderErrorPage(cfg, origin, status, message), {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return error(message, status);
}
