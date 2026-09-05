// ---- 目录列表：基于 PROPFIND 解析 ----
import { davPropfind } from './webdav.js';

/** 拉取并整理目录列表，返回 { self, members } */
export async function fetchListing(cfg, encodedPath) {
  const items = await davPropfind(cfg, encodedPath, 1);
  if (!items.length) return { self: null, members: [] };
  const self = items[0];
  const baseHref = normalizeHref(self.href);
  const members = items
    .slice(1)
    .map((it) => {
      let name = nameFromHref(it.href, baseHref);
      if (!name && it.name) name = it.name;
      return { ...it, name };
    })
    .filter((it) => it.name);
  return { self, members };
}

function normalizeHref(href) {
  let h = String(href || '');
  if (!h.endsWith('/')) h += '/';
  return h;
}

/** 从成员 href 推导相对名称（兼容绝对 URL / 根相对路径 / 相对路径） */
export function nameFromHref(href, baseHref) {
  let rel = href;
  if (baseHref && rel.startsWith(baseHref)) {
    rel = rel.slice(baseHref.length);
  } else {
    try {
      const h = new URL(href).pathname;
      const b = new URL(baseHref).pathname;
      if (h.startsWith(b)) rel = h.slice(b.length);
    } catch {
      /* 相对路径直接使用 */
    }
  }
  try {
    return decodeURIComponent(rel.replace(/^\/+|\/+$/g, ''));
  } catch {
    return rel.replace(/^\/+|\/+$/g, '');
  }
}
