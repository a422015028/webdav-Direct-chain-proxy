// 路由：/s/<分享码>/<路径>  → 分享码路径形式
// 浏览器访问文件 → 提取页；浏览器访问目录 → 分享浏览器页面；非浏览器 → 直接下载/目录
import { handleRequest } from '../lib/download.js';
import { getConfig } from '../lib/config.js';
import { renderExtractPage, renderShareBrowserPage } from '../lib/html.js';

function extract(context) {
  const url = new URL(context.request.url);
  const raw = url.pathname;
  const segs = raw.split('/');
  let code = '';
  let rest = '/';
  if (segs.length >= 3 && segs[2]) {
    try {
      code = decodeURIComponent(segs[2]);
    } catch {
      code = segs[2];
    }
    rest = '/' + segs.slice(3).join('/');
  }
  // 兼容旧分享码：去掉目录通配符 /** 后缀，转为规范目录路径
  if (rest.endsWith('/**')) rest = rest.slice(0, -2);
  return { code, rest };
}

function wantsHtml(request) {
  const accept = (request && request.headers && request.headers.get('Accept')) || '';
  return /text\/html/.test(accept);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const { code, rest } = extract(context);
  const isDir = !rest || rest.endsWith('/') || rest === '/';
  if (wantsHtml(request) && code) {
    const cfg = getConfig(env);
    const origin = new URL(request.url).origin;
    if (isDir) {
      return new Response(renderShareBrowserPage(cfg, origin, code, rest || '/'), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    return new Response(renderExtractPage(cfg, origin, code, rest, false), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return handleRequest(context, { code, restPath: rest, isHead: false });
}

export async function onRequestHead(context) {
  const { code, rest } = extract(context);
  return handleRequest(context, { code, restPath: rest, isHead: true });
}

export async function onRequest(context) {
  return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
}
