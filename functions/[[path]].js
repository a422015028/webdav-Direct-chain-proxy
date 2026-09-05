// 路由：/*  → 直链下载 / 目录浏览（分享码支持 ?code=xxx）
// 根路径 / 无分享码时直接 401（不需要首页）
import { handleRequest } from './lib/download.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code') || '';
  return handleRequest(context, { code, restPath: url.pathname, isHead: false });
}

export async function onRequestHead(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code') || '';
  return handleRequest(context, { code, restPath: url.pathname, isHead: true });
}

export async function onRequest(context) {
  return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
}
