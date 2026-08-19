
(function(){
  'use strict';

  window.addEventListener('dbReady', init);

  function init() {
    setupCard();
    setupMessage();
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

    // --- 文件输入 ---
    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file'; bgFileInput.accept = 'image/*';
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    // --- 创建图片操作的专属气泡弹窗 ---
    var photoPopup = document.createElement('div');
    photoPopup.className = 'edit-popup';
    photoPopup.id = 'photoEditPopup';
    photoPopup.innerHTML = `
      <div class="control-group" style="margin-bottom:0;">
        <button class="action-btn" id="photoChangeBtn" style="border-color:#1c1c1e; color:#1c1c1e;">更换</button>
        <button class="action-btn danger" id="photoDeleteBtn" style="border-color:#1c1c1e; color:#1c1c1e; background:#f5f5f5;">删除</button>
      </div>
    `;
    document.body.appendChild(photoPopup);

    var currentActionType = ''; // 记录当前操作的是 bg 还是 avatar

    function showPhotoPopup(type, triggerElement) {
      currentActionType = type;
      var popup = document.getElementById('photoEditPopup');
      var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
      
      if (overlay) overlay.classList.add('show');
      popup.classList.add('show');

      // 定位逻辑 (计算元素位置)
      var rect = triggerElement.getBoundingClientRect();
      var windowW = window.innerWidth;
      var popupRect = popup.getBoundingClientRect();

      var left = rect.left + rect.width / 2 - popupRect.width / 2;
      var top = rect.bottom + 12;

      popup.classList.remove('position-top', 'position-bottom');
      if (top + popupRect.height > window.innerHeight - 50) {
        top = rect.top - popupRect.height - 12;
        popup.classList.add('position-top'); // 向上弹
      } else {
        popup.classList.add('position-bottom'); // 向下弹
      }

      if (left < 16) left = 16;
      if (left + popupRect.width > windowW - 16) left = windowW - popupRect.width - 16;

      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    }

    function hidePopups() {
      document.querySelectorAll('.edit-popup').forEach(function(p) { p.classList.remove('show'); });
      var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
      if (overlay) overlay.classList.remove('show');
    }

    // 绑定隐藏事件
    var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
    if (overlay) overlay.addEventListener('click', hidePopups);

    // --- 单击触发菜单 ---
    cardUpper.addEventListener('click', function(e) {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      e.stopPropagation();
      showPhotoPopup('bg', cardUpper);
    });

    avatarBtn.addEventListener('click', function(e) {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      e.stopPropagation();
      showPhotoPopup('avatar', avatarBtn);
    });

    // 点击更换照片
    document.getElementById('photoChangeBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      hidePopups();
      if (currentActionType === 'bg') bgFileInput.click();
      else if (currentActionType === 'avatar') avatarFileInput.click();
    });

    // 点击删除照片（彻底清理缓存数据）
    document.getElementById('photoDeleteBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      hidePopups();
      if (currentActionType === 'bg') {
        cardBg.style.backgroundImage = '';
        cardBg.classList.remove('has-bg');
        if (window.AppDB) AppDB.delete('card_bg'); // 从数据库抹除
      } else if (currentActionType === 'avatar') {
        avatarImg.src = '';
        avatarBtn.classList.remove('has-img');
        if (window.AppDB) AppDB.delete('card_avatar'); // 从数据库抹除
      }
      saveCardState();
    });

    // --- 裁剪和保存逻辑 (新照片会覆盖抹除旧照片缓存) ---
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

    infoTexts.forEach(function(el) { el.addEventListener('blur', saveCardState); });
    if (locationText) locationText.addEventListener('blur', saveCardState);

    // --- 纯粹的样式编辑面板 ---
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
      panel.innerHTML = `
        <div class="edit-panel-handle"></div>
        <div class="edit-panel-content">
          <div class="panel-title">卡片设置</div>
          <div class="control-row">
            <span class="control-label">毛玻璃</span>
            <div class="toggle-switch">
              <input type="checkbox" id="cardGlassToggle">
              <label for="cardGlassToggle"></label>
            </div>
          </div>
          <div class="control-row">
            <span class="control-label">背景颜色</span>
            <input type="color" id="cardColorPicker" value="#ffffff">
          </div>
          <div class="control-row">
            <span class="control-label">透明度</span>
            <input type="range" id="cardOpacitySlider" min="0" max="100" value="80">
            <span class="opacity-value" id="cardOpacityValue">80%</span>
          </div>
          <button class="done-btn" id="cardDoneBtn" style="background:#1c1c1e; color:white;">完成</button>
        </div>
      `;
      
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
      if (window.AppDB) {
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
          var panel = document.getElementById('cardEditPanel');
          if (panel && state.style) {
            var glassToggle = document.getElementById('cardGlassToggle');
            var colorPicker = document.getElementById('cardColorPicker');
            var opacitySlider = document.getElementById('cardOpacitySlider');
            if (glassToggle) glassToggle.checked = state.style.glass;
            if (colorPicker) colorPicker.value = state.style.color;
            if (opacitySlider) opacitySlider.value = state.style.opacity;
            applyCardOverlay();
          }
        });
      }
    }
    loadCardState();
  }

  // ============ 消息框模块 ============
  function setupMessage() {
    var messageCard = document.getElementById('messageCard');
    var messageAvatar = document.getElementById('messageAvatar');
    var messageAvatarImg = document.getElementById('messageAvatarImg');
    var messagePreview = document.getElementById('messagePreview');
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';
    
    // 给消息头像也加上气泡弹窗逻辑
    var msgPhotoPopup = document.createElement('div');
    msgPhotoPopup.className = 'edit-popup';
    msgPhotoPopup.id = 'msgPhotoEditPopup';
    msgPhotoPopup.innerHTML = `
      <div class="control-group" style="margin-bottom:0;">
        <button class="action-btn" id="msgPhotoChangeBtn" style="border-color:#1c1c1e; color:#1c1c1e;">更换</button>
        <button class="action-btn danger" id="msgPhotoDeleteBtn" style="border-color:#1c1c1e; color:#1c1c1e; background:#f5f5f5;">删除</button>
      </div>
    `;
    document.body.appendChild(msgPhotoPopup);

    function showMsgPopup() {
      var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
      if (overlay) overlay.classList.add('show');
      msgPhotoPopup.classList.add('show');
      var rect = messageAvatar.getBoundingClientRect();
      var popupRect = msgPhotoPopup.getBoundingClientRect();
      var top = rect.bottom + 12;
      var left = rect.left + rect.width / 2 - popupRect.width / 2;
      
      msgPhotoPopup.classList.remove('position-top', 'position-bottom');
      if (top + popupRect.height > window.innerHeight - 50) {
        top = rect.top - popupRect.height - 12;
        msgPhotoPopup.classList.add('position-top');
      } else {
        msgPhotoPopup.classList.add('position-bottom');
      }
      msgPhotoPopup.style.left = left + 'px';
      msgPhotoPopup.style.top = top + 'px';
    }

    if (messageAvatar) {
      messageAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
        showMsgPopup();
      });
    }

    document.getElementById('msgPhotoChangeBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      msgPhotoPopup.classList.remove('show');
      var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
      if (overlay) overlay.classList.remove('show');
      avatarFileInput.click();
    });

    document.getElementById('msgPhotoDeleteBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      msgPhotoPopup.classList.remove('show');
      var overlay = document.getElementById('editOverlay') || document.querySelector('.edit-overlay');
      if (overlay) overlay.classList.remove('show');
      
      messageAvatarImg.src = '';
      messageAvatar.classList.remove('has-img');
      if (window.AppDB) AppDB.delete('message_avatar'); // 从数据库彻底抹除
    });
    
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
        if (text && messagePreview) { messagePreview.textContent = text; }
      });
    }
    
    if (messagePreview) {
      messagePreview.addEventListener('blur', function() {
        if (window.AppDB) AppDB.save('message_preview', this.textContent.trim());
      });
    }
  }

})();
