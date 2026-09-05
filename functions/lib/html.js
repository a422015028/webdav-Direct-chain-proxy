// ---- HTML 页面渲染：落地页 / 目录列表页 / 错误页 ----

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatSize(bytes) {
  if (bytes === undefined || bytes === null || Number.isNaN(Number(bytes))) return '-';
  const b = Number(bytes);
  if (b < 1024) return b + ' B';
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = b;
  let u = -1;
  do {
    v /= 1024;
    u += 1;
  } while (v >= 1024 && u < units.length - 1);
  return v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2) + ' ' + units[u];
}

export function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const BASE_CSS = `
  :root{--bg:#f4f3ee;--card:#fff;--line:#e4e3dd;--text:#1a1b1c;--muted:#6b7280;--accent:#3f6ad8;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:'PingFang SC','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6;}
  .wrap{max-width:860px;margin:0 auto;padding:16px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0;overflow:hidden;}
  .crumb{font-size:14px;margin:4px 0 10px;word-break:break-all;}
  .crumb a{color:var(--accent);text-decoration:none;}
  .crumb span{color:var(--muted);}
  table{width:100%;border-collapse:collapse;font-size:14px;}
  th,td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--line);}
  th{color:var(--muted);font-weight:500;font-size:13px;white-space:nowrap;}
  td.name a{color:var(--text);text-decoration:none;word-break:break-all;}
  td.name a:hover{color:var(--accent);}
  tr.dir td.name a{font-weight:600;}
  td.size,td.time{color:var(--muted);white-space:nowrap;font-size:13px;}
  .top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
  h1{font-size:19px;margin:2px 0;font-weight:700;}
  .sub{color:var(--muted);font-size:13px;}
  code{background:#f0efe9;border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:13px;word-break:break-all;}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px;margin:4px 0;}
  .kv b{color:var(--muted);font-weight:500;white-space:nowrap;}
  .btn{display:inline-block;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:14px;text-decoration:none;cursor:pointer;}
  .btn.ghost{background:#fff;color:var(--accent);border:1px solid var(--accent);}
  .err{color:#c0392b;font-weight:600;}
  .path-box{background:#f0efe9;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;word-break:break-all;margin:6px 0;}
  @media (max-width:560px){ .wrap{padding:10px;} table{font-size:13px;} td.size,td.time{font-size:12px;} }
`;

function pageShell(cfg, title, inner, origin) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="top">
      <div>
        <h1>${esc(cfg.appName)}</h1>
        <div class="sub">${esc(origin)}</div>
      </div>
      <a class="btn ghost" href="/">首页</a>
    </div>
  </div>
  ${inner}
  <div class="card" style="text-align:center;color:var(--muted);font-size:12px;padding:10px;">
    WebDAV 直链代理 · Cloudflare Pages Functions
  </div>
</div>
</body>
</html>`;
}

/** 目录列表页 */
export function renderListingPage(cfg, origin, encodedDir, decodedDir, members, code) {
  const dirs = members.filter((m) => m.isDir).sort((a, b) => a.name.localeCompare(b.name));
  const files = members.filter((m) => !m.isDir).sort((a, b) => a.name.localeCompare(b.name));
  const qs = code ? '?code=' + encodeURIComponent(code) : '';
  const bread = breadcrumbs(origin, encodedDir, decodedDir, code);

  let rows = '';
  if (decodedDir !== '/') {
    const up = parentEnc(encodedDir);
    rows += `<tr class="dir"><td class="name"><a href="${origin}${up}${qs}">📁 .. 返回上级</a></td><td class="size">-</td><td class="time">-</td></tr>`;
  }
  for (const d of dirs) {
    rows += `<tr class="dir"><td class="name"><a href="${origin}${joinEnc(encodedDir, d.name)}/${qs}">📁 ${esc(d.name)}</a></td><td class="size">-</td><td class="time">${formatTime(d.lastModified)}</td></tr>`;
  }
  for (const f of files) {
    rows += `<tr><td class="name"><a href="${origin}${joinEnc(encodedDir, f.name)}${qs}">📄 ${esc(f.name)}</a></td><td class="size">${formatSize(f.size)}</td><td class="time">${formatTime(f.lastModified)}</td></tr>`;
  }
  if (!rows) rows = `<tr><td colspan="3" style="color:var(--muted);padding:16px;">（空目录）</td></tr>`;

  const inner = `
  <div class="card">
    <div class="crumb">${bread}</div>
    <table>
      <thead><tr><th>名称</th><th>大小</th><th>修改时间</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  return pageShell(cfg, decodedDir, inner, origin);
}

