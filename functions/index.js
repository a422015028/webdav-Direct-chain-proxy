// 路由：/  → 根路径无分享码直接 401（不需要首页）
import { error } from './lib/utils.js';

export async function onRequestGet() {
  return error('缺少分享码：请携带 ?code=分享码，或使用 /s/分享码/路径 形式', 401);
}

export async function onRequestHead() {
  return new Response(null, { status: 401 });
}
