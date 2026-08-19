(function(){
  'use strict';

  var tabBar = document.querySelector('.tab-bar');
  var tabbarPopup = null;
  var tabbarPopupMask = null;

  // 等底部栏编辑按钮出现时绑定事件
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

      document.getElementById('tabbarGlassToggle').addEventListener('change', applyTabbarStyle);
      document.getElementById('tabbarBgColor').addEventListener('input', applyTabbarStyle);
      document.getElementById('tabbarOpacitySlider').addEventListener('input', applyTabbarStyle);
      document.getElementById('tabbarBorderColor').addEventListener('input', applyTabbarStyle);
      document.getElementById('tabbarBorderWidth').addEventListener('input', applyTabbarStyle);
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

  function applyTabbarStyle() {
    var capsule = document.querySelector('.tab-bar-capsule');
    if (!capsule) return;

    var glassToggle = document.getElementById('tabbarGlassToggle');
    var bgColor = document.getElementById('tabbarBgColor');
    var opacitySlider = document.getElementById('tabbarOpacitySlider');
    var opacityValue = document.getElementById('tabbarOpacityValue');
    var borderColor = document.getElementById('tabbarBorderColor');
    var borderWidth = document.getElementById('tabbarBorderWidth');
    var borderValue = document.getElementById('tabbarBorderValue');

    if (!glassToggle || !bgColor || !opacitySlider) return;

    var color = bgColor.value;
    var opacity = opacitySlider.value / 100;
    opacityValue.textContent = opacitySlider.value + '%';
    borderValue.textContent = borderWidth.value + 'px';

    var r = parseInt(color.slice(1,3), 16);
    var g = parseInt(color.slice(3,5), 16);
    var b = parseInt(color.slice(5,7), 16);

    capsule.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    capsule.style.borderColor = borderColor.value;
    capsule.style.borderWidth = borderWidth.value + 'px';
    capsule.style.borderStyle = 'solid';

    if (glassToggle.checked) {
      capsule.style.backdropFilter = 'saturate(180%) blur(20px)';
      capsule.style.webkitBackdropFilter = 'saturate(180%) blur(20px)';
    } else {
      capsule.style.backdropFilter = 'none';
      capsule.style.webkitBackdropFilter = 'none';
    }

    saveTabbarState();
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

  function loadTabbarState() {
    if (!window.AppDB) return;
    AppDB.get('tabbar_state', function(state) {
      if (!state) return;
      setTimeout(function() {
        showTabbarPopup();
        hideTabbarPopup();
      }, 50);
    });
  }

})();