function breadcrumbs(origin, encodedDir, decodedDir, code) {
  const qs = code ? '?code=' + encodeURIComponent(code) : '';
  const crumbs = [`<a href="${origin}/${qs}">根目录</a>`];
  const parts = decodedDir.split('/').filter(Boolean);
  let enc = '';
  parts.forEach((seg) => {
    enc += '/' + encodeURIComponent(seg);
    crumbs.push(`<span>/</span><a href="${origin}${enc}/${qs}">${esc(seg)}</a>`);
  });
  return crumbs.join(' ');
}

function joinEnc(encodedDir, name) {
  const base = encodedDir.endsWith('/') ? encodedDir : encodedDir + '/';
  return base + encodeURIComponent(name);
}

function parentEnc(encodedDir) {
  const s = encodedDir.replace(/\/+$/, '');
  const idx = s.lastIndexOf('/');
  return idx <= 0 ? '/' : s.slice(0, idx + 1);
}

/** 落地/状态页 */
export function renderLandingPage(cfg, origin) {
  const inner = `
  <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
    <div>
      <h1 style="font-size:16px;margin:0 0 4px;">WebDAV 直链服务</h1>
      <div class="sub">直链下载 · 目录浏览 · 分享码</div>
    </div>
    <a class="btn" href="/admin">⚙ 管理面板</a>
  </div>
  <div class="card">
    <h1 style="font-size:16px;margin:0 0 8px;">服务说明</h1>
    <div class="kv">
      <b>功能</b><span>WebDAV 直链代理 · 目录浏览 · 分享码访问控制</span>
      <b>直链格式</b><span><code>${esc(origin)}/&lt;网盘路径&gt;</code> 例如 <code>${esc(origin)}/zip/kkk.zip</code></span>
      <b>分享码</b><span>永久码 / 限时码（<code>?code=xxx</code> 或 <code>/s/xxx/路径</code>）</span>
      <b>目录浏览</b><span>路径以 <code>/</code> 结尾，或加 <code>?list=1</code>；JSON 用 <code>?list=json</code></span>
      <b>管理面板</b><span><code>${esc(origin)}/admin</code>（需 ADMIN_TOKEN）</span>
    </div>
  </div>
  <div class="card">
    <h1 style="font-size:16px;margin:0 0 8px;">运行状态</h1>
    <div id="status"><div class="sub">正在检测…</div></div>
  </div>
  <script>
  (function(){
    try {
      fetch('${esc(origin)}/api/info').then(function(r){return r.json();}).then(function(d){
        var el=document.getElementById('status'); if(!el) return;
        if(d && d.ok){
          el.innerHTML='<div class="kv">'+
            '<b>WebDAV 地址</b><span><code>'+escapeHtml(d.webdav.url||'-')+'</code></span>'+
            '<b>认证方式</b><span>'+escapeHtml(d.webdav.authType||'-')+'</span>'+
            '<b>访问模式</b><span>'+(d.publicMode?'公开模式':'分享码模式')+'</span>'+
            '<b>动态分享码</b><span>'+(d.kvEnabled?'已启用(KV)':'未启用')+'</span>'+
            '<b>静态分享码</b><span>'+escapeHtml(String(d.codesConfigured||0))+' 个</span>'+
            '</div>';
        } else {
          el.innerHTML='<div class="sub">接口返回异常：'+escapeHtml(d&&d.error||'未知')+'</div>';
        }
      }).catch(function(e){
        var el=document.getElementById('status'); if(el) el.innerHTML='<div class="sub">检测失败</div>';
      });
    } catch(e){}
    function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  })();
  </script>`;
  return pageShell(cfg, cfg.appName, inner, origin);
}

