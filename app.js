(function(){
  'use strict';

  // ============ IndexedDB ============
  var DB_NAME = 'AppDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'appData';
  var db = null;

  function openDB(callback) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = function(e) { db = e.target.result; if (callback) callback(); };
    request.onerror = function() { if (callback) callback(); };
  }

  function dbSave(key, value, cb) {
    if (!db) { if (cb) cb(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = function() { if (cb) cb(); };
  }
  function dbGet(key, cb) {
    if (!db) { cb(null); return; }
    var r = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    r.onsuccess = function() { cb(r.result || null); };
    r.onerror = function() { cb(null); };
  }
  function dbDelete(key, cb) {
    if (!db) { if (cb) cb(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = function() { if (cb) cb(); };
  }

  window.AppDB = { open: openDB, save: dbSave, get: dbGet, delete: dbDelete };

  // ============ Canvas 裁剪器（操作预先放好的DOM） ============
  var cropOverlay = document.getElementById('cropOverlay');
  var cropCanvas = document.getElementById('cropCanvas');
  var cropWorkspace = document.getElementById('cropWorkspace');
  var cropCancelBtn = document.getElementById('cropCancelBtn');
  var cropConfirmBtn = document.getElementById('cropConfirmBtn');
  var cropCtx = cropCanvas.getContext('2d');
  var cropDpr = window.devicePixelRatio || 1;

  var cropImg = null;
  var cropCallback = null;
  var cropScale = 1;
  var cropDisplayW = 0, cropDisplayH = 0;
  var cropBox = { x: 0, y: 0, w: 0, h: 0 };
  var cropLockedRatio = 0;
  var cropDragMode = '';
  var cropStartX = 0, cropStartY = 0, cropStartBox = {};
  var CROP_HANDLE = 20, CROP_MIN = 30;

  window.AppCropper = {
    open: function(src, options, callback) {
      cropCallback = callback;
      cropLockedRatio = (options && options.aspectRatio) || 0;

      // 重置比例按钮
      cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(b) { b.classList.remove('active'); });
      cropOverlay.querySelector('[data-ratio="free"]').classList.add('active');

      // 显示裁剪器
      cropOverlay.classList.add('show');

      // 加载图片
      cropImg = new Image();
      cropImg.onload = function() {
        var maxW = cropWorkspace.clientWidth - 40;
        var maxH = cropWorkspace.clientHeight - 40;
        if (maxW <= 0 || maxH <= 0) { maxW = window.innerWidth - 40; maxH = window.innerHeight - 200; }

        cropScale = Math.min(maxW / cropImg.width, maxH / cropImg.height, 1);
        cropDisplayW = Math.round(cropImg.width * cropScale);
        cropDisplayH = Math.round(cropImg.height * cropScale);

        cropCanvas.width = cropDisplayW * cropDpr;
        cropCanvas.height = cropDisplayH * cropDpr;
        cropCanvas.style.width = cropDisplayW + 'px';
        cropCanvas.style.height = cropDisplayH + 'px';
        cropCtx.setTransform(cropDpr, 0, 0, cropDpr, 0, 0);

        if (cropLockedRatio) {
          var initW = cropDisplayW * 0.85;
          var initH = initW / cropLockedRatio;
          if (initH > cropDisplayH * 0.85) { initH = cropDisplayH * 0.85; initW = initH * cropLockedRatio; }
          cropBox.w = initW; cropBox.h = initH;
        } else {
          cropBox.w = cropDisplayW * 0.7; cropBox.h = cropDisplayH * 0.7;
        }
        cropBox.x = (cropDisplayW - cropBox.w) / 2;
        cropBox.y = (cropDisplayH - cropBox.h) / 2;
        cropDraw();
      };
      cropImg.src = src;
    }
  };

  function cropClamp() {
    cropBox.w = Math.max(CROP_MIN, Math.min(cropDisplayW, cropBox.w));
    cropBox.h = Math.max(CROP_MIN, Math.min(cropDisplayH, cropBox.h));
    cropBox.x = Math.max(0, Math.min(cropDisplayW - cropBox.w, cropBox.x));
    cropBox.y = Math.max(0, Math.min(cropDisplayH - cropBox.h, cropBox.y));
  }

  function cropDraw() {
    var c = cropBox;
    cropCtx.clearRect(0, 0, cropDisplayW, cropDisplayH);
    cropCtx.drawImage(cropImg, 0, 0, cropDisplayW, cropDisplayH);
    cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
    cropCtx.fillRect(0, 0, cropDisplayW, c.y);
    cropCtx.fillRect(0, c.y + c.h, cropDisplayW, cropDisplayH - c.y - c.h);
    cropCtx.fillRect(0, c.y, c.x, c.h);
    cropCtx.fillRect(c.x + c.w, c.y, cropDisplayW - c.x - c.w, c.h);
    cropCtx.strokeStyle = '#fff'; cropCtx.lineWidth = 2;
    cropCtx.strokeRect(c.x, c.y, c.w, c.h);
    cropCtx.strokeStyle = 'rgba(255,255,255,0.3)'; cropCtx.lineWidth = 1;
    var tw = c.w / 3, th = c.h / 3;
    cropCtx.beginPath();
    cropCtx.moveTo(c.x + tw, c.y); cropCtx.lineTo(c.x + tw, c.y + c.h);
    cropCtx.moveTo(c.x + tw * 2, c.y); cropCtx.lineTo(c.x + tw * 2, c.y + c.h);
    cropCtx.moveTo(c.x, c.y + th); cropCtx.lineTo(c.x + c.w, c.y + th);
    cropCtx.moveTo(c.x, c.y + th * 2); cropCtx.lineTo(c.x + c.w, c.y + th * 2);
    cropCtx.stroke();
    cropCtx.fillStyle = '#fff';
    var hs = 8;
    [[c.x,c.y],[c.x+c.w,c.y],[c.x,c.y+c.h],[c.x+c.w,c.y+c.h]].forEach(function(p){cropCtx.fillRect(p[0]-hs/2,p[1]-hs/2,hs,hs);});
    [[c.x+c.w/2,c.y],[c.x+c.w/2,c.y+c.h],[c.x,c.y+c.h/2],[c.x+c.w,c.y+c.h/2]].forEach(function(p){cropCtx.fillRect(p[0]-hs/2,p[1]-hs/2,hs,hs);});
  }

  function cropGetPos(e) {
    var t = e.touches ? e.touches[0] : e;
    var rect = cropCanvas.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function cropHitTest(px, py) {
    var c = cropBox, H = CROP_HANDLE;
    if (px >= c.x-H && px <= c.x+H && py >= c.y-H && py <= c.y+H) return 'tl';
    if (px >= c.x+c.w-H && px <= c.x+c.w+H && py >= c.y-H && py <= c.y+H) return 'tr';
    if (px >= c.x-H && px <= c.x+H && py >= c.y+c.h-H && py <= c.y+c.h+H) return 'bl';
    if (px >= c.x+c.w-H && px <= c.x+c.w+H && py >= c.y+c.h-H && py <= c.y+c.h+H) return 'br';
    if (py >= c.y-H && py <= c.y+H && px > c.x+H && px < c.x+c.w-H) return 't';
    if (py >= c.y+c.h-H && py <= c.y+c.h+H && px > c.x+H && px < c.x+c.w-H) return 'b';
    if (px >= c.x-H && px <= c.x+H && py > c.y+H && py < c.y+c.h-H) return 'l';
    if (px >= c.x+c.w-H && px <= c.x+c.w+H && py > c.y+H && py < c.y+c.h-H) return 'r';
    if (px >= c.x && px <= c.x+c.w && py >= c.y && py <= c.y+c.h) return 'move';
    return '';
  }

  function cropApplyRatio(mode) {
    if (!cropLockedRatio || mode === 'move') return;
    if (mode === 't' || mode === 'b') cropBox.w = cropBox.h * cropLockedRatio;
    else cropBox.h = cropBox.w / cropLockedRatio;
  }

  function cropOnStart(e) {
    if (e.touches && e.touches.length > 1) return;
    e.preventDefault();
    var p = cropGetPos(e);
    cropDragMode = cropHitTest(p.x, p.y);
    if (!cropDragMode) return;
    cropStartX = p.x; cropStartY = p.y;
    cropStartBox = { x: cropBox.x, y: cropBox.y, w: cropBox.w, h: cropBox.h };
    document.addEventListener('mousemove', cropOnMove);
    document.addEventListener('mouseup', cropOnEnd);
    document.addEventListener('touchmove', cropOnMove, { passive: false });
    document.addEventListener('touchend', cropOnEnd);
  }

  function cropOnMove(e) {
    if (!cropDragMode) return;
    e.preventDefault();
    var p = cropGetPos(e);
    var dx = p.x - cropStartX, dy = p.y - cropStartY;
    var sc = cropStartBox;
    if (cropDragMode === 'move') { cropBox.x = sc.x + dx; cropBox.y = sc.y + dy; }
    else if (cropDragMode === 'br') { cropBox.w = sc.w + dx; cropBox.h = sc.h + dy; cropApplyRatio('br'); }
    else if (cropDragMode === 'bl') { cropBox.x = sc.x + dx; cropBox.w = sc.w - dx; cropBox.h = sc.h + dy; cropApplyRatio('bl'); }
    else if (cropDragMode === 'tr') { cropBox.w = sc.w + dx; cropBox.y = sc.y + dy; cropBox.h = sc.h - dy; cropApplyRatio('tr'); }
    else if (cropDragMode === 'tl') { cropBox.x = sc.x + dx; cropBox.y = sc.y + dy; cropBox.w = sc.w - dx; cropBox.h = sc.h - dy; cropApplyRatio('tl'); }
    else if (cropDragMode === 'r') { cropBox.w = sc.w + dx; cropApplyRatio('r'); }
    else if (cropDragMode === 'l') { cropBox.x = sc.x + dx; cropBox.w = sc.w - dx; cropApplyRatio('l'); }
    else if (cropDragMode === 'b') { cropBox.h = sc.h + dy; cropApplyRatio('b'); }
    else if (cropDragMode === 't') { cropBox.y = sc.y + dy; cropBox.h = sc.h - dy; cropApplyRatio('t'); }
    cropClamp(); cropDraw();
  }

  function cropOnEnd() {
    cropDragMode = '';
    document.removeEventListener('mousemove', cropOnMove);
    document.removeEventListener('mouseup', cropOnEnd);
    document.removeEventListener('touchmove', cropOnMove);
    document.removeEventListener('touchend', cropOnEnd);
  }

  cropCanvas.addEventListener('mousedown', cropOnStart);
  cropCanvas.addEventListener('touchstart', cropOnStart, { passive: false });

  // 双指缩放
  var cropLastDist = 0;
  cropCanvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault(); cropDragMode = '';
      cropLastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: false });
  cropCanvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      var diff = dist - cropLastDist;
      var ratio = cropBox.w / cropBox.h;
      var cx = cropBox.x + cropBox.w / 2, cy = cropBox.y + cropBox.h / 2;
      cropBox.w = Math.max(CROP_MIN, cropBox.w + diff);
      cropBox.h = Math.max(CROP_MIN, cropBox.h + diff / ratio);
      cropBox.x = cx - cropBox.w / 2; cropBox.y = cy - cropBox.h / 2;
      cropClamp(); cropLastDist = dist; cropDraw();
    }
  }, { passive: false });

  // 比例按钮
  cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var r = btn.dataset.ratio;
      if (r === 'free') cropLockedRatio = 0;
      else if (r === '1') cropLockedRatio = 1;
      else if (r === '4:3') cropLockedRatio = 4 / 3;
      else if (r === '16:9') cropLockedRatio = 16 / 9;
      if (cropLockedRatio) {
        var cx = cropBox.x + cropBox.w / 2, cy = cropBox.y + cropBox.h / 2;
        var newW = cropBox.w, newH = newW / cropLockedRatio;
        if (newH > cropDisplayH * 0.9) { newH = cropDisplayH * 0.9; newW = newH * cropLockedRatio; }
        cropBox.w = newW; cropBox.h = newH;
        cropBox.x = cx - cropBox.w / 2; cropBox.y = cy - cropBox.h / 2;
        cropClamp(); cropDraw();
      }
    });
  });

  cropCancelBtn.addEventListener('click', function() {
    cropOverlay.classList.remove('show');
    cropCallback = null;
  });

  cropConfirmBtn.addEventListener('click', function() {
    var output = document.createElement('canvas');
    var outW = Math.round(cropBox.w / cropScale), outH = Math.round(cropBox.h / cropScale);
    output.width = outW; output.height = outH;
    var outCtx = output.getContext('2d');
    outCtx.drawImage(cropImg, cropBox.x / cropScale, cropBox.y / cropScale, cropBox.w / cropScale, cropBox.h / cropScale, 0, 0, outW, outH);
    var data = output.toDataURL('image/jpeg', 0.9);
    cropOverlay.classList.remove('show');
    if (cropCallback) cropCallback(data);
    cropCallback = null;
  });

  // ============ 照片操作卡片（全局） ============
  var photoActionCard = null;
  var photoActionMask = null;
  var photoActionOnSelect = null;
  var photoActionOnDelete = null;

  function setupPhotoAction() {
    photoActionMask = document.createElement('div');
    photoActionMask.className = 'photo-action-mask';
    document.body.appendChild(photoActionMask);

    photoActionCard = document.createElement('div');
    photoActionCard.className = 'photo-action-card';
    photoActionCard.innerHTML = '<button id="paSelectBtn">选择照片</button><button id="paDeleteBtn">删除照片</button>';
    document.body.appendChild(photoActionCard);

    photoActionMask.addEventListener('click', function() {
      photoActionMask.classList.remove('show');
      photoActionCard.classList.remove('show');
      photoActionOnSelect = null; photoActionOnDelete = null;
    });

    document.getElementById('paSelectBtn').addEventListener('click', function() {
      var cb = photoActionOnSelect;
      photoActionMask.classList.remove('show');
      photoActionCard.classList.remove('show');
      photoActionOnSelect = null; photoActionOnDelete = null;
      if (cb) cb();
    });

    document.getElementById('paDeleteBtn').addEventListener('click', function() {
      var cb = photoActionOnDelete;
      photoActionMask.classList.remove('show');
      photoActionCard.classList.remove('show');
      photoActionOnSelect = null; photoActionOnDelete = null;
      if (cb) cb();
    });
  }

  window.PhotoAction = {
    show: function(onSelect, onDelete) {
      photoActionOnSelect = onSelect;
      photoActionOnDelete = onDelete;
      photoActionMask.classList.add('show');
      photoActionCard.classList.add('show');
    }
  };

  // ============ Toast ============
  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { document.body.removeChild(toast); }, 300);
    }, 1500);
  }

  // ============ 页面导航 (桌面与App模式) ============
  var pages = document.querySelectorAll('.page');
  var dock = document.querySelector('.tab-bar');
  var dockEditBtn = document.querySelector('.tabbar-edit-btn');

  // 初始化 App 空壳：注入标题栏和内容区
  function initAppShells() {
    var appPages = ['wechat', 'offline', 'settings', 'check'];
    appPages.forEach(function(name) {
      var page = document.querySelector('[data-page="' + name + '"]');
      if (!page || page.querySelector('.page-header-simple')) return; // 已初始化就跳过

      var titleText = { wechat: '微信', offline: '线下', settings: '设置', check: '查岗' }[name];
      
      page.innerHTML = 
        '<div class="page-header-simple">' +
          '<button class="icon-back-btn" data-back="home"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '</div>' +
        '<div class="page-title">' + titleText + '</div>' +
        '<div class="app-content" id="' + name + 'Content"></div>';
    });

    // 给设置页特殊处理：注入二级入口列表
    var settingsContent = document.getElementById('settingsContent');
    if (settingsContent && !settingsContent.querySelector('.settings-list')) {
      settingsContent.innerHTML = 
        '<div class="settings-list">' +
          '<div class="settings-item" data-goto="api">' +
            '<div class="settings-item-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>' +
            '<div class="settings-item-text">' +
              '<div class="settings-item-title">API 配置</div>' +
              '<div class="settings-item-desc">管理接口密钥与模型设置</div>' +
            '</div>' +
            '<svg class="settings-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>' +
          '</div>' +
          '<div class="settings-item" data-goto="data">' +
            '<div class="settings-item-icon"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>' +
            '<div class="settings-item-text">' +
              '<div class="settings-item-title">数据</div>' +
              '<div class="settings-item-desc">导入导出与清除本地数据</div>' +
            '</div>' +
            '<svg class="settings-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>' +
          '</div>' +
        '</div>';
    }

    // 创建 API 和 Data 的二级页面（如果不存在）
    var subPages = [
      { name: 'api', title: 'API 配置', back: 'settings' },
      { name: 'data', title: '数据', back: 'settings' }
    ];
    subPages.forEach(function(sub) {
      var existing = document.querySelector('[data-page="' + sub.name + '"]');
      if (existing) return;
      
      var subPage = document.createElement('div');
      subPage.className = 'page app-page';
      subPage.dataset.page = sub.name;
      subPage.innerHTML = 
        '<div class="page-header-simple">' +
          '<button class="icon-back-btn" data-back="' + sub.back + '"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '</div>' +
        '<div class="page-title">' + sub.title + '</div>' +
        '<div class="app-content" id="' + sub.name + 'PageContent"></div>';
      document.getElementById('pageContainer').appendChild(subPage);
    });
  }

  function showPage(name) {
    var allPages = document.querySelectorAll('.page');
    allPages.forEach(function(p) {
      if (p.dataset.page === name) {
        p.classList.add('active');
        p.style.transform = '';
      } else {
        p.classList.remove('active');
      }
    });

    // 如果回到桌面(home)，显示 Dock 栏
    if (name === 'home') {
      if (dock) dock.style.display = 'flex';
      if (dockEditBtn) dockEditBtn.style.display = 'block';
    } else {
      // 进入任何 App，隐藏 Dock 栏
      if (dock) dock.style.display = 'none';
      if (dockEditBtn) dockEditBtn.style.display = 'none';
    }
  }

  // 绑定所有返回按钮和跳转按钮
  function bindNavigation() {
    // Dock 栏点击
    document.querySelectorAll('.tab-item').forEach(function(tab) {
      tab.addEventListener('click', function() { showPage(this.dataset.tab); });
    });

    // data-back 返回按钮
    document.addEventListener('click', function(e) {
      var backBtn = e.target.closest('[data-back]');
      if (backBtn) showPage(backBtn.dataset.back);
    });

    // data-goto 跳转按钮
    document.addEventListener('click', function(e) {
      var gotoBtn = e.target.closest('[data-goto]');
      if (gotoBtn) showPage(gotoBtn.dataset.goto);
    });

    // 右滑返回
    document.querySelectorAll('.app-page').forEach(function(page) {
      var startX = 0, currentX = 0, isDragging = false;

      page.addEventListener('touchstart', function(e) {
        if (e.touches[0].clientX > 40) return;
        isDragging = true;
        startX = e.touches[0].clientX;
        page.style.transition = 'none';
      }, { passive: true });

      page.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        currentX = e.touches[0].clientX - startX;
        if (currentX > 0) page.style.transform = 'translateX(' + currentX + 'px)';
      }, { passive: true });

      page.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        page.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        
        var backBtn = page.querySelector('[data-back]');
        if (currentX > window.innerWidth * 0.3 && backBtn) {
          showPage(backBtn.dataset.back);
          setTimeout(function() { page.style.transform = ''; }, 300);
        } else {
          page.style.transform = 'translateX(0)';
        }
      });
    });
  }

  window.AppNav = { showPage: showPage, showToast: showToast };

  // ============ 初始化 ============
  openDB(function() {
    setupPhotoAction();
    initAppShells(); // 先搭建App骨架
    bindNavigation(); // 再绑定导航
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

})();

