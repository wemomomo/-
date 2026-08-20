(function(){
  'use strict';

  var tabBar = document.querySelector('.tab-bar');
  var tabbarPopup = null;
  var tabbarPopupMask = null;

  window.addEventListener('dbReady', function() {
    var tabbarEditBtn = document.querySelector('[data-edit-target="tabbar"]');
    if (tabbarEditBtn) {
      tabbarEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showTabbarPopup();
      });
    }
    loadTabbarState();
  });

  function showTabbarPopup() {
    if (!tabbarPopup) {
      tabbarPopupMask = document.createElement('div');
      tabbarPopupMask.className = 'popup-mask';
      document.body.appendChild(tabbarPopupMask);
      tabbarPopupMask.addEventListener('click', hideTabbarPopup);

      tabbarPopup = document.createElement('div');
      tabbarPopup.className = 'popup-card';
      tabbarPopup.innerHTML = '<div class="popup-card-title">底部栏设置</div>'
        + '<div class="popup-card-row"><span>毛玻璃</span>'
        + '<div class="toggle-switch"><input type="checkbox" id="tabbarGlassToggle" checked><label for="tabbarGlassToggle"></label></div></div>'
        + '<div class="popup-card-row"><span>背景颜色</span>'
        + '<input type="color" id="tabbarBgColor" value="#ffffff"></div>'
        + '<div class="popup-card-row"><span>透明度</span>'
        + '<input type="range" id="tabbarOpacitySlider" min="0" max="100" value="92">'
        + '<span class="popup-card-value" id="tabbarOpacityValue">92%</span></div>'
        + '<div class="popup-card-row"><span>边框颜色</span>'
        + '<input type="color" id="tabbarBorderColor" value="#3c3c43"></div>'
        + '<div class="popup-card-row"><span>边框粗细</span>'
        + '<input type="range" id="tabbarBorderWidth" min="0" max="3" step="0.5" value="0.5">'
        + '<span class="popup-card-value" id="tabbarBorderValue">0.5px</span></div>';
      document.body.appendChild(tabbarPopup);

      document.getElementById('tabbarGlassToggle').addEventListener('change', applyFromControls);
      document.getElementById('tabbarBgColor').addEventListener('input', applyFromControls);
      document.getElementById('tabbarOpacitySlider').addEventListener('input', applyFromControls);
      document.getElementById('tabbarBorderColor').addEventListener('input', applyFromControls);
      document.getElementById('tabbarBorderWidth').addEventListener('input', applyFromControls);
    }

    loadTabbarControls();
    positionTabbarPopup();
    tabbarPopupMask.classList.add('show');
    tabbarPopup.classList.add('show');
  }

  function hideTabbarPopup() {
    if (tabbarPopup) tabbarPopup.classList.remove('show');
    if (tabbarPopupMask) tabbarPopupMask.classList.remove('show');
    saveTabbarState();
  }

  function positionTabbarPopup() {
    var barRect = tabBar.getBoundingClientRect();
    var windowW = window.innerWidth;

    tabbarPopup.style.visibility = 'hidden';
    tabbarPopup.style.display = 'block';
    var popupW = tabbarPopup.offsetWidth;
    var popupH = tabbarPopup.offsetHeight;
    tabbarPopup.style.visibility = '';
    tabbarPopup.style.display = '';

    var left = barRect.left + barRect.width / 2 - popupW / 2;
    var top = barRect.top - popupH - 10;

    if (left < 12) left = 12;
    if (left + popupW > windowW - 12) left = windowW - popupW - 12;

    tabbarPopup.style.left = left + 'px';
    tabbarPopup.style.top = top + 'px';
  }

  // 从控件读取并应用
  function applyFromControls() {
    var glassToggle = document.getElementById('tabbarGlassToggle');
    var bgColor = document.getElementById('tabbarBgColor');
    var opacitySlider = document.getElementById('tabbarOpacitySlider');
    var opacityValue = document.getElementById('tabbarOpacityValue');
    var borderColor = document.getElementById('tabbarBorderColor');
    var borderWidth = document.getElementById('tabbarBorderWidth');
    var borderValue = document.getElementById('tabbarBorderValue');

    if (!glassToggle || !bgColor || !opacitySlider) return;

    if (opacityValue) opacityValue.textContent = opacitySlider.value + '%';
    if (borderValue) borderValue.textContent = borderWidth.value + 'px';

    applyTabbarStyle(
      glassToggle.checked,
      bgColor.value,
      opacitySlider.value / 100,
      borderColor.value,
      borderWidth.value
    );
    saveTabbarState();
  }

  // 直接用数据应用样式（不依赖控件）
  function applyTabbarStyle(glass, bgColor, opacity, borderColor, borderWidth) {
    var capsule = document.querySelector('.tab-bar-capsule');
    if (!capsule) return;

    var r = parseInt(bgColor.slice(1,3), 16);
    var g = parseInt(bgColor.slice(3,5), 16);
    var b = parseInt(bgColor.slice(5,7), 16);

    capsule.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    capsule.style.borderColor = borderColor;
    capsule.style.borderWidth = borderWidth + 'px';
    capsule.style.borderStyle = 'solid';

    if (glass) {
      capsule.style.backdropFilter = 'saturate(180%) blur(20px)';
      capsule.style.webkitBackdropFilter = 'saturate(180%) blur(20px)';
    } else {
      capsule.style.backdropFilter = 'none';
      capsule.style.webkitBackdropFilter = 'none';
    }
  }

  function saveTabbarState() {
    var glassToggle = document.getElementById('tabbarGlassToggle');
    var bgColor = document.getElementById('tabbarBgColor');
    var opacitySlider = document.getElementById('tabbarOpacitySlider');
    var borderColor = document.getElementById('tabbarBorderColor');
    var borderWidth = document.getElementById('tabbarBorderWidth');

    if (!glassToggle) return;

    var state = {
      glass: glassToggle.checked,
      bgColor: bgColor.value,
      opacity: opacitySlider.value,
      borderColor: borderColor.value,
      borderWidth: borderWidth.value
    };
    if (window.AppDB) AppDB.save('tabbar_state', state);
  }

  function loadTabbarControls() {
    if (!window.AppDB) return;
    AppDB.get('tabbar_state', function(state) {
      if (!state) return;
      var glassToggle = document.getElementById('tabbarGlassToggle');
      var bgColor = document.getElementById('tabbarBgColor');
      var opacitySlider = document.getElementById('tabbarOpacitySlider');
      var opacityValue = document.getElementById('tabbarOpacityValue');
      var borderColor = document.getElementById('tabbarBorderColor');
      var borderWidth = document.getElementById('tabbarBorderWidth');
      var borderValue = document.getElementById('tabbarBorderValue');

      if (glassToggle) glassToggle.checked = state.glass;
      if (bgColor) bgColor.value = state.bgColor;
      if (opacitySlider) opacitySlider.value = state.opacity;
      if (opacityValue) opacityValue.textContent = state.opacity + '%';
      if (borderColor) borderColor.value = state.borderColor;
      if (borderWidth) borderWidth.value = state.borderWidth;
      if (borderValue) borderValue.textContent = state.borderWidth + 'px';
    });
  }

  // 页面加载时直接从数据恢复样式
  function loadTabbarState() {
    if (!window.AppDB) return;
    AppDB.get('tabbar_state', function(state) {
      if (!state) return;
      applyTabbarStyle(
        state.glass,
        state.bgColor || '#ffffff',
        (state.opacity || 92) / 100,
        state.borderColor || '#3c3c43',
        state.borderWidth || '0.5'
      );
    });
  }

// 根据是否 PWA 模式调整底部栏高度
(function() {
  var tabBar = document.querySelector('.tab-bar');
  if (!tabBar) return;
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    // PWA 模式：离底部远一点
    tabBar.style.bottom = '15px';
  } else {
    // 手机浏览器网页版：贴底
    tabBar.style.bottom = '8px';
  }
  
})();