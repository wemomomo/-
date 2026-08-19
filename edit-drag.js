(function(){
  'use strict';

  var pageContainer = document.querySelector('.page-container');
  var editPanelMask = document.getElementById('editPanelMask');
  var editBtns = document.querySelectorAll('.edit-btn');
  var draggables = document.querySelectorAll('.draggable');
  var appShell = document.querySelector('.app-shell');

  var longPressTimer;
  var isEditMode = false;
  var startX, startY;

  // 拖拽相关变量
  var dragElement = null;
  var dragStartX, dragStartY;
  var dragOffsetX, dragOffsetY;
  var dragStartOrder = [];

  // ============ 等待数据库就绪 ============
  window.addEventListener('dbReady', loadDragPositions);

  // ============ 长按空白处进入编辑模式 ============
  pageContainer.addEventListener('touchstart', function(e) {
    if (e.target === pageContainer || e.target.classList.contains('page')) {
      e.preventDefault();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      longPressTimer = setTimeout(function() {
        enterEditMode();
      }, 700);
    }
  }, {passive: false});

  pageContainer.addEventListener('touchend', function() { clearTimeout(longPressTimer); });
  pageContainer.addEventListener('touchcancel', function() { clearTimeout(longPressTimer); });
  pageContainer.addEventListener('touchmove', function(e) {
    if (startX && startY) {
      var dx = Math.abs(e.touches[0].clientX - startX);
      var dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer);
      }
    }
  });

  // ============ 编辑模式管理 ============
  function enterEditMode() {
    if (isEditMode) return;
    isEditMode = true;
    document.body.classList.add('edit-mode');
  }

  function exitEditMode() {
    if (!isEditMode) return;
    isEditMode = false;
    document.body.classList.remove('edit-mode');
  }

  // 点击空白处退出编辑模式（非拖拽状态下）
  pageContainer.addEventListener('click', function(e) {
    if (!isEditMode) return;
    if (e.target === pageContainer || e.target.classList.contains('page')) {
      exitEditMode();
    }
  });

  // ============ 编辑按钮点击 ============
  editBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var target = this.dataset.editTarget;
      
      switch(target) {
        case 'card':
          if (window.openCardEdit) window.openCardEdit();
          break;
        case 'tabbar':
          if (window.openTabbarEdit) window.openTabbarEdit();
          break;
        case 'message':
          if (window.openMessageEdit) window.openMessageEdit();
          break;
        case 'apps':
          // 以后扩展
          break;
      }
    });
  });

  // 遮罩点击关闭面板
  editPanelMask.addEventListener('click', function() {
    document.querySelectorAll('.edit-panel.show').forEach(function(panel) {
      panel.classList.remove('show');
    });
    editPanelMask.classList.remove('show');
  });

  // ============ 拖拽功能 ============
  draggables.forEach(function(el) {
    el.addEventListener('touchstart', function(e) {
      if (!isEditMode) return;

      // 如果点的是编辑按钮或输入框，不拖拽
      var target = e.target;
      if (target.classList.contains('edit-btn') || 
          target.contentEditable === 'true' ||
          target.closest('.edit-btn')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      clearTimeout(longPressTimer);

      dragElement = el;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;

      var rect = el.getBoundingClientRect();
      dragOffsetX = dragStartX - rect.left;
      dragOffsetY = dragStartY - rect.top;

      el.classList.add('dragging');
    }, {passive: false});
  });

  document.addEventListener('touchmove', function(e) {
    if (!dragElement) return;
    e.preventDefault();

    var x = e.touches[0].clientX;
    var y = e.touches[0].clientY;
    var dx = x - dragStartX;
    var dy = y - dragStartY;

    dragElement.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }, {passive: false});

  document.addEventListener('touchend', function() {
    if (!dragElement) return;

    dragElement.classList.remove('dragging');

    // 检测拖拽后的位置，决定排序
    var page = document.querySelector('.page.active');
    var items = Array.from(page.querySelectorAll('.draggable'));
    
    // 按当前视觉位置排序
    items.sort(function(a, b) {
      var rectA = a.getBoundingClientRect();
      var rectB = b.getBoundingClientRect();
      return rectA.top - rectB.top;
    });

    // 重新排列DOM顺序
    items.forEach(function(item) {
      item.style.transform = '';
      page.appendChild(item);
    });

    // 保存顺序
    saveDragPositions();
    dragElement = null;
  });

  function saveDragPositions() {
    var page = document.querySelector('.page.active');
    var items = Array.from(page.querySelectorAll('.draggable'));
    var order = items.map(function(item) {
      return item.dataset.component;
    });
    AppDB.save('drag_order', order);
  }

  function loadDragPositions() {
    AppDB.get('drag_order', function(order) {
      if (!order || !order.length) return;
      
      var page = document.querySelector('[data-page="home"]');
      if (!page) return;

      order.forEach(function(componentName) {
        var el = page.querySelector('[data-component="' + componentName + '"]');
        if (el) {
          page.appendChild(el);
        }
      });
    });
  }

})();
