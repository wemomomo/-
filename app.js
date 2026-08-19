
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
        viewMode: 1,
        autoCropArea: 1,
        movable: false,
        zoomable: false,
        scalable: false,
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

  // 暴露到全局
  window.PhotoAction = {
    show: showPhotoAction,
    hide: hidePhotoAction
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

  // Toast 提示
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
```

---

### 第三步：`components.js` 里把之前的 `setupPhotoActionCard` 相关代码**全部删掉**，直接调用 `window.PhotoAction.show()`

把 `components.js` 里所有调用 `showPhotoAction(...)` 的地方改成 `PhotoAction.show(...)`：

```javascript
    // 点击背景
    cardUpper.addEventListener('click', function() {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { bgFileInput.click(); },
        function() {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
          if (window.AppDB) AppDB.delete('card_bg');
          saveCardState();
        }
      );
    });

    // 点击头像
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { avatarFileInput.click(); },
        function() {
          avatarImg.src = '';
          avatarBtn.classList.remove('has-img');
          if (window.AppDB) AppDB.delete('card_avatar');
          saveCardState();
        }
      );
    });

    // 消息头像
    messageAvatar.addEventListener('click', function(e) {
      e.stopPropagation();
      PhotoAction.show(
        function() { avatarFileInput.click(); },
        function() {
          messageAvatarImg.src = '';
          messageAvatar.classList.remove('has-img');
          if (window.AppDB) AppDB.delete('message_avatar');
        }
      );
    });
