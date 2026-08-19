(function(){
  // --- 基础元素获取 ---
  const appShell = document.querySelector('.app-shell');
  const pageContainer = document.querySelector('.page-container'); // 获取页面容器
  const pages = document.querySelectorAll('.page');
  const tabs = document.querySelectorAll('.tab-item');
  const icons = document.querySelectorAll('.app-icon');
  
  // --- 卡片相关元素 ---
  const profileCard = document.getElementById('profileCard');
  const cardHeader = document.getElementById('cardHeader');
  const cardBody = document.getElementById('cardBody');
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarImg = document.getElementById('avatarImg');
  const infoTexts = document.querySelectorAll('.info-text');

  // --- 编辑控件相关元素 ---
  const editControls = document.getElementById('editControls');
  const glassToggle = document.getElementById('glassToggle');
  const colorPicker = document.getElementById('colorPicker');
  const opacitySlider = document.getElementById('opacitySlider');
  const doneEditBtn = document.getElementById('doneEditBtn');

  // --- 文件输入（保持隐藏）---
  const avatarFileInput = createFileInput();
  const headerFileInput = createFileInput();

  let longPressTimer;
  let isEditMode = false;

  // ----------------------------------------------------
  // 主逻辑 & 事件绑定
  // ----------------------------------------------------

  loadState();

  tabs.forEach(tab => tab.addEventListener('click', function() {
    setActiveTab(this);
    showPage(this.dataset.tab);
  }));
  
  const actionMap = { plot:'plot', message:'message', explore:'explore', vault:'vault' };
  icons.forEach(icon => icon.addEventListener('click', function() {
    const action = this.dataset.action;
    if(actionMap[action]){
      tabs.forEach(t => t.classList.remove('active'));
      showPage(actionMap[action]);
    }
  }));

  // ▼▼▼ 长按逻辑修改在这里 ▼▼▼
  // 将监听器绑定到 pageContainer
  pageContainer.addEventListener('pointerdown', (e) => {
    // 获取当前活动的页面
    const activePage = pageContainer.querySelector('.page.active');
    
    // 检查点击的是否是 pageContainer 或 activePage 本身（即空白区域）
    if (e.target === pageContainer || e.target === activePage) {
      if (isEditMode) return;
      // 阻止在空白处长按时可能出现的默认行为（如文本选择）
      e.preventDefault();
      longPressTimer = setTimeout(() => {
          enterEditMode();
      }, 700); // 700毫秒触发长按
    }
  });

  pageContainer.addEventListener('pointerup', () => clearTimeout(longPressTimer));
  pageContainer.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
  // ▲▲▲ 长按逻辑修改完毕 ▲▲▲

  doneEditBtn.addEventListener('click', exitEditMode);

  // --- 编辑模式下的交互 ---
  avatarBtn.addEventListener('click', () => avatarFileInput.click());
  cardHeader.addEventListener('click', () => {
    // 允许任何时候点击更换背景
    headerFileInput.click();
  });

  avatarFileInput.addEventListener('change', handleImageUpload(avatarImg, 'avatar', (img, src) => {
      img.src = src;
      avatarBtn.classList.add('has-img');
  }));

  headerFileInput.addEventListener('change', handleImageUpload(cardHeader, 'headerBg', (el, src) => {
      el.style.backgroundImage = `url(${src})`;
      el.classList.add('has-bg');
  }));
  
  infoTexts.forEach(text => {
    text.addEventListener('blur', saveState);
  });
  
  glassToggle.addEventListener('change', updateCardBodyStyle);
  colorPicker.addEventListener('input', updateCardBodyStyle);
  opacitySlider.addEventListener('input', updateCardBodyStyle);

  setupPhotoFrames();


  // ----------------------------------------------------
  // 功能函数 (这部分函数内容和之前一样)
  // ----------------------------------------------------
  
  function showPage(name) { pages.forEach(p => p.classList.toggle('active', p.dataset.page === name)); }
  function setActiveTab(tab) { tabs.forEach(t => t.classList.toggle('active', t === tab)); }
  function createFileInput() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      return input;
  }
  
  function handleImageUpload(element, storageKey, callback) {
      return function(event) {
          const file = event.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = e => {
              const result = e.target.result;
              callback(element, result);
              saveState();
          };
          reader.readAsDataURL(file);
      };
  }
  
  function enterEditMode() {
      if (isEditMode) return;
      isEditMode = true;
      appShell.classList.add('edit-mode');
      infoTexts.forEach(el => el.contentEditable = true);
  }
  
  function exitEditMode() {
      if (!isEditMode) return;
      isEditMode = false;
      appShell.classList.remove('edit-mode');
      infoTexts.forEach(el => el.contentEditable = false);
      document.activeElement.blur();
      saveState();
  }

  function updateCardBodyStyle() {
      const color = colorPicker.value;
      const opacity = opacitySlider.value;
      const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
      
      profileCard.style.setProperty('--card-bg-color', `${color}${hexOpacity}`);
      cardBody.classList.toggle('glass-effect', glassToggle.checked);
      // 注意：这里不要再调用saveState()了，因为它会在input事件中频繁触发，影响性能
      // saveState() 会在退出编辑、失焦等关键节点调用
  }

  // 修改了saveState, 在实时调整颜色透明度时不保存，只在退出编辑或失焦时保存
  function saveState() {
      if (document.activeElement === colorPicker || document.activeElement === opacitySlider) {
          return; // 如果正在调整颜色或透明度，则不保存，避免性能问题
      }
      const state = {
          texts: {},
          avatar: avatarImg.src,
          headerBg: cardHeader.style.backgroundImage,
          cardStyle: {
              isGlass: glassToggle.checked,
              color: colorPicker.value,
              opacity: opacitySlider.value,
          }
      };
      
      infoTexts.forEach(el => {
          const key = el.dataset.key;
          if (key === 'line4') {
            state.texts[key] = el.querySelector('.location-text').textContent.trim();
          } else {
            state.texts[key] = el.textContent.trim();
          }
      });
      
      try {
          localStorage.setItem('mm_profile_state', JSON.stringify(state));
      } catch(e) { console.error("保存状态失败:", e); }
  }

  function loadState() {
      try {
          const savedState = JSON.parse(localStorage.getItem('mm_profile_state'));
          const defaults = {
              isGlass: false,
              color: '#f0f0f0',
              opacity: '0.5'
          };
          if (!savedState) { 
              glassToggle.checked = defaults.isGlass;
              colorPicker.value = defaults.color;
              opacitySlider.value = defaults.opacity;
              updateCardBodyStyle();
              return;
          }
          
          if (savedState.texts) {
            Object.keys(savedState.texts).forEach(key => {
                const el = document.querySelector(`[data-key="${key}"]`);
                if (el) {
                    if (key === 'line4') { el.querySelector('.location-text').textContent = savedState.texts[key]; } 
                    else { el.textContent = savedState.texts[key]; }
                }
            });
          }

          if (savedState.avatar) { avatarImg.src = savedState.avatar; avatarBtn.classList.add('has-img'); }
          if (savedState.headerBg) { cardHeader.style.backgroundImage = savedState.headerBg; cardHeader.classList.add('has-bg'); }
          
          const style = savedState.cardStyle || defaults;
          glassToggle.checked = style.isGlass;
          colorPicker.value = style.color;
          opacitySlider.value = style.opacity;
          updateCardBodyStyle();

      } catch(e) { console.error("加载状态失败:", e); updateCardBodyStyle(); }
  }

  function setupPhotoFrames() {
    const photoFrames = document.querySelectorAll('.photo-frame');
    photoFrames.forEach(function(frame){
      const idx = frame.dataset.photo;
      const img = frame.querySelector('img');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function(){
        const file = this.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e){
          const result = e.target.result;
          img.src = result;
          frame.classList.add('has-img');
          try{ localStorage.setItem('mm_photo_' + idx, result); }catch(ex){}
        };
        reader.readAsDataURL(file);
      });
      frame.addEventListener('click', function(){ input.click(); });
      
      const saved = localStorage.getItem('mm_photo_' + idx);
      if(saved){ img.src = saved; frame.classList.add('has-img'); }
    });
  }

})();