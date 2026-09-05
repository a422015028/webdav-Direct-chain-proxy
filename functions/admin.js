// 路由：/admin  → 管理面板（单文件，内嵌 HTML+CSS+JS）
// 功能：文件浏览、上传/下载/删除、新建文件夹、分享生成、分享列表管理、批量操作
import { getConfig } from './lib/config.js';

export async function onRequestGet(context) {
  const cfg = getConfig(context.env);
  const appName = cfg.appName || 'WebDAV 直链下载';
  const html = buildAdminHtml(appName);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function buildAdminHtml(appName) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${appName} · 管理面板</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--primary:#3370FF;--primary-light:#E8F0FF;--primary-dark:#2860E0;--bg:#F5F6FA;--card:#FFFFFF;--text:#1D2129;--text2:#4E5969;--text3:#86909C;--border:#E5E6EB;--border2:#F2F3F5;--danger:#F53F3F;--danger-light:#FFECE8;--success:#00B42A;--warning:#FF7D00;--radius:10px;--shadow:0 2px 12px rgba(0,0,0,.06)}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg);color:var(--text);font-size:14px;overflow:hidden}
button{cursor:pointer;border:none;background:none;font-family:inherit;font-size:inherit;color:inherit}
input{font-family:inherit;font-size:inherit}
#fatalErr{display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:#FFF1F0;color:#F53F3F;padding:10px 16px;font-size:13px;border-bottom:1px solid #FFCCC7;text-align:center}
#loginView{display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}
.login-card{background:#fff;border-radius:16px;padding:40px 36px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.15)}
.login-logo{text-align:center;margin-bottom:8px}
.login-logo .icon{font-size:40px}
.login-title{text-align:center;font-size:20px;font-weight:700;margin-bottom:4px}
.login-sub{text-align:center;color:var(--text3);font-size:12px;margin-bottom:28px}
.login-input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;transition:border-color .2s;margin-bottom:16px}
.login-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(51,112,255,.1)}
.login-btn{width:100%;padding:12px;background:var(--primary);color:#fff;border-radius:8px;font-size:15px;font-weight:600;transition:background .2s}
.login-btn:hover{background:var(--primary-dark)}
.login-btn:disabled{opacity:.6;cursor:not-allowed}
.login-err{color:var(--danger);font-size:12px;margin-bottom:12px;min-height:16px;text-align:center}
#mainView{display:none;height:100vh;flex-direction:column}
.topbar{height:56px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:16px;flex-shrink:0}
.topbar-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;white-space:nowrap}
.topbar-logo .icon{font-size:22px}
.topbar-search{flex:1;max-width:400px;position:relative}
.topbar-search input{width:100%;padding:8px 12px 8px 36px;border:1px solid var(--border);border-radius:20px;background:var(--bg);outline:none;font-size:13px;transition:all .2s}
.topbar-search input:focus{border-color:var(--primary);background:#fff;box-shadow:0 0 0 3px rgba(51,112,255,.08)}
.topbar-search .s-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px}
.topbar-right{display:flex;align-items:center;gap:12px;margin-left:auto}
.topbar-user{display:flex;align-items:center;gap:6px;color:var(--text2);font-size:13px}
.topbar-user .avatar{width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
.topbar-btn{padding:6px 14px;border-radius:6px;font-size:13px;color:var(--text2);transition:background .15s}
.topbar-btn:hover{background:var(--border2)}
.topbar-btn.danger:hover{background:var(--danger-light);color:var(--danger)}
.body-wrap{flex:1;display:flex;overflow:hidden}
.sidebar{width:200px;background:#fff;border-right:1px solid var(--border);padding:12px 8px;flex-shrink:0;display:flex;flex-direction:column;gap:2px}
.side-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;font-size:14px;color:var(--text2);cursor:pointer;transition:all .15s;white-space:nowrap}
.side-item:hover{background:var(--border2)}
.side-item.active{background:var(--primary-light);color:var(--primary);font-weight:600}
.side-item .si-icon{font-size:16px;width:20px;text-align:center}
.side-item .badge{margin-left:auto;background:var(--primary);color:#fff;font-size:11px;padding:1px 7px;border-radius:10px;min-width:20px;text-align:center}
.side-divider{height:1px;background:var(--border2);margin:8px 6px}
.content{flex:1;display:flex;flex-direction:column;overflow:hidden;padding:16px 20px;gap:12px}
.toolbar{background:#fff;border-radius:var(--radius);padding:12px 16px;box-shadow:var(--shadow);flex-shrink:0}
.breadcrumb{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text2);margin-bottom:10px;flex-wrap:wrap}
.breadcrumb .bc-item{cursor:pointer;padding:2px 6px;border-radius:4px;transition:background .15s}
.breadcrumb .bc-item:hover{background:var(--border2)}
.breadcrumb .bc-sep{color:var(--text3)}
.breadcrumb .bc-current{color:var(--text);font-weight:600}
.tool-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;font-size:13px;font-weight:500;transition:all .15s;border:1px solid transparent}
.tbtn.primary{background:var(--primary);color:#fff}
.tbtn.primary:hover{background:var(--primary-dark)}
.tbtn.default{background:#fff;border-color:var(--border);color:var(--text2)}
.tbtn.default:hover{border-color:var(--primary);color:var(--primary)}
.tbtn.danger{background:#fff;border-color:var(--border);color:var(--danger)}
.tbtn.danger:hover{border-color:var(--danger);background:var(--danger-light)}
.tbtn:disabled{opacity:.45;cursor:not-allowed}
.tbtn .t-icon{font-size:14px}
.tool-spacer{flex:1}
.view-toggle{display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.view-toggle button{padding:6px 10px;font-size:13px;color:var(--text3);transition:all .15s}
.view-toggle button.active{background:var(--primary-light);color:var(--primary)}
.sel-bar{display:none;align-items:center;gap:10px;background:var(--primary-light);border:1px solid #BEDAFF;border-radius:8px;padding:8px 14px;font-size:13px;color:var(--primary);flex-shrink:0}
.sel-bar.show{display:flex}
.sel-bar .sel-count{font-weight:600}
.sel-bar .sel-actions{margin-left:auto;display:flex;gap:6px}
.sel-bar button{padding:4px 12px;border-radius:5px;font-size:12px;background:#fff;border:1px solid #BEDAFF;color:var(--primary);transition:all .15s}
.sel-bar button:hover{background:var(--primary);color:#fff}
.sel-bar button.del{color:var(--danger);border-color:#FABEB8}
.sel-bar button.del:hover{background:var(--danger);color:#fff;border-color:var(--danger)}
.file-area{flex:1;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);overflow:auto;position:relative;min-height:0}
#filesPage{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;gap:12px}
#sharesPage{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;gap:12px}
.file-area.empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--text3)}
.file-area.empty .empty-icon{font-size:48px;opacity:.5}
.file-list{width:100%;border-collapse:collapse}
.file-list thead th{position:sticky;top:0;background:#FAFBFC;padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text3);border-bottom:1px solid var(--border);z-index:1}
.file-list thead th:first-child{width:40px}
.file-list thead th:nth-child(3){width:100px}
.file-list thead th:nth-child(4){width:160px}
.file-list thead th:last-child{width:160px;text-align:right}
.file-list tbody tr{border-bottom:1px solid var(--border2);transition:background .12s;cursor:pointer}
.file-list tbody tr:hover{background:var(--border2)}
.file-list tbody tr.selected{background:var(--primary-light)}
.file-list td{padding:10px 16px;font-size:13px}
.file-list .f-check{width:40px}
.file-list .f-name{display:flex;align-items:center;gap:10px;font-weight:500}
.file-list .f-icon{font-size:20px;width:24px;text-align:center;flex-shrink:0}
.file-list .f-size{color:var(--text2)}
.file-list .f-time{color:var(--text3);font-size:12px}
.file-list .f-ops{text-align:right}
.file-list .op-btn{padding:4px 10px;border-radius:5px;font-size:12px;color:var(--text2);transition:all .12s;margin-left:4px}
.file-list .op-btn:hover{background:var(--primary-light);color:var(--primary)}
.file-list .op-btn.del:hover{background:var(--danger-light);color:var(--danger)}
.file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;padding:16px}
.grid-card{background:#fff;border:1px solid var(--border2);border-radius:10px;padding:14px 10px;text-align:center;cursor:pointer;transition:all .15s;position:relative}
.grid-card:hover{border-color:var(--primary);box-shadow:0 4px 12px rgba(51,112,255,.12);transform:translateY(-1px)}
.grid-card.selected{border-color:var(--primary);background:var(--primary-light)}
.grid-card .gc-check{position:absolute;top:8px;left:8px;display:none}
.grid-card.selected .gc-check{display:block}
.grid-card .gc-icon{font-size:36px;margin-bottom:8px}
.grid-card .gc-name{font-size:12px;font-weight:500;word-break:break-all;line-height:1.4;max-height:2.8em;overflow:hidden}
.grid-card .gc-meta{font-size:11px;color:var(--text3);margin-top:4px}
.cb{width:16px;height:16px;border:1.5px solid #C9CDD4;border-radius:4px;cursor:pointer;appearance:none;-webkit-appearance:none;position:relative;transition:all .15s;vertical-align:middle}
.cb:checked{background:var(--primary);border-color:var(--primary)}
.cb:checked::after{content:'';position:absolute;left:4px;top:1px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.drop-overlay{display:none;position:absolute;inset:0;background:rgba(51,112,255,.08);border:2px dashed var(--primary);border-radius:var(--radius);z-index:10;align-items:center;justify-content:center;flex-direction:column;gap:12px;pointer-events:none}
.drop-overlay.show{display:flex}
.drop-overlay .do-icon{font-size:48px}
.drop-overlay .do-text{font-size:16px;font-weight:600;color:var(--primary)}
.upload-panel{position:fixed;bottom:0;right:20px;width:360px;max-width:90vw;background:#fff;border-radius:12px 12px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.12);z-index:100;overflow:hidden;display:none}
.upload-panel.show{display:block}
.up-header{display:flex;align-items:center;padding:10px 14px;background:var(--primary);color:#fff;font-size:13px;font-weight:600}
.up-header .up-title{flex:1}
.up-header .up-count{opacity:.85;font-size:12px;margin-right:8px}
.up-header button{color:#fff;opacity:.8;font-size:16px;padding:0 4px}
.up-header button:hover{opacity:1}
.up-list{max-height:240px;overflow-y:auto}
.up-item{padding:10px 14px;border-bottom:1px solid var(--border2)}
.up-item:last-child{border-bottom:none}
.up-name{font-size:12px;font-weight:500;margin-bottom:6px;display:flex;align-items:center;gap:6px;word-break:break-all}
.up-name .up-status{margin-left:auto;font-size:11px;flex-shrink:0}
.up-name .up-status.done{color:var(--success)}
.up-name .up-status.error{color:var(--danger)}
.up-name .up-status.uploading{color:var(--primary)}
.up-bar{height:4px;background:var(--border2);border-radius:2px;overflow:hidden}
.up-bar-fill{height:100%;background:var(--primary);border-radius:2px;transition:width .2s;width:0}
.up-bar-fill.done{background:var(--success)}
.up-bar-fill.error{background:var(--danger)}
.up-meta{font-size:11px;color:var(--text3);margin-top:4px;display:flex;justify-content:space-between}
.dialog-mask{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center;padding:20px}
.dialog-mask.show{display:flex}
.dialog{background:#fff;border-radius:14px;width:440px;max-width:100%;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column}
.dialog.wide{width:560px}
.dlg-header{display:flex;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border2)}
.dlg-title{font-size:16px;font-weight:700;flex:1}
.dlg-close{font-size:20px;color:var(--text3);padding:0 4px}
.dlg-close:hover{color:var(--text)}
.dlg-body{padding:20px;overflow-y:auto;flex:1}
.dlg-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--border2)}
.dlg-btn{padding:8px 20px;border-radius:7px;font-size:13px;font-weight:500;transition:all .15s}
.dlg-btn.cancel{background:var(--border2);color:var(--text2)}
.dlg-btn.cancel:hover{background:var(--border)}
.dlg-btn.primary{background:var(--primary);color:#fff}
.dlg-btn.primary:hover{background:var(--primary-dark)}
.dlg-btn.danger{background:var(--danger);color:#fff}
.dlg-btn.danger:hover{background:#D93026}
.expire-group{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.expire-opt{flex:1;min-width:70px;padding:10px;text-align:center;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}
.expire-opt.active{border-color:var(--primary);background:var(--primary-light);color:var(--primary)}
.custom-expire{display:none;margin-bottom:16px}
.custom-expire.show{display:block}
.custom-expire input{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;outline:none;font-size:13px}
.custom-expire input:focus{border-color:var(--primary)}
.custom-expire .ce-hint{font-size:11px;color:var(--text3);margin-top:4px}
.form-label{font-size:13px;font-weight:600;margin-bottom:6px;display:block;color:var(--text2)}
.form-textarea{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;outline:none;font-size:13px;resize:vertical;min-height:60px;font-family:inherit}
.form-textarea:focus{border-color:var(--primary)}
.form-input{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;outline:none;font-size:13px}
.form-input:focus{border-color:var(--primary)}
.share-result{margin-top:12px}
.sr-success{color:var(--success);font-size:13px;font-weight:600;margin-bottom:10px}
.sr-token-box{background:linear-gradient(135deg,#FFF7E6,#FFF1D6);border:1px solid #FFE0A0;border-radius:10px;padding:14px 16px;margin-bottom:10px}
.sr-token-title{font-size:13px;font-weight:700;color:#D46B08;margin-bottom:8px}
.sr-token-text{font-size:12px;line-height:1.8;color:#5C3D00;white-space:pre-wrap;word-break:break-all;font-family:'PingFang SC','Microsoft YaHei',monospace}
.sr-token-text .st-link{color:#3370FF;text-decoration:none}
.sr-token-text .st-code{color:#D46B08;font-weight:700}
.share-list-wrap{padding:0}
.share-table{width:100%;border-collapse:collapse}
.share-table th{padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:var(--text3);border-bottom:1px solid var(--border);background:#FAFBFC;position:sticky;top:0}
.share-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border2)}
.share-table .st-code{font-family:monospace;font-weight:600;color:var(--primary)}
.share-table .st-paths{font-size:12px;color:var(--text2);max-width:200px;word-break:break-all}
.share-table .st-expire{font-size:12px}
.share-table .st-expire.perm{color:var(--success)}
.share-table .st-expire.expired{color:var(--danger)}
.share-table .st-source{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--border2);color:var(--text2)}
.share-table .st-source.dynamic{background:var(--primary-light);color:var(--primary)}
.share-table .st-ops button{padding:4px 10px;border-radius:5px;font-size:12px;color:var(--text2);margin-right:4px}
.share-table .st-ops button:hover{background:var(--primary-light);color:var(--primary)}
.share-table .st-ops button.del:hover{background:var(--danger-light);color:var(--danger)}
.toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .25s;pointer-events:none;max-width:80vw;text-align:center}
.toast.show{opacity:1}
@media(max-width:768px){
  .sidebar{width:56px;padding:8px 4px}
  .side-item{justify-content:center;padding:10px 0}
  .side-item span:not(.si-icon),.side-item .badge{display:none}
  .content{padding:10px}
  .topbar-search{display:none}
  .dialog{width:100%}
  .file-list thead th:nth-child(4){display:none}
  .file-list td:nth-child(4){display:none}
}
</style>
</head>
<body>
<div id="fatalErr"></div>
<div id="loginView">
  <div class="login-card">
    <div class="login-logo"><span class="icon">📁</span></div>
    <div class="login-title">${appName} · 管理面板</div>
    <div class="login-sub">文件管理 · 上传下载 · 分享生成 · v3.0</div>
    <div id="loginErr" class="login-err"></div>
    <input id="tokenInput" class="login-input" type="password" placeholder="请输入 ADMIN_TOKEN" autocomplete="off">
    <button id="loginBtn" class="login-btn" type="button" onclick="login()">登 录</button>
  </div>
</div>
<div id="mainView">
  <div class="topbar">
    <div class="topbar-logo"><span class="icon">📁</span><span>${appName}</span></div>
    <div class="topbar-search"><span class="s-icon">🔍</span><input id="searchInput" placeholder="搜索当前目录文件..." /></div>
    <div class="topbar-right">
      <div class="topbar-user"><div class="avatar">管</div><span>管理员</span></div>
      <button id="logoutBtn" class="topbar-btn danger">退出</button>
    </div>
  </div>
  <div class="body-wrap">
    <div class="sidebar">
      <div class="side-item active" data-tab="files"><span class="si-icon">📂</span><span>我的文件</span></div>
      <div class="side-item" data-tab="shares"><span class="si-icon">🔗</span><span>分享列表</span></div>
      <div class="side-divider"></div>
      <div class="side-item" id="uploadToggle"><span class="si-icon">⬆️</span><span>传输列表</span><span class="badge" id="uploadBadge" style="display:none">0</span></div>
    </div>
    <div class="content">
      <div id="filesPage">
        <div class="toolbar">
          <div class="breadcrumb" id="breadcrumb"></div>
          <div class="tool-row">
            <button class="tbtn primary" id="uploadBtn"><span class="t-icon">⬆️</span>上传文件</button>
            <button class="tbtn default" id="mkdirBtn"><span class="t-icon">📁</span>新建文件夹</button>
            <button class="tbtn default" id="refreshBtn"><span class="t-icon">🔄</span>刷新</button>
            <div class="tool-spacer"></div>
            <div class="view-toggle">
              <button id="viewList" class="active">☰ 列表</button>
              <button id="viewGrid">▦ 网格</button>
            </div>
          </div>
        </div>
        <div class="sel-bar" id="selBar">
          <span>已选 <span class="sel-count" id="selCount">0</span> 项</span>
          <div class="sel-actions">
            <button id="selDownloadBtn">⬇️ 下载</button>
            <button id="selShareBtn">🔗 分享</button>
            <button class="del" id="selDeleteBtn">🗑️ 删除</button>
          </div>
        </div>
        <div class="file-area" id="fileArea">
          <div class="drop-overlay" id="dropOverlay"><div class="do-icon">📥</div><div class="do-text">松开鼠标上传文件到当前目录</div></div>
          <div id="fileContent"></div>
        </div>
      </div>
      <div id="sharesPage" style="display:none;flex:1;flex-direction:column">
        <div class="toolbar">
          <div class="tool-row">
            <span style="font-size:15px;font-weight:700">分享列表</span>
            <div class="tool-spacer"></div>
            <button class="tbtn default" id="refreshSharesBtn"><span class="t-icon">🔄</span>刷新</button>
          </div>
        </div>
        <div class="file-area" id="sharesArea"><div id="sharesContent"></div></div>
      </div>
    </div>
  </div>
</div>
<div class="upload-panel" id="uploadPanel">
  <div class="up-header">
    <span class="up-title">⬆️ 传输列表</span>
    <span class="up-count" id="upCount"></span>
    <button id="upClearBtn">✕</button>
  </div>
  <div class="up-list" id="upList"></div>
</div>
<div class="dialog-mask" id="shareDialogMask">
  <div class="dialog wide">
    <div class="dlg-header"><span class="dlg-title" id="dlgTitle">生成分享链接</span><button class="dlg-close" data-close="shareDialogMask">✕</button></div>
    <div class="dlg-body">
      <label class="form-label">有效期</label>
      <div class="expire-group" id="expireGroup">
        <div class="expire-opt active" data-expire="0">永久</div>
        <div class="expire-opt" data-expire="168">7 天</div>
        <div class="expire-opt" data-expire="720">30 天</div>
        <div class="expire-opt" data-expire="custom">自定义</div>
      </div>
      <div class="custom-expire" id="customExpireWrap">
        <input id="customExpire" type="number" min="1" placeholder="自定义小时数" />
        <div class="ce-hint">输入分享码有效时长（小时），如 24 = 1 天</div>
      </div>
      <label class="form-label">路径范围（每行一个，可编辑）</label>
      <textarea class="form-textarea" id="sharePaths" rows="3"></textarea>
      <label class="form-label" style="margin-top:12px">备注（可选）</label>
      <input class="form-input" id="shareNote" placeholder="例如：给朋友 / 销售资料" />
      <div class="share-result" id="shareResult"></div>
    </div>
    <div class="dlg-footer">
      <button class="dlg-btn cancel" data-close="shareDialogMask">关闭</button>
      <button class="dlg-btn primary" id="createShareBtn">生成</button>
      <button class="dlg-btn primary" id="copyLinkBtn" style="display:none">📋 复制链接</button>
      <button class="dlg-btn default" id="copyTokenBtn" style="display:none">📝 复制口令</button>
    </div>
  </div>
</div>
<div class="dialog-mask" id="mkdirDialogMask">
  <div class="dialog">
    <div class="dlg-header"><span class="dlg-title">📁 新建文件夹</span><button class="dlg-close" data-close="mkdirDialogMask">✕</button></div>
    <div class="dlg-body">
      <label class="form-label">文件夹名称</label>
      <input class="form-input" id="mkdirName" placeholder="请输入文件夹名称" />
    </div>
    <div class="dlg-footer">
      <button class="dlg-btn cancel" data-close="mkdirDialogMask">取消</button>
      <button class="dlg-btn primary" id="mkdirConfirmBtn">创建</button>
    </div>
  </div>
</div>
<div class="dialog-mask" id="deleteDialogMask">
  <div class="dialog">
    <div class="dlg-header"><span class="dlg-title">🗑️ 确认删除</span><button class="dlg-close" data-close="deleteDialogMask">✕</button></div>
    <div class="dlg-body">
      <p style="font-size:14px;line-height:1.6;margin-bottom:10px">确定要删除以下 <strong id="deleteCount" style="color:var(--danger)">0</strong> 项吗？此操作不可恢复。</p>
      <div id="deleteList" style="max-height:160px;overflow-y:auto;background:var(--bg);border-radius:8px;padding:10px;font-size:12px;color:var(--text2);word-break:break-all"></div>
    </div>
    <div class="dlg-footer">
      <button class="dlg-btn cancel" data-close="deleteDialogMask">取消</button>
      <button class="dlg-btn danger" id="deleteConfirmBtn">确认删除</button>
    </div>
  </div>
</div>
<input type="file" id="fileInput" multiple style="display:none" />
<div class="toast" id="toast"></div>
<script>
(function(){
'use strict';
var fatalEl=document.getElementById('fatalErr');
window.addEventListener('error',function(e){
  var msg=(e.error&&e.error.message)||e.message||'未知错误';
  if(fatalEl){fatalEl.style.display='block';fatalEl.textContent='脚本错误：'+msg+(e.filename?' @ '+e.filename.split('/').pop():'')+(e.lineno?':'+e.lineno:'');}
});
window.addEventListener('unhandledrejection',function(e){
  var msg=(e.reason&&e.reason.message)||String(e.reason||'');
  if(fatalEl){fatalEl.style.display='block';fatalEl.textContent='Promise 错误：'+msg;}
});
var token='';
var currentPath='/';
var dirItems=[];
var selected={};
var viewMode='list';
var uploadTasks=[];
var downloadCode='';
var sharePaths=[];
var lastShareData=null;
var searchKeyword='';
var TOKEN_KEY='wdav_admin_token';
function $(id){return document.getElementById(id);}
function store(){try{return localStorage;}catch(e){return {getItem:function(){return null;},setItem:function(){},removeItem:function(){}};}}
function toast(msg,dur){dur=dur||2000;var t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove('show');},dur);}
function fmtSize(b){b=Number(b)||0;if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(1)+' KB';if(b<1073741824)return (b/1048576).toFixed(1)+' MB';return (b/1073741824).toFixed(2)+' GB';}
function fmtTime(s){if(!s)return '-';try{var d=new Date(s);if(isNaN(d.getTime()))return s;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return s;}}
function fileIcon(name,isDir){
  if(isDir)return '📁';
  var ext=(name.split('.').pop()||'').toLowerCase();
  var map={jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',bmp:'🖼️',mp4:'🎬',mkv:'🎬',avi:'🎬',mov:'🎬',flv:'🎬',webm:'🎬',mp3:'🎵',wav:'🎵',flac:'🎵',aac:'🎵',ogg:'🎵',m4a:'🎵',zip:'📦',rar:'📦','7z':'📦',tar:'📦',gz:'📦',pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',txt:'📄',md:'📄',json:'📄',xml:'📄',html:'📄',css:'📄',js:'📄',py:'📄',exe:'⚙️',apk:'⚙️',iso:'💿'};
  return map[ext]||'📄';
}
function copyText(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast('已复制');},function(){fallbackCopy(text);});}
  else{fallbackCopy(text);}
}
function fallbackCopy(text){
  var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('已复制');}catch(e){toast('复制失败，请手动复制');}
  document.body.removeChild(ta);
}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function api(path,opts){
  opts=opts||{};
  var headers=opts.headers||{};
  headers['X-Admin-Token']=token;
  if(opts.body&&typeof opts.body==='string'&&!headers['Content-Type']){headers['Content-Type']='application/json';}
  return fetch(path,{method:opts.method||'GET',headers:headers,body:opts.body}).then(function(res){
    return res.json().then(function(data){
      if(!res.ok&&!data.ok){throw new Error(data.error||('HTTP '+res.status));}
      if(data.error){throw new Error(data.error);}
      return data;
    });
  });
}
function login(){
  var val=$('tokenInput').value.trim();
  if(!val){$('loginErr').textContent='请输入管理令牌';return;}
  $('loginErr').textContent='正在登录...';
  $('loginBtn').disabled=true;
  fetch('/api/codes',{headers:{'X-Admin-Token':val}}).then(function(res){
    $('loginBtn').disabled=false;
    if(res.status===401){$('loginErr').textContent='令牌错误，请检查 ADMIN_TOKEN';return;}
    if(!res.ok){$('loginErr').textContent='登录失败：HTTP '+res.status;return;}
    token=val;store().setItem(TOKEN_KEY,token);showMain();initMain();
  }).catch(function(){ $('loginBtn').disabled=false;$('loginErr').textContent='网络错误，请稍后重试'; });
}
function logout(){store().removeItem(TOKEN_KEY);token='';location.reload();}
function showLogin(){$('loginView').style.display='flex';$('mainView').style.display='none';}
function showMain(){$('loginView').style.display='none';$('mainView').style.display='flex';}
function switchTab(tab){
  document.querySelectorAll('.side-item[data-tab]').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-tab')===tab);});
  if(tab==='files'){$('filesPage').style.display='';$('sharesPage').style.display='none';}
  else{$('filesPage').style.display='none';$('sharesPage').style.display='flex';loadShares();}
}
function loadDir(){
  return api('/api/list?path='+encodeURIComponent(currentPath)).then(function(data){
    dirItems=(data.items||[]).filter(function(it){return it.name!=='.'&&it.name!=='..';});
    selected={};renderFiles();renderBreadcrumb();updateSelBar();
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
    content.innerHTML='<div class="empty-icon">📂</div><div>'+(searchKeyword?'没有匹配的文件':'当前目录为空，拖拽文件到此处上传')+'</div>';
    return;
  }
  area.classList.remove('empty');
  items=items.slice().sort(function(a,b){if(a.isDir!==b.isDir)return a.isDir?-1:1;return a.name.localeCompare(b.name);});
  if(viewMode==='list'){renderList(items);}else{renderGrid(items);}
}
function renderList(items){
  var html='<table class="file-list"><thead><tr><th><input type="checkbox" class="cb" id="checkAll"></th><th>名称</th><th>大小</th><th>修改时间</th><th>操作</th></tr></thead><tbody>';
  items.forEach(function(it){
    var key=it.path;
    var isSel=!!selected[key];
    html+='<tr class="'+(isSel?'selected':'')+'" data-path="'+escapeHtml(key)+'" data-dir="'+(it.isDir?'1':'0')+'">';
    html+='<td class="f-check"><input type="checkbox" class="cb item-cb" '+(isSel?'checked':'')+' data-path="'+escapeHtml(key)+'"></td>';
    html+='<td class="f-name"><span class="f-icon">'+fileIcon(it.name,it.isDir)+'</span><span>'+escapeHtml(it.name)+'</span></td>';
    html+='<td class="f-size">'+(it.isDir?'-':fmtSize(it.size))+'</td>';
    html+='<td class="f-time">'+fmtTime(it.lastModified)+'</td>';
    html+='<td class="f-ops">';
    if(!it.isDir){html+='<button class="op-btn" data-op="download" data-path="'+escapeHtml(key)+'">⬇️ 下载</button>';}
    html+='<button class="op-btn" data-op="share" data-path="'+escapeHtml(key)+'">🔗 分享</button>';
    html+='<button class="op-btn del" data-op="delete" data-path="'+escapeHtml(key)+'">🗑️</button>';
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  $('fileContent').innerHTML=html;
  var ca=$('checkAll');if(ca){ca.checked=items.length>0&&items.every(function(it){return selected[it.path];});}
}
function renderGrid(items){
  var html='<div class="file-grid">';
  items.forEach(function(it){
    var key=it.path;
    var isSel=!!selected[key];
    html+='<div class="grid-card '+(isSel?'selected':'')+'" data-path="'+escapeHtml(key)+'" data-dir="'+(it.isDir?'1':'0')+'">';
    html+='<input type="checkbox" class="cb gc-check" '+(isSel?'checked':'')+' data-path="'+escapeHtml(key)+'">';
    html+='<div class="gc-icon">'+fileIcon(it.name,it.isDir)+'</div>';
    html+='<div class="gc-name">'+escapeHtml(it.name)+'</div>';
    html+='<div class="gc-meta">'+(it.isDir?'文件夹':fmtSize(it.size))+'</div>';
    html+='</div>';
  });
  html+='</div>';
  $('fileContent').innerHTML=html;
}
function updateSelBar(){
  var keys=Object.keys(selected).filter(function(k){return selected[k];});
  var n=keys.length;
  $('selCount').textContent=n;
  $('selBar').classList.toggle('show',n>0);
}
function nav(path){currentPath=path;searchKeyword='';$('searchInput').value='';loadDir();}
function uploadFiles(fileList){
  if(!fileList||!fileList.length)return;
  for(var i=0;i<fileList.length;i++){startUpload(fileList[i]);}
  showUploadPanel();
}
function startUpload(file){
  var task={id:Date.now()+Math.random(),name:file.name,size:file.size,loaded:0,status:'uploading',error:null,xhr:null};
  uploadTasks.push(task);
  renderUploadTasks();
  try{
    var xhr=new XMLHttpRequest();
    task.xhr=xhr;
    xhr.upload.onprogress=function(e){if(e.lengthComputable){task.loaded=e.loaded;renderUploadTasks();}};
    xhr.onload=function(){
      if(xhr.status>=200&&xhr.status<300){task.status='done';task.loaded=task.size;}
      else{task.status='error';try{var d=JSON.parse(xhr.responseText);task.error=d.error||('HTTP '+xhr.status);}catch(e){task.error='HTTP '+xhr.status;}}
      renderUploadTasks();
      if(task.status==='done'){toast('上传完成：'+task.name);loadDir().catch(function(){});}
      else{toast('上传失败：'+task.name+' - '+task.error);}
    };
    xhr.onerror=function(){task.status='error';task.error='网络错误';renderUploadTasks();toast('上传失败：'+task.name+' - 网络错误');};
    xhr.open('POST','/api/upload?path='+encodeURIComponent(currentPath)+'&filename='+encodeURIComponent(file.name));
    xhr.setRequestHeader('X-Admin-Token',token);
    xhr.send(file);
  }catch(e){task.status='error';task.error=e.message;renderUploadTasks();}
}
function renderUploadTasks(){
  var active=uploadTasks.filter(function(t){return t.status==='uploading';}).length;
  var badge=$('uploadBadge');
  if(active>0){badge.style.display='';badge.textContent=active;}else{badge.style.display='none';}
  $('upCount').textContent=uploadTasks.length+' 项';
  if(!uploadTasks.length){$('uploadPanel').classList.remove('show');return;}
  var html='';
  uploadTasks.forEach(function(t){
    var pct=t.size?Math.round(t.loaded/t.size*100):0;
    html+='<div class="up-item">';
    html+='<div class="up-name"><span>'+escapeHtml(t.name)+'</span><span class="up-status '+t.status+'">'+(t.status==='uploading'?'上传中':t.status==='done'?'已完成':'失败')+'</span></div>';
    html+='<div class="up-bar"><div class="up-bar-fill '+t.status+'" style="width:'+pct+'%"></div></div>';
    html+='<div class="up-meta"><span>'+fmtSize(t.loaded)+' / '+fmtSize(t.size)+'</span><span>'+(t.status==='error'?escapeHtml(t.error||''):pct+'%')+'</span></div>';
    html+='</div>';
  });
  $('upList').innerHTML=html;
}
function showUploadPanel(){$('uploadPanel').classList.add('show');}
function clearUploadTasks(){uploadTasks=uploadTasks.filter(function(t){return t.status==='uploading';});renderUploadTasks();}
function ensureDownloadCode(){
  if(downloadCode)return Promise.resolve(downloadCode);
  return api('/api/codes',{method:'POST',body:JSON.stringify({paths:['**'],expireInHours:1,note:'临时下载码'})}).then(function(data){
    downloadCode=data.code;return downloadCode;
  });
}
function downloadItem(path){
  ensureDownloadCode().then(function(code){
    var url=location.origin+encodeURI(path)+'?code='+encodeURIComponent(code);
    var a=document.createElement('a');a.href=url;a.style.display='none';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }).catch(function(e){toast('下载失败：'+e.message);});
}
function downloadSelected(){
  var keys=Object.keys(selected).filter(function(k){return selected[k];});
  var files=keys.filter(function(k){var it=dirItems.find(function(i){return i.path===k;});return it&&!it.isDir;});
  if(!files.length){toast('请选择文件（不支持下载目录）');return;}
  ensureDownloadCode().then(function(code){
    files.forEach(function(path,idx){
      setTimeout(function(){
        var url=location.origin+encodeURI(path)+'?code='+encodeURIComponent(code);
        var a=document.createElement('a');a.href=url;a.style.display='none';
        document.body.appendChild(a);a.click();document.body.removeChild(a);
      },idx*300);
    });
    toast('开始下载 '+files.length+' 个文件');
  }).catch(function(e){toast('下载失败：'+e.message);});
}
var pendingDelete=[];
function confirmDelete(paths){
  pendingDelete=paths.slice();
  $('deleteCount').textContent=paths.length;
  $('deleteList').innerHTML=paths.map(function(p){return '• '+escapeHtml(p);}).join('<br>');
  $('deleteDialogMask').classList.add('show');
}
function doDelete(){
  if(!pendingDelete.length)return;
  api('/api/delete',{method:'POST',body:JSON.stringify({paths:pendingDelete})}).then(function(data){
    var ok=data.success||0;var fail=data.failed||0;
    if(fail>0){toast('删除完成：成功 '+ok+'，失败 '+fail);}else{toast('已删除 '+ok+' 项');}
    $('deleteDialogMask').classList.remove('show');pendingDelete=[];
    loadDir().catch(function(){});
  }).catch(function(e){toast('删除失败：'+e.message);});
}
function openMkdirDialog(){$('mkdirName').value='';$('mkdirDialogMask').classList.add('show');setTimeout(function(){$('mkdirName').focus();},100);}
function doMkdir(){
  var name=$('mkdirName').value.trim();
  if(!name){toast('请输入文件夹名称');return;}
  if(name.indexOf('/')>=0||name==='.'||name==='..'){toast('文件夹名称不合法');return;}
  var path=(currentPath.endsWith('/')?currentPath:currentPath+'/')+name+'/';
  api('/api/mkdir',{method:'POST',body:JSON.stringify({path:path})}).then(function(){
    toast('文件夹已创建');$('mkdirDialogMask').classList.remove('show');loadDir().catch(function(){});
  }).catch(function(e){toast('创建失败：'+e.message);});
}
function openShareDialog(paths){
  sharePaths=paths.slice();
  $('sharePaths').value=sharePaths.join('\\n');
  $('shareNote').value='';
  $('shareResult').innerHTML='';
  lastShareData=null;
  $('createShareBtn').style.display='';
  $('copyLinkBtn').style.display='none';
  $('copyTokenBtn').style.display='none';
  $('dlgTitle').textContent='生成分享链接（'+paths.length+'项）';
  document.querySelectorAll('.expire-opt').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-expire')==='0');});
  $('customExpireWrap').classList.remove('show');
  $('shareDialogMask').classList.add('show');
}
function closeDialog(id){$(id).classList.remove('show');}
function createShares(){
  var paths=$('sharePaths').value.split('\\n').map(function(s){return s.trim();}).filter(Boolean);
  if(!paths.length){toast('请至少填写一个路径');return;}
  var expireOpt=document.querySelector('.expire-opt.active');
  var expireVal=expireOpt?expireOpt.getAttribute('data-expire'):'0';
  var body={paths:paths,note:$('shareNote').value.trim()};
  if(expireVal==='custom'){
    var h=Number($('customExpire').value);
    if(!(h>0)){toast('请输入有效的自定义小时数');return;}
    body.expireInHours=h;
  }else if(Number(expireVal)>0){
    body.expireInHours=Number(expireVal);
  }
  var url=paths.length===1?'/api/codes':'/api/codes/batch';
  api(url,{method:'POST',body:JSON.stringify(body)}).then(function(data){
    renderShareResult(data,paths);
  }).catch(function(e){toast('生成失败：'+e.message);});
}
function renderShareResult(data,paths){
  lastShareData=data;
  var items=data.items||[{path:paths[0],code:data.code,links:data.links}];
  var appName='CloudFlare助手';
  var html='<div class="sr-success">✅ 生成成功，共 '+(data.count||1)+' 条链接</div>';
  items.forEach(function(item){
    var fileName=item.path.split('/').filter(Boolean).pop()||item.path;
    var link=item.links&&item.links.pathForm?item.links.pathForm:'';
    var code=item.code||'';
    var tokenText='『来自'+appName+'的分享』\\n';
    tokenText+='文件：'+fileName+'\\n';
    tokenText+='链接：'+link+'\\n';
    tokenText+='提取码：'+code+'\\n';
    tokenText+='复制这段内容打开「'+appName+'」即可获取';
    html+='<div class="sr-token-box">';
    html+='<div class="sr-token-title">📎 '+escapeHtml(fileName)+'</div>';
    html+='<div class="sr-token-text">'+escapeHtml(tokenText).replace(/\\n/g,'<br>')+'</div>';
    html+='</div>';
  });
  $('shareResult').innerHTML=html;
  $('createShareBtn').style.display='none';
  $('copyLinkBtn').style.display='';
  $('copyTokenBtn').style.display='';
}
function buildShareTokenText(){
  if(!lastShareData)return '';
  var items=lastShareData.items||[{path:sharePaths[0],code:lastShareData.code,links:lastShareData.links}];
  var appName='CloudFlare助手';
  return items.map(function(item){
    var fileName=item.path.split('/').filter(Boolean).pop()||item.path;
    var link=item.links&&item.links.pathForm?item.links.pathForm:'';
    var code=item.code||'';
    return '『来自'+appName+'的分享』\\n文件：'+fileName+'\\n链接：'+link+'\\n提取码：'+code+'\\n复制这段内容打开「'+appName+'」即可获取';
  }).join('\\n\\n');
}
function copyShareLink(){
  if(!lastShareData)return;
  var items=lastShareData.items||[{path:sharePaths[0],code:lastShareData.code,links:lastShareData.links}];
  var links=items.map(function(it){return it.links&&it.links.pathForm?it.links.pathForm:'';}).filter(Boolean);
  copyText(links.join('\\n'));
}
function copyShareToken(){
  var text=buildShareTokenText();
  if(text)copyText(text);
}
function loadShares(){
  api('/api/codes').then(function(data){
    renderShares(data.codes||[]);
  }).catch(function(e){$('sharesContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text3)">加载失败：'+escapeHtml(e.message)+'</div>';});
}
function renderShares(codes){
  if(!codes.length){$('sharesContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text3)">暂无分享码</div>';return;}
  var html='<table class="share-table"><thead><tr><th>分享码</th><th>路径范围</th><th>有效期</th><th>来源</th><th>备注</th><th>操作</th></tr></thead><tbody>';
  codes.forEach(function(c){
    var isExpired=!!c.expired;
    var expireText=c.expireAt?fmtTime(c.expireAt):'永久';
    html+='<tr>';
    html+='<td class="st-code">'+escapeHtml(c.code)+'</td>';
    html+='<td class="st-paths">'+(c.paths||[]).map(escapeHtml).join('<br>')+'</td>';
    html+='<td class="st-expire '+(c.expireAt?(isExpired?'expired':''):'perm')+'">'+expireText+(isExpired?'（已过期）':'')+'</td>';
    html+='<td><span class="st-source '+(c.source==='dynamic'?'dynamic':'')+'">'+(c.source==='dynamic'?'动态':'静态')+'</span></td>';
    html+='<td style="font-size:12px;color:var(--text2);max-width:120px;word-break:break-all">'+escapeHtml(c.note||'-')+'</td>';
    html+='<td class="st-ops">';
    var firstPath=(c.paths&&c.paths[0])||'';
    var demoUrl=location.origin+(firstPath==='**'?'/':encodeURI(firstPath))+'?code='+encodeURIComponent(c.code);
    html+='<button data-copy="'+escapeHtml(demoUrl)+'">复制链接</button>';
    if(c.source==='dynamic'){html+='<button class="del" data-del-share="'+escapeHtml(c.code)+'">删除</button>';}
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  $('sharesContent').innerHTML=html;
}
function deleteShare(code){
  if(!confirm('确定删除分享码 '+code+' ？'))return;
  api('/api/codes/'+encodeURIComponent(code),{method:'DELETE'}).then(function(){toast('已删除');loadShares();}).catch(function(e){toast('删除失败：'+e.message);});
}
function initMain(){loadDir();}
document.addEventListener('click',function(e){
  var el;
  el=e.target.closest('[data-close]');
  if(el){closeDialog(el.getAttribute('data-close'));return;}
  el=e.target.closest('[data-copy]');
  if(el){copyText(el.getAttribute('data-copy'));return;}
  el=e.target.closest('[data-nav]');
  if(el){nav(el.getAttribute('data-nav'));return;}
  el=e.target.closest('.side-item[data-tab]');
  if(el){switchTab(el.getAttribute('data-tab'));return;}
  el=e.target.closest('.expire-opt');
  if(el){
    document.querySelectorAll('.expire-opt').forEach(function(x){x.classList.remove('active');});
    el.classList.add('active');
    $('customExpireWrap').classList.toggle('show',el.getAttribute('data-expire')==='custom');
    return;
  }
  el=e.target.closest('[data-op]');
  if(el){
    e.stopPropagation();
    var op=el.getAttribute('data-op');var p=el.getAttribute('data-path');
    if(op==='download'){downloadItem(p);}
    else if(op==='share'){openShareDialog([p]);}
    else if(op==='delete'){confirmDelete([p]);}
    return;
  }
  el=e.target.closest('.item-cb,.gc-check');
  if(el){
    e.stopPropagation();
    var p2=el.getAttribute('data-path');
    if(el.checked){selected[p2]=true;}else{delete selected[p2];}
    var row=el.closest('tr, .grid-card');
    if(row){row.classList.toggle('selected',el.checked);}
    updateSelBar();
    return;
  }
  el=e.target.closest('#checkAll');
  if(el){
    var items=getFilteredItems();
    if(el.checked){items.forEach(function(it){selected[it.path]=true;});}
    else{items.forEach(function(it){delete selected[it.path];});}
    renderFiles();updateSelBar();
    return;
  }
  el=e.target.closest('tr[data-path], .grid-card[data-path]');
  if(el){
    var p3=el.getAttribute('data-path');
    var isDir=el.getAttribute('data-dir')==='1';
    if(isDir){nav(p3);}
    else{
      if(selected[p3]){delete selected[p3];}else{selected[p3]=true;}
      renderFiles();updateSelBar();
    }
    return;
  }
  el=e.target.closest('[data-del-share]');
  if(el){deleteShare(el.getAttribute('data-del-share'));return;}
});
$('loginBtn').addEventListener('click',login);
$('tokenInput').addEventListener('keydown',function(e){if(e.key==='Enter')login();});
$('logoutBtn').addEventListener('click',logout);
$('uploadBtn').addEventListener('click',function(){$('fileInput').click();});
$('fileInput').addEventListener('change',function(e){uploadFiles(e.target.files);e.target.value='';});
$('mkdirBtn').addEventListener('click',openMkdirDialog);
$('mkdirConfirmBtn').addEventListener('click',doMkdir);
$('mkdirName').addEventListener('keydown',function(e){if(e.key==='Enter')doMkdir();});
$('refreshBtn').addEventListener('click',function(){loadDir();});
$('refreshSharesBtn').addEventListener('click',function(){loadShares();});
$('viewList').addEventListener('click',function(){viewMode='list';$('viewList').classList.add('active');$('viewGrid').classList.remove('active');renderFiles();});
$('viewGrid').addEventListener('click',function(){viewMode='grid';$('viewGrid').classList.add('active');$('viewList').classList.remove('active');renderFiles();});
$('selDownloadBtn').addEventListener('click',downloadSelected);
$('selShareBtn').addEventListener('click',function(){var keys=Object.keys(selected).filter(function(k){return selected[k];});if(keys.length)openShareDialog(keys);else toast('请先选择文件');});
$('selDeleteBtn').addEventListener('click',function(){var keys=Object.keys(selected).filter(function(k){return selected[k];});if(keys.length)confirmDelete(keys);else toast('请先选择文件');});
$('createShareBtn').addEventListener('click',createShares);
$('copyLinkBtn').addEventListener('click',copyShareLink);
$('copyTokenBtn').addEventListener('click',copyShareToken);
$('deleteConfirmBtn').addEventListener('click',doDelete);
$('uploadToggle').addEventListener('click',function(){$('uploadPanel').classList.toggle('show');});
$('upClearBtn').addEventListener('click',clearUploadTasks);
$('searchInput').addEventListener('input',function(e){searchKeyword=e.target.value.trim();renderFiles();});
var dragCounter=0;
var fileArea=$('fileArea');
fileArea.addEventListener('dragenter',function(e){e.preventDefault();dragCounter++;$('dropOverlay').classList.add('show');});
fileArea.addEventListener('dragover',function(e){e.preventDefault();});
fileArea.addEventListener('dragleave',function(e){e.preventDefault();dragCounter--;if(dragCounter<=0){dragCounter=0;$('dropOverlay').classList.remove('show');}});
fileArea.addEventListener('drop',function(e){e.preventDefault();dragCounter=0;$('dropOverlay').classList.remove('show');if(e.dataTransfer&&e.dataTransfer.files){uploadFiles(e.dataTransfer.files);}});
document.addEventListener('dragover',function(e){e.preventDefault();});
document.addEventListener('drop',function(e){e.preventDefault();});
token=store().getItem(TOKEN_KEY)||'';
if(token){showMain();initMain();}else{showLogin();}
window.login=login;
})();
</script>
</body>
</html>`;
}
