// ---- 全局中间件：CORS / 安全响应头 / 统一错误兜底 ----

const CORS_ALLOW_METHODS = 'GET, HEAD, POST, DELETE, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization, X-Admin-Token, Range';
const CORS_EXPOSE_HEADERS = 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition, ETag, Last-Modified';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // OPTIONS 预检直接放行
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'no-referrer');
    // 统一跨域：方便跨域热链 / fetch（下载、目录、管理接口）
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: '内部错误：' + ((err && err.message) || err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Expose-Headers': CORS_EXPOSE_HEADERS,
    'Access-Control-Max-Age': '86400',
  };
}
