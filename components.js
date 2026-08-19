
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

    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file'; bgFileInput.accept = 'image/*';
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    // --- 点击背景 ---
    cardUpper.addEventListener('click', function() {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { bgFileInput.click(); },
        function() {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
          AppDB.delete('card_bg');
          saveCardState();
        }
      );
    });

    // --- 点击头像 ---
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { avatarFileInput.click(); },
        function() {
          avatarImg.src = '';
          avatarBtn.classList.remove('has-img');
          AppDB.delete('card_avatar');
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
        AppCropper.open(e.target.result, { aspectRatio: 16/11 }, function(croppedData) {
          cardBg.style.backgroundImage = 'url(' + croppedData + ')';
          cardBg.classList.add('has-bg');
          AppDB.save('card_bg', croppedData);
          saveCardState();
        });
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
        AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
          avatarImg.src = croppedData;
          avatarBtn.classList.add('has-img');
          AppDB.save('card_avatar', croppedData);
          saveCardState();
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // --- 文字保存 ---
    infoTexts.forEach(function(el) { el.addEventListener('blur', saveCardState); });
    if (locationText) locationText.addEventListener('blur', saveCardState);

    // --- 编辑气泡卡片 ---
    var cardEditBtn = document.querySelector('[data-edit-target="card"]');
    var cardPopup = null;
    var cardPopupMask = null;

    if (cardEditBtn) {
      cardEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showCardPopup();
      });
    }

    function showCardPopup() {
      if (!cardPopup) {
        cardPopupMask = document.createElement('div');
        cardPopupMask.className = 'popup-mask';
        document.body.appendChild(cardPopupMask);
        cardPopupMask.addEventListener('click', hideCardPopup);

        cardPopup = document.createElement('div');
        cardPopup.className = 'popup-card';
        cardPopup.innerHTML = '<div class="popup-card-title">卡片设置</div>'
          + '<div class="popup-card-row"><span>毛玻璃</span>'
          + '<div class="toggle-switch"><input type="checkbox" id="cardGlassToggle"><label for="cardGlassToggle"></label></div></div>'
          + '<div class="popup-card-row"><span>背景颜色</span>'
          + '<input type="color" id="cardColorPicker" value="#ffffff"></div>'
          + '<div class="popup-card-row"><span>透明度</span>'
          + '<input type="range" id="cardOpacitySlider" min="0" max="100" value="80">'
          + '<span class="popup-card-value" id="cardOpacityValue">80%</span></div>';
        document.body.appendChild(cardPopup);

        document.getElementById('cardGlassToggle').addEventListener('change', applyFromControls);
        document.getElementById('cardColorPicker').addEventListener('input', applyFromControls);
        document.getElementById('cardOpacitySlider').addEventListener('input', applyFromControls);
      }

      // 把当前保存的数据填入控件
      loadStyleToControls();
      positionCardPopup();
      cardPopupMask.classList.add('show');
      cardPopup.classList.add('show');
    }

    function hideCardPopup() {
      if (cardPopup) cardPopup.classList.remove('show');
      if (cardPopupMask) cardPopupMask.classList.remove('show');
      saveCardState();
    }

    function positionCardPopup() {
      var cardRect = document.getElementById('profileCard').getBoundingClientRect();
      var windowW = window.innerWidth;

      cardPopup.style.visibility = 'hidden';
      cardPopup.style.display = 'block';
      var popupW = cardPopup.offsetWidth;
      cardPopup.style.visibility = '';
      cardPopup.style.display = '';

      var left = cardRect.left + cardRect.width / 2 - popupW / 2;
      var top = cardRect.bottom + 10;

      if (left < 12) left = 12;
      if (left + popupW > windowW - 12) left = windowW - popupW - 12;

      cardPopup.style.left = left + 'px';
      cardPopup.style.top = top + 'px';
    }

    function loadStyleToControls() {
      AppDB.get('card_state', function(state) {
        if (!state || !state.style) return;
        var glassToggle = document.getElementById('cardGlassToggle');
        var colorPicker = document.getElementById('cardColorPicker');
        var opacitySlider = document.getElementById('cardOpacitySlider');
        var opacityValue = document.getElementById('cardOpacityValue');
        if (glassToggle) glassToggle.checked = state.style.glass;
        if (colorPicker) colorPicker.value = state.style.color;
        if (opacitySlider) opacitySlider.value = state.style.opacity;
        if (opacityValue) opacityValue.textContent = state.style.opacity + '%';
      });
    }

    // 从控件读取值并应用到界面
    function applyFromControls() {
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var glassToggle = document.getElementById('cardGlassToggle');
      var opacityValue = document.getElementById('cardOpacityValue');
      if (!colorPicker || !opacitySlider || !glassToggle) return;

      var color = colorPicker.value;
      var opacity = opacitySlider.value / 100;
      if (opacityValue) opacityValue.textContent = opacitySlider.value + '%';

      applyOverlayStyle(glassToggle.checked, color, opacity);
      saveCardState();
    }

    // 直接用数据应用样式（不依赖控件）
    function applyOverlayStyle(glass, color, opacity) {
      var r = parseInt(color.slice(1,3), 16);
      var g = parseInt(color.slice(3,5), 16);
      var b = parseInt(color.slice(5,7), 16);
      lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      if (glass) lowerOverlay.classList.add('glass-effect');
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
      AppDB.save('card_state', state);
    }

    function loadCardState() {
      AppDB.get('card_bg', function(bgData) {
        if (bgData) {
          cardBg.style.backgroundImage = 'url(' + bgData + ')';
          cardBg.classList.add('has-bg');
        }
      });
      AppDB.get('card_avatar', function(avatarData) {
        if (avatarData) {
          avatarImg.src = avatarData;
          avatarBtn.classList.add('has-img');
        }
      });
      AppDB.get('card_state', function(state) {
        if (!state) return;
        if (state.texts) {
          Object.keys(state.texts).forEach(function(key) {
            if (key === 'line4text') {
              if (locationText) locationText.textContent = state.texts[key];
            } else {
              var el = document.querySelector('[data-key="' + key + '"]');
              if (el) el.textContent = state.texts[key];
            }
          });
        }
        // 直接用保存的数据恢复样式，不依赖弹出框控件
        if (state.style) {
          var color = state.style.color || '#ffffff';
          var opacity = (state.style.opacity || 80) / 100;
          var glass = state.style.glass || false;
          applyOverlayStyle(glass, color, opacity);
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
        PhotoAction.show(
          function() { avatarFileInput.click(); },
          function() {
            messageAvatarImg.src = '';
            messageAvatar.classList.remove('has-img');
            AppDB.delete('message_avatar');
          }
        );
      });
    }

    avatarFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
          messageAvatarImg.src = croppedData;
          messageAvatar.classList.add('has-img');
          AppDB.save('message_avatar', croppedData);
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    AppDB.get('message_avatar', function(data) {
      if (data && messageAvatarImg) {
        messageAvatarImg.src = data;
        messageAvatar.classList.add('has-img');
      }
    });
    AppDB.get('message_preview', function(text) {
      if (text && messagePreview) messagePreview.textContent = text;
    });

    if (messagePreview) {
      messagePreview.addEventListener('blur', function() {
        AppDB.save('message_preview', this.textContent.trim());
      });
    }
  }

})();
