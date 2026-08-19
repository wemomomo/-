(function(){
  'use strict';

  // ============ 等待数据库就绪 ============
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

    // 编辑面板元素
    var cardEditPanel = document.getElementById('cardEditPanel');
    var cardGlassToggle = document.getElementById('cardGlassToggle');
    var cardColorPicker = document.getElementById('cardColorPicker');
    var cardOpacitySlider = document.getElementById('cardOpacitySlider');
    var cardOpacityValue = document.getElementById('cardOpacityValue');
    var cardDoneBtn = document.getElementById('cardDoneBtn');
    var uploadBgBtn = document.getElementById('uploadBgBtn');
    var deleteBgBtn = document.getElementById('deleteBgBtn');
    var uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    var deleteAvatarBtn = document.getElementById('deleteAvatarBtn');

    // 文件输入
    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file';
    bgFileInput.accept = 'image/*';

    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file';
    avatarFileInput.accept = 'image/*';

    // --- 平时可直接操作 ---
    cardUpper.addEventListener('click', function() {
      if (document.body.classList.contains('edit-mode')) return;
      bgFileInput.click();
    });

    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.body.classList.contains('edit-mode')) return;
      avatarFileInput.click();
    });

    // 背景图上传 + 裁剪
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

    // 头像上传 + 裁剪
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

    // 文字保存
    infoTexts.forEach(function(el) {
      el.addEventListener('blur', saveCardState);
    });
    if (locationText) {
      locationText.addEventListener('blur', saveCardState);
    }

    // --- 编辑面板里的操作 ---
    uploadBgBtn.addEventListener('click', function() { bgFileInput.click(); });
    uploadAvatarBtn.addEventListener('click', function() { avatarFileInput.click(); });

    deleteBgBtn.addEventListener('click', function() {
      cardBg.style.backgroundImage = '';
      cardBg.classList.remove('has-bg');
      AppDB.delete('card_bg');
      saveCardState();
    });

    deleteAvatarBtn.addEventListener('click', function() {
      avatarImg.src = '';
      avatarBtn.classList.remove('has-img');
      AppDB.delete('card_avatar');
      saveCardState();
    });

    cardGlassToggle.addEventListener('change', applyCardOverlay);
    cardColorPicker.addEventListener('input', applyCardOverlay);
    cardOpacitySlider.addEventListener('input', applyCardOverlay);

    cardDoneBtn.addEventListener('click', function() {
      cardEditPanel.classList.remove('show');
      document.getElementById('editPanelMask').classList.remove('show');
      saveCardState();
    });

    function applyCardOverlay() {
      var color = cardColorPicker.value;
      var opacity = cardOpacitySlider.value / 100;
      cardOpacityValue.textContent = cardOpacitySlider.value + '%';

      var r = parseInt(color.slice(1,3), 16);
      var g = parseInt(color.slice(3,5), 16);
      var b = parseInt(color.slice(5,7), 16);

      lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

      if (cardGlassToggle.checked) {
        lowerOverlay.classList.add('glass-effect');
      } else {
        lowerOverlay.classList.remove('glass-effect');
      }
    }

    function saveCardState() {
      var state = {
        hasBg: cardBg.classList.contains('has-bg'),
        hasAvatar: avatarBtn.classList.contains('has-img'),
        texts: {},
        style: {
          glass: cardGlassToggle.checked,
          color: cardColorPicker.value,
          opacity: cardOpacitySlider.value
        }
      };

      infoTexts.forEach(function(el) {
        var key = el.dataset.key;
        if (key !== 'line4') {
          state.texts[key] = el.textContent.trim();
        }
      });
      state.texts['line4text'] = locationText ? locationText.textContent.trim() : '';

      AppDB.save('card_state', state);
    }

    function loadCardState() {
      // 加载图片数据
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

      // 加载状态
      AppDB.get('card_state', function(state) {
        if (!state) {
          applyCardOverlay();
          return;
        }

        // 恢复文字
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

        // 恢复样式
        if (state.style) {
          cardGlassToggle.checked = state.style.glass;
          cardColorPicker.value = state.style.color;
          cardOpacitySlider.value = state.style.opacity;
        }
        applyCardOverlay();
      });
    }

    loadCardState();

    // 暴露打开编辑面板的方法
    window.openCardEdit = function() {
      cardEditPanel.classList.add('show');
      document.getElementById('editPanelMask').classList.add('show');
    };
  }

  // ============ 消息框模块 ============
  function setupMessage() {
    // 目前只是展示，后续绑定角色后再扩展
    var messageCard = document.getElementById('messageCard');

    // 预留：打开编辑面板的方法
    window.openMessageEdit = function() {
      // 后续扩展消息框编辑
    };
  }

})();
