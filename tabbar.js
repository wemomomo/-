(function(){
  'use strict';

  var tabBar = document.getElementById('tabBar');
  var capsule = tabBar.querySelector('.tab-bar-capsule');
  
  // 编辑面板元素
  var tabbarEditPanel = document.getElementById('tabbarEditPanel');
  var tabbarGlassToggle = document.getElementById('tabbarGlassToggle');
  var tabbarBgColor = document.getElementById('tabbarBgColor');
  var tabbarOpacitySlider = document.getElementById('tabbarOpacitySlider');
  var tabbarOpacityValue = document.getElementById('tabbarOpacityValue');
  var tabbarBorderColor = document.getElementById('tabbarBorderColor');
  var tabbarBorderWidth = document.getElementById('tabbarBorderWidth');
  var tabbarBorderValue = document.getElementById('tabbarBorderValue');
  var tabbarDoneBtn = document.getElementById('tabbarDoneBtn');

  // ============ 等待数据库就绪 ============
  window.addEventListener('dbReady', loadTabbarState);

  // ============ 暴露打开编辑面板方法 ============
  window.openTabbarEdit = function() {
    tabbarEditPanel.classList.add('show');
    document.getElementById('editPanelMask').classList.add('show');
  };

  // ============ 编辑面板操作 ============
  tabbarGlassToggle.addEventListener('change', applyTabbarStyle);
  tabbarBgColor.addEventListener('input', applyTabbarStyle);
  tabbarOpacitySlider.addEventListener('input', applyTabbarStyle);
  tabbarBorderColor.addEventListener('input', applyTabbarStyle);
  tabbarBorderWidth.addEventListener('input', applyTabbarStyle);

  tabbarDoneBtn.addEventListener('click', function() {
    tabbarEditPanel.classList.remove('show');
    document.getElementById('editPanelMask').classList.remove('show');
    saveTabbarState();
  });

  function applyTabbarStyle() {
    var color = tabbarBgColor.value;
    var opacity = tabbarOpacitySlider.value / 100;
    var borderColor = tabbarBorderColor.value;
    var borderW = tabbarBorderWidth.value;

    tabbarOpacityValue.textContent = tabbarOpacitySlider.value + '%';
    tabbarBorderValue.textContent = borderW + 'px';

    var r = parseInt(color.slice(1,3), 16);
    var g = parseInt(color.slice(3,5), 16);
    var b = parseInt(color.slice(5,7), 16);

    capsule.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    capsule.style.borderColor = borderColor;
    capsule.style.borderWidth = borderW + 'px';
    capsule.style.borderStyle = 'solid';

    if (tabbarGlassToggle.checked) {
      capsule.style.backdropFilter = 'saturate(180%) blur(20px)';
      capsule.style.webkitBackdropFilter = 'saturate(180%) blur(20px)';
    } else {
      capsule.style.backdropFilter = 'none';
      capsule.style.webkitBackdropFilter = 'none';
    }
  }

  function saveTabbarState() {
    var state = {
      glass: tabbarGlassToggle.checked,
      bgColor: tabbarBgColor.value,
      opacity: tabbarOpacitySlider.value,
      borderColor: tabbarBorderColor.value,
      borderWidth: tabbarBorderWidth.value
    };
    AppDB.save('tabbar_state', state);
  }

  function loadTabbarState() {
    AppDB.get('tabbar_state', function(state) {
      if (!state) {
        applyTabbarStyle();
        return;
      }
      
      tabbarGlassToggle.checked = state.glass;
      tabbarBgColor.value = state.bgColor;
      tabbarOpacitySlider.value = state.opacity;
      tabbarBorderColor.value = state.borderColor;
      tabbarBorderWidth.value = state.borderWidth;
      applyTabbarStyle();
    });
  }

})();