/** 主路由错误页（HTML） */
export function renderErrorPage(cfg, origin, status, message) {
  const inner = `
  <div class="card">
    <div class="err" style="font-size:16px;">HTTP ${status} · 请求失败</div>
    <div style="margin-top:8px;">${esc(message || '未知错误')}</div>
    <div style="margin-top:12px;"><a class="btn" href="${esc(origin)}/">返回首页</a></div>
  </div>`;
  return pageShell(cfg, `错误 ${status}`, inner, origin);
}

/** 文件提取页（/s/码/路径 浏览器访问时显示，点击提取后下载/浏览目录） */
export function renderExtractPage(cfg, origin, code, encodedPath, isDir) {
  // 从路径解析文件名
  const cleanPath = String(encodedPath || '/').replace(/^\/+/, '');
  const fileName = decodeURIComponent(cleanPath.split('/').pop() || '文件');
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const iconMap = { jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️', mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', webm: '🎬', mp3: '🎵', wav: '🎵', flac: '🎵', m4a: '🎵', zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦', pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙', txt: '📄', md: '📄', json: '📄', exe: '⚙️', apk: '⚙️', iso: '💿' };
  const icon = iconMap[ext] || '📄';
  const directUrl = `${origin}/${cleanPath}?code=${encodeURIComponent(code)}&download=1`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>文件提取 · ${esc(fileName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);margin:0;padding:40px 20px;min-height:100vh;box-sizing:border-box}
.extract-card{background:#fff;border-radius:16px;padding:36px 32px;width:420px;max-width:100%;margin:40px auto;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center}
.extract-icon{font-size:56px;margin-bottom:12px}
.extract-name{font-size:16px;font-weight:700;color:#1D2129;margin-bottom:4px;word-break:break-all}
.extract-sub{font-size:12px;color:#86909C;margin-bottom:24px}
.extract-label{text-align:left;font-size:13px;font-weight:600;color:#4E5969;margin-bottom:6px;display:block}
.extract-input{width:100%;padding:11px 14px;border:1px solid #E5E6EB;border-radius:8px;font-size:14px;outline:none;transition:border-color .2s;margin-bottom:20px;font-family:monospace}
.extract-input:focus{border-color:#3370FF;box-shadow:0 0 0 3px rgba(51,112,255,.1)}
.extract-btn{width:100%;padding:13px;background:#3370FF;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
.extract-btn:hover{background:#2860E0}
.extract-btn:active{transform:scale(.98)}
.extract-direct{margin-top:14px;font-size:12px;color:#86909C}
.extract-direct a{color:#3370FF;text-decoration:none}
.extract-direct a:hover{text-decoration:underline}
.extract-brand{margin-top:20px;font-size:11px;color:#C9CDD4}
</style>
</head>
<body>
<div class="extract-card">
  <div class="extract-icon">${icon}</div>
  <div class="extract-name">${esc(fileName)}</div>
  <div class="extract-sub">来自 ${esc(cfg.appName || 'WebDAV 直链下载')}</div>
  <label class="extract-label" for="codeInput">分享码</label>
  <input class="extract-input" id="codeInput" type="text" value="${esc(code)}" autocomplete="off" />
  <button class="extract-btn" id="extractBtn">📥 提取文件</button>
  <div class="extract-direct">也可以 <a href="${esc(directUrl)}" id="directLink">直接下载</a></div>
  <div class="extract-brand">WebDAV 直链代理 · Cloudflare Pages</div>
</div>
<script>
(function(){
  var btn=document.getElementById('extractBtn');
  var input=document.getElementById('codeInput');
  var path='${esc(cleanPath)}';
  var isDir=${isDir ? 'true' : 'false'};
  function doExtract(){
    var code=input.value.trim();
    if(!code){input.focus();input.style.borderColor='#F53F3F';return;}
    if(isDir){
      window.location.href='/s/'+encodeURIComponent(code)+'/'+path+(path.endsWith('/')?'':'/');
    }else{
      window.location.href='/'+path+'?code='+encodeURIComponent(code)+'&download=1';
    }
  }
  btn.addEventListener('click',doExtract);
  input.addEventListener('keydown',function(e){if(e.key==='Enter')doExtract();});
})();
</script>
</body>
</html>`;
}

/** 分享浏览器页面（/s/码/目录/ 浏览器访问时显示，只读，只能下载） */
export function renderShareBrowserPage(cfg, origin, code, encodedPath) {
  const appName = cfg.appName || 'WebDAV 直链下载';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>分享文件 · ${esc(appName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:#3370FF;--primary-light:#E8F0FF;--bg:#F5F6FA;--text:#1D2129;--text2:#4E5969;--text3:#86909C;--border:#E5E6EB;--border2:#F2F3F5;--radius:10px;--shadow:0 2px 12px rgba(0,0,0,.06)}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg);color:var(--text);font-size:14px;overflow:hidden}
button{cursor:pointer;border:none;background:none;font-family:inherit;font-size:inherit;color:inherit}
input{font-family:inherit;font-size:inherit}
.topbar{height:56px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:16px;flex-shrink:0}
.topbar-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;white-space:nowrap}
.topbar-logo .icon{font-size:22px}
.topbar-tag{background:var(--primary-light);color:var(--primary);font-size:11px;padding:2px 10px;border-radius:10px;font-weight:600}
.topbar-search{flex:1;max-width:360px;position:relative}
.topbar-search input{width:100%;padding:8px 12px 8px 36px;border:1px solid var(--border);border-radius:20px;background:var(--bg);outline:none;font-size:13px}
.topbar-search input:focus{border-color:var(--primary);background:#fff}
.topbar-search .s-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px}
.content{flex:1;display:flex;flex-direction:column;overflow:hidden;padding:16px 20px;gap:12px;height:calc(100vh - 56px)}
.toolbar{background:#fff;border-radius:var(--radius);padding:12px 16px;box-shadow:var(--shadow);flex-shrink:0}
.breadcrumb{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text2);margin-bottom:10px;flex-wrap:wrap}
.breadcrumb .bc-item{cursor:pointer;padding:2px 6px;border-radius:4px}
.breadcrumb .bc-item:hover{background:var(--border2)}
.breadcrumb .bc-sep{color:var(--text3)}
.breadcrumb .bc-current{color:var(--text);font-weight:600}
.tool-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;font-size:13px;font-weight:500;border:1px solid var(--border);background:#fff;color:var(--text2);transition:all .15s}
.tbtn:hover{border-color:var(--primary);color:var(--primary)}
.tbtn .t-icon{font-size:14px}
.tool-spacer{flex:1}
.view-toggle{display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.view-toggle button{padding:6px 10px;font-size:13px;color:var(--text3)}
.view-toggle button.active{background:var(--primary-light);color:var(--primary)}
.file-area{flex:1;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);overflow:auto;position:relative;min-height:0}
.file-area.empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--text3)}
.file-area.empty .empty-icon{font-size:48px;opacity:.5}
.file-list{width:100%;border-collapse:collapse}
.file-list thead th{position:sticky;top:0;background:#FAFBFC;padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text3);border-bottom:1px solid var(--border);z-index:1}
.file-list thead th:nth-child(2){width:100px}
.file-list thead th:nth-child(3){width:160px}
.file-list thead th:last-child{width:100px;text-align:right}
.file-list tbody tr{border-bottom:1px solid var(--border2);transition:background .12s;cursor:pointer}
.file-list tbody tr:hover{background:var(--border2)}
.file-list td{padding:10px 16px;font-size:13px}
.file-list .f-name{display:flex;align-items:center;gap:10px;font-weight:500}
.file-list .f-icon{font-size:20px;width:24px;text-align:center;flex-shrink:0}
.file-list .f-size{color:var(--text2)}
.file-list .f-time{color:var(--text3);font-size:12px}
.file-list .f-ops{text-align:right}
.file-list .dl-btn{padding:4px 12px;border-radius:5px;font-size:12px;color:var(--primary);background:var(--primary-light);transition:all .12s}
.file-list .dl-btn:hover{background:var(--primary);color:#fff}
.file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;padding:16px}
.grid-card{background:#fff;border:1px solid var(--border2);border-radius:10px;padding:14px 10px;text-align:center;cursor:pointer;transition:all .15s}
.grid-card:hover{border-color:var(--primary);box-shadow:0 4px 12px rgba(51,112,255,.12);transform:translateY(-1px)}
.grid-card .gc-icon{font-size:36px;margin-bottom:8px}
.grid-card .gc-name{font-size:12px;font-weight:500;word-break:break-all;line-height:1.4;max-height:2.8em;overflow:hidden}
.grid-card .gc-meta{font-size:11px;color:var(--text3);margin-top:4px}
.toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .25s;pointer-events:none}
.toast.show{opacity:1}
@media(max-width:768px){
  .topbar-search{display:none}
  .content{padding:10px}
  .file-list thead th:nth-child(3){display:none}
  .file-list td:nth-child(3){display:none}
}
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-logo"><span class="icon">📁</span><span>${esc(appName)}</span></div>
  <span class="topbar-tag">🔗 分享文件</span>
  <div class="topbar-search"><span class="s-icon">🔍</span><input id="searchInput" placeholder="搜索当前目录..." /></div>
</div>
<div class="content">
  <div class="toolbar">
    <div class="breadcrumb" id="breadcrumb"></div>
    <div class="tool-row">
      <button class="tbtn" id="refreshBtn"><span class="t-icon">🔄</span>刷新</button>
      <div class="tool-spacer"></div>
      <div class="view-toggle">
        <button id="viewList" class="active">☰ 列表</button>
        <button id="viewGrid">▦ 网格</button>
      </div>
    </div>
  </div>
  <div class="file-area" id="fileArea"><div id="fileContent"></div></div>
</div>
<div class="toast" id="toast"></div>
<script>
(function(){
'use strict';
var SHARE_CODE='${esc(code)}';
var currentPath='${esc(encodedPath)}';
var dirItems=[];
var viewMode='list';
var searchKeyword='';
function $(id){return document.getElementById(id);}
function toast(msg,dur){dur=dur||2000;var t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove('show');},dur);}
function fmtSize(b){b=Number(b)||0;if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(1)+' KB';if(b<1073741824)return (b/1048576).toFixed(1)+' MB';return (b/1073741824).toFixed(2)+' GB';}
function fmtTime(s){if(!s)return '-';try{var d=new Date(s);if(isNaN(d.getTime()))return s;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return s;}}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fileIcon(name,isDir){
  if(isDir)return '📁';
  var ext=(name.split('.').pop()||'').toLowerCase();
  var map={jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',mp4:'🎬',mkv:'🎬',avi:'🎬',mov:'🎬',webm:'🎬',mp3:'🎵',wav:'🎵',flac:'🎵',m4a:'🎵',zip:'📦',rar:'📦','7z':'📦',tar:'📦',gz:'📦',pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',txt:'📄',md:'📄',json:'📄',exe:'⚙️',apk:'⚙️',iso:'💿'};
  return map[ext]||'📄';
}
function loadDir(){
  var url='/'+currentPath.replace(/^\\/+/,'')+'?list=json&code='+encodeURIComponent(SHARE_CODE);
  return fetch(url).then(function(r){return r.json();}).then(function(data){
    if(!data.ok){toast('加载失败：'+(data.error||'未知错误'));return;}
    dirItems=(data.items||[]).filter(function(it){return it.name!=='.'&&it.name!=='..';});
    renderFiles();renderBreadcrumb();
  }).catch(function(e){toast('加载失败：'+e.message);});
}
function renderBreadcrumb(){
  var parts=currentPath.split('/').filter(Boolean);
  var html='<span class="bc-item" data-nav="/">根目录</span>';
  var acc='';
  parts.forEach(function(p,i){
    acc+='/'+p;
    html+='<span class="bc-sep">/</span>';
    if(i===parts.length-1){html+='<span class="bc-current">'+escapeHtml(p)+'</span>';}
    else{html+='<span class="bc-item" data-nav="'+acc+'/">'+escapeHtml(p)+'</span>';}
  });
  $('breadcrumb').innerHTML=html;
}
function getFilteredItems(){
  if(!searchKeyword)return dirItems;
  var kw=searchKeyword.toLowerCase();
  return dirItems.filter(function(it){return it.name.toLowerCase().indexOf(kw)>=0;});
}
function renderFiles(){
  var items=getFilteredItems();
  var area=$('fileArea');
  var content=$('fileContent');
  if(!items.length){
    area.classList.add('empty');
    content.innerHTML='<div class="empty-icon">📂</div><div>'+(searchKeyword?'没有匹配的文件':'当前目录为空')+'</div>';
    return;
  }
  area.classList.remove('empty');
  items=items.slice().sort(function(a,b){if(a.isDir!==b.isDir)return a.isDir?-1:1;return a.name.localeCompare(b.name);});
  if(viewMode==='list'){renderList(items);}else{renderGrid(items);}
}
function renderList(items){
  var html='<table class="file-list"><thead><tr><th>名称</th><th>大小</th><th>修改时间</th><th>操作</th></tr></thead><tbody>';
  items.forEach(function(it){
    html+='<tr data-path="'+escapeHtml(it.path)+'" data-dir="'+(it.isDir?'1':'0')+'">';
    html+='<td class="f-name"><span class="f-icon">'+fileIcon(it.name,it.isDir)+'</span><span>'+escapeHtml(it.name)+'</span></td>';
    html+='<td class="f-size">'+(it.isDir?'-':fmtSize(it.size))+'</td>';
    html+='<td class="f-time">'+fmtTime(it.lastModified)+'</td>';
    html+='<td class="f-ops">';
    if(!it.isDir){html+='<button class="dl-btn" data-download="'+escapeHtml(it.path)+'">⬇️ 下载</button>';}
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  $('fileContent').innerHTML=html;
}
function renderGrid(items){
  var html='<div class="file-grid">';
  items.forEach(function(it){
    html+='<div class="grid-card" data-path="'+escapeHtml(it.path)+'" data-dir="'+(it.isDir?'1':'0')+'">';
    html+='<div class="gc-icon">'+fileIcon(it.name,it.isDir)+'</div>';
    html+='<div class="gc-name">'+escapeHtml(it.name)+'</div>';
    html+='<div class="gc-meta">'+(it.isDir?'文件夹':fmtSize(it.size))+'</div>';
    html+='</div>';
  });
  html+='</div>';
  $('fileContent').innerHTML=html;
}
function downloadFile(path){
  var url='/'+path.replace(/^\\/+/,'')+'?code='+encodeURIComponent(SHARE_CODE)+'&download=1';
  var a=document.createElement('a');a.href=url;a.style.display='none';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function nav(path){
  currentPath=path;searchKeyword='';$('searchInput').value='';
  var newUrl='/s/'+encodeURIComponent(SHARE_CODE)+path;
  history.replaceState(null,'',newUrl);
  loadDir();
}
document.addEventListener('click',function(e){
  var el;
  el=e.target.closest('[data-nav]');
  if(el){nav(el.getAttribute('data-nav'));return;}
  el=e.target.closest('[data-download]');
  if(el){e.stopPropagation();downloadFile(el.getAttribute('data-download'));return;}
  el=e.target.closest('tr[data-path], .grid-card[data-path]');
  if(el){
    var p=el.getAttribute('data-path');
    var isDir=el.getAttribute('data-dir')==='1';
    if(isDir){nav(p);}else{downloadFile(p);}
    return;
  }
});
$('refreshBtn').addEventListener('click',function(){loadDir();});
$('searchInput').addEventListener('input',function(e){searchKeyword=e.target.value.trim();renderFiles();});
$('viewList').addEventListener('click',function(){viewMode='list';$('viewList').classList.add('active');$('viewGrid').classList.remove('active');renderFiles();});
$('viewGrid').addEventListener('click',function(){viewMode='grid';$('viewGrid').classList.add('active');$('viewList').classList.remove('active');renderFiles();});
loadDir();
})();
</script>
</body>
</html>`;
}
