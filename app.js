(function(){
  'use strict';

  // ============ IndexedDB 存储模块 ============
  var DB_NAME = 'MoMoAppDB';
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
        viewMode: 1,
        responsive: true,
        background: false,
        autoCropArea: 0.9,
        movable: true,
        zoomable: true,
        scalable: false,
        rotatable: true
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
  var icons = document.querySelectorAll('.app-icon');

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

  var actionMap = { plot:'plot', message:'message', explore:'explore', vault:'vault' };
  icons.forEach(function(icon) {
    icon.addEventListener('click', function() {
      var action = this.dataset.action;
      if (actionMap[action]) {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        showPage(actionMap[action]);
      }
    });
  });

  // ============ 初始化 ============
  // 打开数据库后，触发各模块加载
  openDB(function() {
    // 派发一个自定义事件，告诉其他模块数据库准备好了
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

  // 暴露导航方法到全局
  window.AppNav = {
    showPage: showPage,
    setActiveTab: setActiveTab
  };

})();