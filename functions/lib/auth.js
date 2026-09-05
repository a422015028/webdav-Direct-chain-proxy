// ---- 管理接口鉴权：基于 ADMIN_TOKEN ----
import { getConfig } from './config.js';
import { constantTimeEqual } from './utils.js';

/**
 * 校验管理令牌。来源优先级：query ?admin= > X-Admin-Token 头 > Authorization: Bearer
 * 返回 { ok, status, message }
 */
export function checkAdmin(request, env) {
  const token = getConfig(env).adminToken;
  if (!token) {
    return { ok: false, status: 503, message: '未配置 ADMIN_TOKEN，管理接口不可用' };
  }
  const url = new URL(request.url);
  const provided =
    url.searchParams.get('admin') ||
    request.headers.get('X-Admin-Token') ||
    bearerToken(request);
  if (provided && constantTimeEqual(provided, token)) {
    return { ok: true };
  }
  return { ok: false, status: 401, message: '管理令牌无效' };
}

function bearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}
