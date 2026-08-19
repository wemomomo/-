(function(){
  'use strict';

  // ============ IndexedDB 存储模块 ============
  var DB_NAME = 'AppDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'appData';
  var db = null;

  function openDB(callback) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = function(e) {
      db = e.target.result;
      if (callback) callback();
    };
    request.onerror = function() {
      console.error('IndexedDB 打开失败');
      if (callback) callback();
    };
  }

  function dbSave(key, value, callback) {
    if (!db) { if (callback) callback(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror = function() { if (callback) callback(); };
  }

  function dbGet(key, callback) {
    if (!db) { callback(null); return; }
    var tx = db.transaction(STORE_NAME, 'readonly');
    var store = tx.objectStore(STORE_NAME);
    var request = store.get(key);
    request.onsuccess = function() { callback(request.result || null); };
    request.onerror = function() { callback(null); };
  }

  function dbDelete(key, callback) {
    if (!db) { if (callback) callback(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = function() { if (callback) callback(); };
    tx.onerror = function() { if (callback) callback(); };
  }

  window.AppDB = {
    open: openDB,
    save: dbSave,
    get: dbGet,
    delete: dbDelete
  };

  // ============ 照片裁剪模块 ============
  var cropModal = document.getElementById('cropModal');
  var cropImage = document.getElementById('cropImage');
  var cropCancel = document.getElementById('cropCancel');
  var cropConfirm = document.getElementById('cropConfirm');
  var cropper = null;
  var cropCallback = null;

    function openCropper(imageDataUrl, options, callback) {
    cropCallback = callback;
    var cropAspect = (options && options.aspectRatio) || NaN;
    cropImage.src = imageDataUrl;
    cropModal.classList.add('show');

    setTimeout(function() {
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImage, {
        aspectRatio: cropAspect,
        viewMode: 1,           // 限制裁剪框不能跑出图片外面
        autoCropArea: 1,       // 初始直接把裁剪框拉到最大（按比例最大化）
        movable: false,        // 【关键】禁止图片乱动，图片死死锁住
        zoomable: false,       // 【关键】禁止图片缩放
        scalable: false,       // 禁止乱翻转
        background: true
      });
    }, 100);
  }

  function closeCropper() {
    cropModal.classList.remove('show');
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropCallback = null;
  }

  cropCancel.addEventListener('click', closeCropper);
  cropConfirm.addEventListener('click', function() {
    if (!cropper || !cropCallback) return;
    var canvas = cropper.getCroppedCanvas({
      maxWidth: 1200,
      maxHeight: 1200,
      imageSmoothingQuality: 'high'
    });
    var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    var cb = cropCallback;
    closeCropper();
    cb(dataUrl);
  });

  window.AppCropper = {
    open: openCropper,
    close: closeCropper
  };

  // ============ 页面导航 ============
  var pages = document.querySelectorAll('.page');
  var tabs = document.querySelectorAll('.tab-item');

  function showPage(name) {
    pages.forEach(function(p) { p.classList.toggle('active', p.dataset.page === name); });
  }
  function setActiveTab(tab) {
    tabs.forEach(function(t) { t.classList.toggle('active', t === tab); });
  }

tabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    // 弹出开发中提示
    showToast('开发中');
  });
});

// Toast 提示函数
function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      document.body.removeChild(toast);
    }, 300);
  }, 1500);
}

  // ============ 图标拖拽功能 ============
  function initIconDrag() {
    var DELAY = 250;
    var SNAP = 12;
    var ALL_ICONS = ['iconPlot', 'iconMessage', 'iconExplore', 'iconVault'];

    dbGet('appIconOffsets', function(offsets) {
      if (!offsets) offsets = {};
      ALL_ICONS.forEach(function(id) {
        var el = document.getElementById(id); 
        if(!el) return;
        var off = offsets[id]; 
        if(off) {
          var tf = 'translate('+off.x+'px,'+off.y+'px)';
          el.style.setProperty('--t', tf);
          el.style.transform = tf;
        }
      });
    });

    ALL_ICONS.forEach(function(id) {
      var el = document.getElementById(id); 
      if(!el || el._iconDragBound) return;
      el._iconDragBound = true;
      
      var startX, startY, origX, origY, longPressed = false, timer, moved = false;

      el.addEventListener('touchstart', function(e) {
        var t = e.touches[0]; 
        startX = t.clientX; 
        startY = t.clientY; 
        longPressed = false; 
        moved = false;
        
        timer = setTimeout(function() {
          longPressed = true;
          dbGet('appIconOffsets', function(savedOffsets) {
            if (!savedOffsets) savedOffsets = {};
            var off = savedOffsets[id] || {x:0, y:0};
            origX = off.x; 
            origY = off.y;
            el.classList.add('is-grabbed');
            el.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            var tf = 'translate('+origX+'px,'+origY+'px) scale(1.1)';
            el.style.setProperty('--t', tf);
            el.style.transform = tf;
            el.style.zIndex = '999';
            if(navigator.vibrate) navigator.vibrate(15);
          });
        }, DELAY);
      }, {passive:true});

      el.addEventListener('touchmove', function(e) {
        var t = e.touches[0];
        if(timer && !longPressed) {
          if(Math.abs(t.clientX-startX)>8 || Math.abs(t.clientY-startY)>8){
            clearTimeout(timer);
            timer=null;
          }
          return;
        }
        if(!longPressed) return;
        moved = true; 
        e.preventDefault(); 
        e.stopPropagation();
        
        var nx = origX + (t.clientX - startX);
        var ny = origY + (t.clientY - startY);
        
        dbGet('appIconOffsets', function(savedOffsets) {
          if (!savedOffsets) savedOffsets = {};
          ALL_ICONS.forEach(function(otherId) {
            if(otherId === id) return;
            var otherOff = savedOffsets[otherId] || {x:0, y:0};
            if(Math.abs(ny - otherOff.y) < SNAP) ny = otherOff.y;
            if(Math.abs(nx - otherOff.x) < SNAP) nx = otherOff.x;
          });
          
          el.style.transition = 'none';
          var tf = 'translate('+nx+'px,'+ny+'px) scale(1.1)';
          el.style.setProperty('--t', tf);
          el.style.transform = tf;
        });
      }, {passive:false});

      el.addEventListener('touchend', function(e) {
        clearTimeout(timer); 
        timer=null;
        el.classList.remove('is-grabbed'); 
        
        if(longPressed) {
          if(moved) { 
            dbGet('appIconOffsets', function(savedOffsets) {
              if (!savedOffsets) savedOffsets = {};
              var match = el.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
              if(match) { 
                savedOffsets[id] = {x:parseFloat(match[1]), y:parseFloat(match[2])}; 
                dbSave('appIconOffsets', savedOffsets);
              }
            });
            e.stopPropagation(); 
          }
          el.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
          dbGet('appIconOffsets', function(savedOffsets) {
            if (!savedOffsets) savedOffsets = {};
            var curOff = savedOffsets[id] || {x:0, y:0};
            var tf = 'translate('+curOff.x+'px,'+curOff.y+'px) scale(1)';
            el.style.setProperty('--t', tf);
            el.style.transform = tf;
          });
          setTimeout(function(){ 
            el.style.transition=''; 
            el.style.zIndex=''; 
          }, 350);
        } else {
          el.style.transition=''; 
          el.style.zIndex='';
        }
        longPressed=false; 
        moved=false;
      });
    });
  }

  // ============ 初始化 ============
  openDB(function() {
    initIconDrag();
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

  window.AppNav = {
    showPage: showPage,
    setActiveTab: setActiveTab
  };

})();