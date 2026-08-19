
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
        viewMode: 3,
        autoCropArea: 1,
        movable: false,
        zoomable: false,
        scalable: false,
        background: false,
        guides: false,
        highlight: false
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
    photoActionCard.innerHTML = '<button id="paSelectBtn">选择照片</button>'
      + '<button id="paDeleteBtn">删除照片</button>';
    document.body.appendChild(photoActionCard);

    photoActionMask.addEventListener('click', hidePhotoAction);

    document.getElementById('paSelectBtn').addEventListener('click', function() {
      hidePhotoAction();
      if (photoActionOnSelect) photoActionOnSelect();
    });

    document.getElementById('paDeleteBtn').addEventListener('click', function() {
      hidePhotoAction();
      if (photoActionOnDelete) photoActionOnDelete();
    });
  }

  function showPhotoAction(onSelect, onDelete) {
    photoActionOnSelect = onSelect;
    photoActionOnDelete = onDelete;
    photoActionMask.classList.add('show');
    photoActionCard.classList.add('show');
  }

  function hidePhotoAction() {
    photoActionMask.classList.remove('show');
    photoActionCard.classList.remove('show');
    photoActionOnSelect = null;
    photoActionOnDelete = null;
  }

  window.PhotoAction = {
    show: showPhotoAction,
    hide: hidePhotoAction
  };

  // ============ Toast 提示 ============
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

  function showPage(name) {
    pages.forEach(function(p) { p.classList.toggle('active', p.dataset.page === name); });
  }
  function setActiveTab(tab) {
    tabs.forEach(function(t) { t.classList.toggle('active', t === tab); });
  }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      showToast('开发中');
    });
  });

  window.AppNav = {
    showPage: showPage,
    setActiveTab: setActiveTab,
    showToast: showToast
  };

  // ============ 初始化 ============
  openDB(function() {
    setupPhotoAction();
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

})();
