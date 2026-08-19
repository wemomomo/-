
(function(){
  var pages = document.querySelectorAll('.page');
  var tabs = document.querySelectorAll('.tab-item');
  var icons = document.querySelectorAll('.app-icon');
  var pageContainer = document.querySelector('.page-container');

  // 卡片元素
  var profileCard = document.getElementById('profileCard');
  var cardBg = document.getElementById('cardBg');
  var cardUpper = document.getElementById('cardUpper');
  var avatarBtn = document.getElementById('avatarBtn');
  var avatarImg = document.getElementById('avatarImg');
  var lowerOverlay = document.getElementById('lowerOverlay');
  var infoTexts = document.querySelectorAll('.info-text[data-key]');
  var locationText = document.querySelector('.location-text');

  // 编辑面板元素
  var editPanel = document.getElementById('editPanel');
  var editPanelMask = document.getElementById('editPanelMask');
  var glassToggle = document.getElementById('glassToggle');
  var colorPicker = document.getElementById('colorPicker');
  var opacitySlider = document.getElementById('opacitySlider');
  var opacityValue = document.getElementById('opacityValue');
  var doneEditBtn = document.getElementById('doneEditBtn');

  // 文件输入
  var bgFileInput = document.createElement('input');
  bgFileInput.type = 'file';
  bgFileInput.accept = 'image/*';

  var avatarFileInput = document.createElement('input');
  avatarFileInput.type = 'file';
  avatarFileInput.accept = 'image/*';

  var longPressTimer;

  // ============ 初始化 ============
  loadState();
  setupPhotoFrames();

  // ============ 导航 ============
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      setActiveTab(this);
      showPage(this.dataset.tab);
    });
  });

  var actionMap = { plot:'plot', message:'message', explore:'explore', vault:'vault' };
  icons.forEach(function(icon){
    icon.addEventListener('click', function(){
      var action = this.dataset.action;
      if(actionMap[action]){
        tabs.forEach(function(t){ t.classList.remove('active'); });
        showPage(actionMap[action]);
      }
    });
  });

  // ============ 卡片交互（平时就能操作） ============

  // 点击上半部分或背景区域 -> 上传背景图
  cardUpper.addEventListener('click', function(){ bgFileInput.click(); });

  bgFileInput.addEventListener('change', function(){
    var file = this.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
      cardBg.style.backgroundImage = 'url(' + e.target.result + ')';
      cardBg.classList.add('has-bg');
      saveState();
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // 点击头像 -> 上传头像
  avatarBtn.addEventListener('click', function(e){
    e.stopPropagation();
    avatarFileInput.click();
  });

  avatarFileInput.addEventListener('change', function(){
    var file = this.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
      avatarImg.src = e.target.result;
      avatarBtn.classList.add('has-img');
      saveState();
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // 文字失焦时保存
  infoTexts.forEach(function(el){
    el.addEventListener('blur', saveState);
  });
  if(locationText){
    locationText.addEventListener('blur', saveState);
  }

  // ▼▼▼ 长按空白处弹出编辑面板（优化版） ▼▼▼
  var startX, startY;
  pageContainer.addEventListener('touchstart', function(e){
    // 只响应点击在 pageContainer 自身 或 page 自身（空白处）
    if(e.target === pageContainer || e.target.classList.contains('page')){
      e.preventDefault(); // 阻止系统菜单
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      longPressTimer = setTimeout(function(){
        openEditPanel();
      }, 700);
    }
  }, {passive: false});

  pageContainer.addEventListener('touchend', function(){ 
    clearTimeout(longPressTimer); 
  });
  
  pageContainer.addEventListener('touchcancel', function(){ 
    clearTimeout(longPressTimer); 
  });
  
  pageContainer.addEventListener('touchmove', function(e){ 
    // 如果手指移动超过10px，取消长按
    if(startX && startY){
      var dx = Math.abs(e.touches[0].clientX - startX);
      var dy = Math.abs(e.touches[0].clientY - startY);
      if(dx > 10 || dy > 10){
        clearTimeout(longPressTimer);
      }
    }
  });

  // 编辑面板操作
  glassToggle.addEventListener('change', applyCardStyle);
  colorPicker.addEventListener('input', applyCardStyle);
  opacitySlider.addEventListener('input', applyCardStyle);

  doneEditBtn.addEventListener('click', closeEditPanel);
  editPanelMask.addEventListener('click', closeEditPanel);

  // ============ 功能函数 ============

  function showPage(name){
    pages.forEach(function(p){ p.classList.toggle('active', p.dataset.page === name); });
  }
  function setActiveTab(tab){
    tabs.forEach(function(t){ t.classList.toggle('active', t === tab); });
  }

  function openEditPanel(){
    editPanel.classList.add('show');
    editPanelMask.classList.add('show');
  }
  function closeEditPanel(){
    editPanel.classList.remove('show');
    editPanelMask.classList.remove('show');
    saveState();
  }

  function applyCardStyle(){
    var color = colorPicker.value;
    var opacity = opacitySlider.value / 100;
    opacityValue.textContent = opacitySlider.value + '%';

    // 把hex颜色转成rgb
    var r = parseInt(color.slice(1,3), 16);
    var g = parseInt(color.slice(3,5), 16);
    var b = parseInt(color.slice(5,7), 16);

    lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

    if(glassToggle.checked){
      lowerOverlay.classList.add('glass-effect');
    } else {
      lowerOverlay.classList.remove('glass-effect');
    }
  }

  function saveState(){
    var state = {
      bgImage: cardBg.style.backgroundImage || '',
      avatar: avatarImg.src || '',
      hasAvatar: avatarBtn.classList.contains('has-img'),
      hasBg: cardBg.classList.contains('has-bg'),
      texts: {},
      style: {
        glass: glassToggle.checked,
        color: colorPicker.value,
        opacity: opacitySlider.value
      }
    };

    infoTexts.forEach(function(el){
      var key = el.dataset.key;
      if(key === 'line4'){
        // line4 本身不存文字，文字在 location-text 里
      } else {
        state.texts[key] = el.textContent.trim();
      }
    });
    state.texts['line4text'] = locationText ? locationText.textContent.trim() : '';

    try{ localStorage.setItem('mm_profile_state', JSON.stringify(state)); }catch(e){}
  }

  function loadState(){
    try{
      var saved = localStorage.getItem('mm_profile_state');
      if(!saved){
        applyCardStyle();
        return;
      }
      var state = JSON.parse(saved);

      // 恢复背景
      if(state.bgImage){
        cardBg.style.backgroundImage = state.bgImage;
      }
      if(state.hasBg) cardBg.classList.add('has-bg');

      // 恢复头像
      if(state.avatar && state.hasAvatar){
        avatarImg.src = state.avatar;
        avatarBtn.classList.add('has-img');
      }

      // 恢复文字
      if(state.texts){
        Object.keys(state.texts).forEach(function(key){
          if(key === 'line4text'){
            if(locationText) locationText.textContent = state.texts[key];
          } else {
            var el = document.querySelector('[data-key="' + key + '"]');
            if(el) el.textContent = state.texts[key];
          }
        });
      }

      // 恢复样式
      if(state.style){
        glassToggle.checked = state.style.glass;
        colorPicker.value = state.style.color;
        opacitySlider.value = state.style.opacity;
      }
      applyCardStyle();
    }catch(e){
      applyCardStyle();
    }
  }

  function setupPhotoFrames(){
    var photoFrames = document.querySelectorAll('.photo-frame');
    photoFrames.forEach(function(frame){
      var idx = frame.dataset.photo;
      var img = frame.querySelector('img');
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function(){
        var file = this.files[0];
        if(!file) return;
        var reader = new FileReader();
        reader.onload = function(e){
          img.src = e.target.result;
          frame.classList.add('has-img');
          try{ localStorage.setItem('mm_photo_' + idx, e.target.result); }catch(ex){}
        };
        reader.readAsDataURL(file);
        this.value = '';
      });
      frame.addEventListener('click', function(){ input.click(); });
      var saved = localStorage.getItem('mm_photo_' + idx);
      if(saved){
        img.src = saved;
        frame.classList.add('has-img');
      }
    });
  }

})();
