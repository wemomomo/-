
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

  // 暴露到全局
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
  var cropAspect = null;

  function openCropper(imageDataUrl, options, callback) {
    cropCallback = callback;
    cropAspect = (options && options.aspectRatio) || NaN;
    cropImage.src = imageDataUrl;
    cropModal.classList.add('show');

    setTimeout(function() {
      if (cropper) {
        cropper.destroy();
      }
      cropper = new Cropper(cropImage, {
        aspectRatio: cropAspect,
        viewMode: 0,
        responsive: true,
        background: true,
        autoCropArea: 1,
        movable: true,
        zoomable: true,
        scalable: true,
        rotatable: true,
        minCropBoxWidth: 50,
        minCropBoxHeight: 50
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

  // 暴露到全局
  window.AppCropper = {
    open: openCropper,
    close: closeCropper
  };

  // ============ 页面导航 ============
  var pages = document.querySelectorAll('.page');
  var tabs = document.querySelectorAll('.tab-item');
  var icons = document.querySelectorAll('.app-icon-item');

  function showPage(name) {
    pages.forEach(function(p) { p.classList.toggle('active', p.dataset.page === name); });
  }
  function setActiveTab(tab) {
    tabs.forEach(function(t) { t.classList.toggle('active', t === tab); });
  }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      setActiveTab(this);
      showPage(this.dataset.tab);
    });
  });

  var actionMap = { 
    iconPlot: 'plot', 
    iconMessage: 'message', 
    iconExplore: 'explore', 
    iconVault: 'vault' 
  };
  
  icons.forEach(function(icon) {
    icon.addEventListener('click', function() {
      // 只有在非编辑模式下才跳转页面
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) {
        return;
      }
      var iconId = this.id;
      var pageName = actionMap[iconId];
      if (pageName) {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        showPage(pageName);
      }
    });
  });

  // ============ 图标拖拽功能 ============
  function initIconDrag() {
    var DELAY = 250;
    var SNAP = 12;
    var ALL_ICONS = ['iconPlot', 'iconMessage', 'iconExplore', 'iconVault'];

    // 恢复保存的位置
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

    // 绑定拖拽事件
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
        
        // 磁吸对齐
        dbGet('appIconOffsets', function(savedOffsets) {
          if (!savedOffsets) savedOffsets = {};
          ALL_ICONS.forEach(function(otherId) {
            if(otherId === id) return;
            var otherOff = savedOffsets[otherId] || {x:0, y:0};
            if(Math.abs(ny - otherOff.y) < SNAP) ny = otherOff.y;
            if(Math.abs(nx - otherOff.x) < SNAP) nx = otherOff.x;
          });
        });
        
        el.style.transition = 'none';
        var tf = 'translate('+nx+'px,'+ny+'px) scale(1.1)';
        el.style.setProperty('--t', tf);
        el.style.transform = tf;
      }, {passive:false});

      el.addEventListener('touchend', function(e) {
        clearTimeout(timer); 
        timer=null;
        el.classList.remove('is-grabbed'); 
        
        if(longPressed) {
          if(moved) { 
            // 保存位置
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

  // ============ 图标上传功能 ============
  function setupAppIcons() {
    var appIcons = document.querySelectorAll('.app-icon-item');
    
    appIcons.forEach(function(iconItem) {
      var iconId = iconItem.id;
      var iconImg = iconItem.querySelector('.app-icon-glass');
      var iconImage = iconItem.querySelector('.icon-image');
      
      if (!iconId || !iconImg) return;
      
      // 创建文件输入
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      // 双击图标上传（编辑模式）
      var tapCount = 0;
      var tapTimer = null;
      
      iconItem.addEventListener('click', function(e) {
        if (!document.querySelector('.app-shell').classList.contains('edit-mode')) {
          return;
        }
        
        tapCount++;
        clearTimeout(tapTimer);
        
        if (tapCount === 2) {
          e.stopPropagation();
          fileInput.click();
          tapCount = 0;
        } else {
          tapTimer = setTimeout(function() {
            tapCount = 0;
          }, 300);
        }
      });
      
      // 上传后裁剪
      fileInput.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
          openCropper(e.target.result, { aspectRatio: 1 }, function(croppedData) {
            if (iconImage) {
              iconImage.style.backgroundImage = 'url(' + croppedData + ')';
              iconImage.classList.add('has-image');
            }
            dbSave('icon_' + iconId, croppedData);
          });
        };
        reader.readAsDataURL(file);
        this.value = '';
      });
      
      // 加载已保存的图标
      dbGet('icon_' + iconId, function(data) {
        if (data && iconImage) {
          iconImage.style.backgroundImage = 'url(' + data + ')';
          iconImage.classList.add('has-image');
        }
      });
    });
  }

  // ============ 初始化 ============
  openDB(function() {
    setupAppIcons();
    initIconDrag();
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

  // 暴露导航方法到全局
  window.AppNav = {
    showPage: showPage,
    setActiveTab: setActiveTab
  };

})();
