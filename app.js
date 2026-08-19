
(function(){
  'use strict';

  // ============ IndexedDB ============
  var DB_NAME = 'MoMoAppDB';
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

  // ============ Canvas 裁剪器 ============
  window.AppCropper = {
    open: function(src, options, callback) {
      var overlay = document.createElement('div');
      overlay.className = 'crop-overlay';
      overlay.style.zIndex = '200000';

      var lockedRatio = (options && options.aspectRatio) || 0;

      overlay.innerHTML =
        '<div class="crop-container">' +
          '<div class="crop-header">' +
            '<button class="crop-cancel" type="button">取消</button>' +
            '<span>裁剪图片</span>' +
            '<button class="crop-confirm" type="button">确定</button>' +
          '</div>' +
          '<div class="crop-toolbar">' +
            '<button class="crop-ratio-btn active" data-ratio="free" type="button">自由</button>' +
            '<button class="crop-ratio-btn" data-ratio="1" type="button">1:1</button>' +
            '<button class="crop-ratio-btn" data-ratio="4:3" type="button">4:3</button>' +
            '<button class="crop-ratio-btn" data-ratio="16:9" type="button">16:9</button>' +
          '</div>' +
          '<div class="crop-workspace"><canvas id="cropCanvas"></canvas></div>' +
        '</div>';

      document.body.appendChild(overlay);

      var canvas = overlay.querySelector('#cropCanvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var dpr = window.devicePixelRatio || 1;

      var crop = { x: 0, y: 0, w: 0, h: 0 };
      var scale = 1;
      var displayW = 0;
      var displayH = 0;
      var dragMode = '';
      var startX = 0, startY = 0;
      var startCrop = {};
      var HANDLE = 20;
      var MIN_SIZE = 30;

      img.onload = function() {
        var workspace = overlay.querySelector('.crop-workspace');
        var maxW = workspace.clientWidth - 40;
        var maxH = workspace.clientHeight - 40;

        if (maxW <= 0 || maxH <= 0) {
          maxW = window.innerWidth - 40;
          maxH = window.innerHeight - 200;
        }

        scale = Math.min(maxW / img.width, maxH / img.height, 1);
        displayW = Math.round(img.width * scale);
        displayH = Math.round(img.height * scale);

        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';
        ctx.scale(dpr, dpr);

        if (lockedRatio) {
          var initW = displayW * 0.85;
          var initH = initW / lockedRatio;
          if (initH > displayH * 0.85) { initH = displayH * 0.85; initW = initH * lockedRatio; }
          crop.w = initW; crop.h = initH;
        } else {
          crop.w = displayW * 0.7;
          crop.h = displayH * 0.7;
        }
        crop.x = (displayW - crop.w) / 2;
        crop.y = (displayH - crop.h) / 2;

        draw();
      };

      // 等浏览器完成渲染后再加载图片
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          img.src = src;
        });
      });

      function clampCrop() {
        crop.w = Math.max(MIN_SIZE, Math.min(displayW, crop.w));
        crop.h = Math.max(MIN_SIZE, Math.min(displayH, crop.h));
        crop.x = Math.max(0, Math.min(displayW - crop.w, crop.x));
        crop.y = Math.max(0, Math.min(displayH - crop.h, crop.y));
      }

      function draw() {
        ctx.clearRect(0, 0, displayW, displayH);
        ctx.drawImage(img, 0, 0, displayW, displayH);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, displayW, crop.y);
        ctx.fillRect(0, crop.y + crop.h, displayW, displayH - crop.y - crop.h);
        ctx.fillRect(0, crop.y, crop.x, crop.h);
        ctx.fillRect(crop.x + crop.w, crop.y, displayW - crop.x - crop.w, crop.h);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        var tw = crop.w / 3, th = crop.h / 3;
        ctx.beginPath();
        ctx.moveTo(crop.x + tw, crop.y); ctx.lineTo(crop.x + tw, crop.y + crop.h);
        ctx.moveTo(crop.x + tw * 2, crop.y); ctx.lineTo(crop.x + tw * 2, crop.y + crop.h);
        ctx.moveTo(crop.x, crop.y + th); ctx.lineTo(crop.x + crop.w, crop.y + th);
        ctx.moveTo(crop.x, crop.y + th * 2); ctx.lineTo(crop.x + crop.w, crop.y + th * 2);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        var hs = 8;
        [[crop.x, crop.y],[crop.x + crop.w, crop.y],[crop.x, crop.y + crop.h],[crop.x + crop.w, crop.y + crop.h]].forEach(function(c) {
          ctx.fillRect(c[0] - hs / 2, c[1] - hs / 2, hs, hs);
        });
        [[crop.x + crop.w / 2, crop.y],[crop.x + crop.w / 2, crop.y + crop.h],[crop.x, crop.y + crop.h / 2],[crop.x + crop.w, crop.y + crop.h / 2]].forEach(function(m) {
          ctx.fillRect(m[0] - hs / 2, m[1] - hs / 2, hs, hs);
        });
      }

      function getPos(e) {
        var t = e.touches ? e.touches[0] : e;
        var rect = canvas.getBoundingClientRect();
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }

      function hitTest(px, py) {
        var cx = crop.x, cy = crop.y, cw = crop.w, ch = crop.h, H = HANDLE;
        if (px >= cx - H && px <= cx + H && py >= cy - H && py <= cy + H) return 'tl';
        if (px >= cx + cw - H && px <= cx + cw + H && py >= cy - H && py <= cy + H) return 'tr';
        if (px >= cx - H && px <= cx + H && py >= cy + ch - H && py <= cy + ch + H) return 'bl';
        if (px >= cx + cw - H && px <= cx + cw + H && py >= cy + ch - H && py <= cy + ch + H) return 'br';
        if (py >= cy - H && py <= cy + H && px > cx + H && px < cx + cw - H) return 't';
        if (py >= cy + ch - H && py <= cy + ch + H && px > cx + H && px < cx + cw - H) return 'b';
        if (px >= cx - H && px <= cx + H && py > cy + H && py < cy + ch - H) return 'l';
        if (px >= cx + cw - H && px <= cx + cw + H && py > cy + H && py < cy + ch - H) return 'r';
        if (px >= cx && px <= cx + cw && py >= cy && py <= cy + ch) return 'move';
        return '';
      }

      function applyRatio(mode) {
        if (!lockedRatio || mode === 'move') return;
        if (mode === 't' || mode === 'b') { crop.w = crop.h * lockedRatio; }
        else { crop.h = crop.w / lockedRatio; }
      }

      canvas.addEventListener('mousedown', onStart);
      canvas.addEventListener('touchstart', onStart, { passive: false });

      function onStart(e) {
        if (e.touches && e.touches.length > 1) return;
        e.preventDefault();
        var p = getPos(e);
        dragMode = hitTest(p.x, p.y);
        if (!dragMode) return;
        startX = p.x; startY = p.y;
        startCrop = { x: crop.x, y: crop.y, w: crop.w, h: crop.h };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      }

      function onMove(e) {
        if (!dragMode) return;
        e.preventDefault();
        var p = getPos(e);
        var dx = p.x - startX, dy = p.y - startY;
        var sc = startCrop;

        if (dragMode === 'move') { crop.x = sc.x + dx; crop.y = sc.y + dy; }
        else if (dragMode === 'br') { crop.w = sc.w + dx; crop.h = sc.h + dy; applyRatio('br'); }
        else if (dragMode === 'bl') { crop.x = sc.x + dx; crop.w = sc.w - dx; crop.h = sc.h + dy; applyRatio('bl'); }
        else if (dragMode === 'tr') { crop.w = sc.w + dx; crop.y = sc.y + dy; crop.h = sc.h - dy; applyRatio('tr'); }
        else if (dragMode === 'tl') { crop.x = sc.x + dx; crop.y = sc.y + dy; crop.w = sc.w - dx; crop.h = sc.h - dy; applyRatio('tl'); }
        else if (dragMode === 'r') { crop.w = sc.w + dx; applyRatio('r'); }
        else if (dragMode === 'l') { crop.x = sc.x + dx; crop.w = sc.w - dx; applyRatio('l'); }
        else if (dragMode === 'b') { crop.h = sc.h + dy; applyRatio('b'); }
        else if (dragMode === 't') { crop.y = sc.y + dy; crop.h = sc.h - dy; applyRatio('t'); }

        clampCrop(); draw();
      }

      function onEnd() {
        dragMode = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }

      // 双指缩放裁剪框
      var lastDist = 0;
      canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
          e.preventDefault();
          dragMode = '';
          lastDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      }, { passive: false });

      canvas.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
          e.preventDefault();
          var dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          var diff = dist - lastDist;
          var ratio = crop.w / crop.h;
          var cx2 = crop.x + crop.w / 2;
          var cy2 = crop.y + crop.h / 2;
          crop.w = Math.max(MIN_SIZE, crop.w + diff);
          crop.h = Math.max(MIN_SIZE, crop.h + diff / ratio);
          crop.x = cx2 - crop.w / 2;
          crop.y = cy2 - crop.h / 2;
          clampCrop();
          lastDist = dist;
          draw();
        }
      }, { passive: false });

      // 比例按钮
      overlay.querySelectorAll('.crop-ratio-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          overlay.querySelectorAll('.crop-ratio-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var r = btn.dataset.ratio;
          if (r === 'free') lockedRatio = 0;
          else if (r === '1') lockedRatio = 1;
          else if (r === '4:3') lockedRatio = 4 / 3;
          else if (r === '16:9') lockedRatio = 16 / 9;
          if (lockedRatio) {
            var cx3 = crop.x + crop.w / 2;
            var cy3 = crop.y + crop.h / 2;
            var newW = crop.w;
            var newH = newW / lockedRatio;
            if (newH > displayH * 0.9) { newH = displayH * 0.9; newW = newH * lockedRatio; }
            crop.w = newW; crop.h = newH;
            crop.x = cx3 - crop.w / 2; crop.y = cy3 - crop.h / 2;
            clampCrop(); draw();
          }
        });
      });

      overlay.querySelector('.crop-cancel').addEventListener('click', function() {
        overlay.remove();
      });

      overlay.querySelector('.crop-confirm').addEventListener('click', function() {
        var output = document.createElement('canvas');
        var outW = Math.round(crop.w / scale);
        var outH = Math.round(crop.h / scale);
        output.width = outW;
        output.height = outH;
        var outCtx = output.getContext('2d');
        outCtx.drawImage(img,
          crop.x / scale, crop.y / scale, crop.w / scale, crop.h / scale,
          0, 0, outW, outH
        );
        var data = output.toDataURL('image/jpeg', 0.9);
        overlay.remove();
        callback(data);
      });
    }
  };

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

  // ============ 页面导航 ============
  var pages = document.querySelectorAll('.page');
  var tabs = document.querySelectorAll('.tab-item');

  function showPage(name) { pages.forEach(function(p) { p.classList.toggle('active', p.dataset.page === name); }); }
  function setActiveTab(tab) { tabs.forEach(function(t) { t.classList.toggle('active', t === tab); }); }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() { showToast('开发中'); });
  });

  window.AppNav = { showPage: showPage, setActiveTab: setActiveTab, showToast: showToast };

  // ============ 初始化 ============
  openDB(function() {
    setupPhotoAction();
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

})();
