
(function(){
  'use strict';

  window.addEventListener('dbReady', init);

  function init() {
    setupPhotoActionCard();
    setupCard();
    setupMessage();
  }

  // ============ 照片操作卡片（全局复用） ============
  var photoActionCard = null;
  var photoActionMask = null;
  var photoActionOnSelect = null;
  var photoActionOnDelete = null;

  function setupPhotoActionCard() {
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

  // ============ 卡片模块 ============
  function setupCard() {
    var cardBg = document.getElementById('cardBg');
    var cardUpper = document.getElementById('cardUpper');
    var avatarBtn = document.getElementById('avatarBtn');
    var avatarImg = document.getElementById('avatarImg');
    var lowerOverlay = document.getElementById('lowerOverlay');
    var infoTexts = document.querySelectorAll('.info-text[data-key]');
    var locationText = document.querySelector('.location-text');

    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file'; bgFileInput.accept = 'image/*';
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    // --- 点击背景 → 弹出卡片 ---
    cardUpper.addEventListener('click', function() {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      showPhotoAction(
        function() { bgFileInput.click(); },
        function() {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
          if (window.AppDB) AppDB.delete('card_bg');
          saveCardState();
        }
      );
    });

    // --- 点击头像 → 弹出卡片 ---
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      showPhotoAction(
        function() { avatarFileInput.click(); },
        function() {
          avatarImg.src = '';
          avatarBtn.classList.remove('has-img');
          if (window.AppDB) AppDB.delete('card_avatar');
          saveCardState();
        }
      );
    });

    // --- 背景上传+裁剪 ---
    bgFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        if (window.AppCropper) {
          AppCropper.open(e.target.result, { aspectRatio: 16/11 }, function(croppedData) {
            cardBg.style.backgroundImage = 'url(' + croppedData + ')';
            cardBg.classList.add('has-bg');
            if (window.AppDB) AppDB.save('card_bg', croppedData);
            saveCardState();
          });
        }
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // --- 头像上传+裁剪 ---
    avatarFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        if (window.AppCropper) {
          AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
            avatarImg.src = croppedData;
            avatarBtn.classList.add('has-img');
            if (window.AppDB) AppDB.save('card_avatar', croppedData);
            saveCardState();
          });
        }
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // --- 文字保存 ---
    infoTexts.forEach(function(el) { el.addEventListener('blur', saveCardState); });
    if (locationText) locationText.addEventListener('blur', saveCardState);

    // --- 编辑面板（仅毛玻璃、颜色、透明度） ---
    var cardEditBtn = document.querySelector('[data-edit-target="card"]');
    if (cardEditBtn) {
      cardEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openCardEditPanel();
      });
    }

    function openCardEditPanel() {
      var panel = document.getElementById('cardEditPanel');
      if (!panel) {
        panel = createCardEditPanel();
        document.body.appendChild(panel);
      }
      panel.classList.add('show');
      var mask = document.getElementById('cardEditMask');
      if (!mask) {
        mask = document.createElement('div');
        mask.id = 'cardEditMask';
        mask.className = 'edit-panel-mask';
        document.body.appendChild(mask);
        mask.addEventListener('click', closeCardEditPanel);
      }
      mask.classList.add('show');
    }

    function closeCardEditPanel() {
      var panel = document.getElementById('cardEditPanel');
      if (panel) panel.classList.remove('show');
      var mask = document.getElementById('cardEditMask');
      if (mask) mask.classList.remove('show');
      saveCardState();
    }

    function createCardEditPanel() {
      var panel = document.createElement('div');
      panel.id = 'cardEditPanel';
      panel.className = 'edit-panel';
      panel.innerHTML = '<div class="edit-panel-handle"></div>'
        + '<div class="edit-panel-content">'
        + '<div class="panel-title">卡片设置</div>'
        + '<div class="control-row"><span class="control-label">毛玻璃</span>'
        + '<div class="toggle-switch"><input type="checkbox" id="cardGlassToggle"><label for="cardGlassToggle"></label></div></div>'
        + '<div class="control-row"><span class="control-label">背景颜色</span>'
        + '<input type="color" id="cardColorPicker" value="#ffffff"></div>'
        + '<div class="control-row"><span class="control-label">透明度</span>'
        + '<input type="range" id="cardOpacitySlider" min="0" max="100" value="80">'
        + '<span class="opacity-value" id="cardOpacityValue">80%</span></div>'
        + '<button class="done-btn" id="cardDoneBtn">完成</button>'
        + '</div>';

      setTimeout(function() {
        document.getElementById('cardGlassToggle').addEventListener('change', applyCardOverlay);
        document.getElementById('cardColorPicker').addEventListener('input', applyCardOverlay);
        document.getElementById('cardOpacitySlider').addEventListener('input', applyCardOverlay);
        document.getElementById('cardDoneBtn').addEventListener('click', closeCardEditPanel);
      }, 0);
      return panel;
    }

    function applyCardOverlay() {
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var glassToggle = document.getElementById('cardGlassToggle');
      var opacityValue = document.getElementById('cardOpacityValue');
      if (!colorPicker || !opacitySlider || !glassToggle) return;
      var color = colorPicker.value;
      var opacity = opacitySlider.value / 100;
      opacityValue.textContent = opacitySlider.value + '%';
      var r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
      lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      if (glassToggle.checked) lowerOverlay.classList.add('glass-effect');
      else lowerOverlay.classList.remove('glass-effect');
    }

    function saveCardState() {
      var glassToggle = document.getElementById('cardGlassToggle');
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var state = {
        hasBg: cardBg.classList.contains('has-bg'),
        hasAvatar: avatarBtn.classList.contains('has-img'),
        texts: {},
        style: {
          glass: glassToggle ? glassToggle.checked : false,
          color: colorPicker ? colorPicker.value : '#ffffff',
          opacity: opacitySlider ? opacitySlider.value : 80
        }
      };
      infoTexts.forEach(function(el) {
        var key = el.dataset.key;
        if (key !== 'line4') state.texts[key] = el.textContent.trim();
      });
      state.texts['line4text'] = locationText ? locationText.textContent.trim() : '';
      if (window.AppDB) AppDB.save('card_state', state);
    }

    function loadCardState() {
      if (!window.AppDB) return;
      AppDB.get('card_bg', function(bgData) {
        if (bgData) { cardBg.style.backgroundImage = 'url(' + bgData + ')'; cardBg.classList.add('has-bg'); }
      });
      AppDB.get('card_avatar', function(avatarData) {
        if (avatarData) { avatarImg.src = avatarData; avatarBtn.classList.add('has-img'); }
      });
      AppDB.get('card_state', function(state) {
        if (!state) return;
        if (state.texts) {
          Object.keys(state.texts).forEach(function(key) {
            if (key === 'line4text') { if (locationText) locationText.textContent = state.texts[key]; }
            else { var el = document.querySelector('[data-key="' + key + '"]'); if (el) el.textContent = state.texts[key]; }
          });
        }
        if (state.style) {
          setTimeout(function() {
            var glassToggle = document.getElementById('cardGlassToggle');
            var colorPicker = document.getElementById('cardColorPicker');
            var opacitySlider = document.getElementById('cardOpacitySlider');
            if (glassToggle) glassToggle.checked = state.style.glass;
            if (colorPicker) colorPicker.value = state.style.color;
            if (opacitySlider) opacitySlider.value = state.style.opacity;
            applyCardOverlay();
          }, 100);
        }
      });
    }
    loadCardState();
  }

  // ============ 消息框模块 ============
  function setupMessage() {
    var messageAvatar = document.getElementById('messageAvatar');
    var messageAvatarImg = document.getElementById('messageAvatarImg');
    var messagePreview = document.getElementById('messagePreview');
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    if (messageAvatar) {
      messageAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        showPhotoAction(
          function() { avatarFileInput.click(); },
          function() {
            messageAvatarImg.src = '';
            messageAvatar.classList.remove('has-img');
            if (window.AppDB) AppDB.delete('message_avatar');
          }
        );
      });
    }

    avatarFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        if (window.AppCropper) {
          AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
            messageAvatarImg.src = croppedData;
            messageAvatar.classList.add('has-img');
            if (window.AppDB) AppDB.save('message_avatar', croppedData);
          });
        }
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    if (window.AppDB) {
      AppDB.get('message_avatar', function(data) {
        if (data && messageAvatarImg) { messageAvatarImg.src = data; messageAvatar.classList.add('has-img'); }
      });
      AppDB.get('message_preview', function(text) {
        if (text && messagePreview) messagePreview.textContent = text;
      });
    }

    if (messagePreview) {
      messagePreview.addEventListener('blur', function() {
        if (window.AppDB) AppDB.save('message_preview', this.textContent.trim());
      });
    }
  }

})();
