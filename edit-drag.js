
(function(){
  'use strict';

  var pageContainer = document.querySelector('.page-container');
  var editOverlay = document.getElementById('editOverlay');
  var editBtns = document.querySelectorAll('.edit-btn');
  var draggables = document.querySelectorAll('.draggable');
  var appShell = document.querySelector('.app-shell');

  var longPressTimer;
  var isEditMode = false;

  // 拖拽变量
  var dragElement = null;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragCurrentX = 0;
  var dragCurrentY = 0;

  // 长按检测变量
  var touchStartX = 0;
  var touchStartY = 0;

  // ============ 等待数据库就绪 ============
  window.addEventListener('dbReady', loadDragPositions);

  // ============ 长按空白处进入编辑模式 ============
  pageContainer.addEventListener('touchstart', function(e) {
    var target = e.target;
    // 只在空白处触发
    if (target === pageContainer || target.classList.contains('page')) {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      longPressTimer = setTimeout(function() {
        if (!isEditMode) {
          enterEditMode();
        } else {
          exitEditMode();
        }
      }, 700);
    }
  }, {passive: false});

  pageContainer.addEventListener('touchend', function() { 
    clearTimeout(longPressTimer); 
  });
  pageContainer.addEventListener('touchcancel', function() { 
    clearTimeout(longPressTimer); 
  });
  pageContainer.addEventListener('touchmove', function(e) {
    var dx = Math.abs(e.touches[0].clientX - touchStartX);
    var dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer);
    }
  });

  // ============ 编辑模式 ============
  function enterEditMode() {
    isEditMode = true;
    appShell.classList.add('edit-mode');
  }

  function exitEditMode() {
    isEditMode = false;
    appShell.classList.remove('edit-mode');
    closeAllPopups();
  }

  // ============ 编辑按钮点击 → 弹出编辑卡片 ============
  editBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();

      var target = this.dataset.editTarget;
      var popupId = null;

      switch(target) {
        case 'card':
          popupId = 'cardEditPopup';
          break;
        case 'tabbar':
          popupId = 'tabbarEditPopup';
          break;
        case 'message':
          // 以后扩展
          break;
        case 'icon':
          // 以后扩展
          break;
      }

      if (popupId) {
        showPopup(popupId, this);
      }
    });
  });

  function showPopup(popupId, triggerBtn) {
    closeAllPopups();

    var popup = document.getElementById(popupId);
    if (!popup) return;

    // 先显示弹窗（为了获取尺寸）
    popup.classList.add('show');
    editOverlay.classList.add('show');

    // 获取触发按钮位置
    var btnRect = triggerBtn.getBoundingClientRect();
    var popupRect = popup.getBoundingClientRect();
    var windowW = window.innerWidth;
    var windowH = window.innerHeight;

    // 计算弹窗位置（优先在组件下方显示）
    var left = btnRect.left + btnRect.width / 2 - popupRect.width / 2;
    var top = btnRect.bottom + 12;

    // 如果下方空间不够，则放在上方
    if (top + popupRect.height > windowH - 100) {
      top = btnRect.top - popupRect.height - 12;
      popup.classList.remove('position-bottom');
      popup.classList.add('position-top');
    } else {
      popup.classList.remove('position-top');
      popup.classList.add('position-bottom');
    }

    // 左右边界检测
    if (left < 16) left = 16;
    if (left + popupRect.width > windowW - 16) {
      left = windowW - popupRect.width - 16;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  function closeAllPopups() {
    var popups = document.querySelectorAll('.edit-popup');
    popups.forEach(function(p) {
      p.classList.remove('show');
      p.classList.remove('position-top');
      p.classList.remove('position-bottom');
    });
    editOverlay.classList.remove('show');
  }

  // 点击遮罩关闭弹窗
  editOverlay.addEventListener('click', function() {
    closeAllPopups();
  });

  // 完成按钮关闭弹窗
  var doneBtns = document.querySelectorAll('.popup-done-btn');
  doneBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeAllPopups();
    });
  });

  // ============ 拖拽功能 ============
  draggables.forEach(function(el) {
    el.addEventListener('touchstart', function(e) {
      if (!isEditMode) return;

      // 如果点的是编辑按钮或输入框，不拖拽
      var target = e.target;
      if (target.classList.contains('edit-btn') ||
          target.closest('.edit-btn') ||
          target.contentEditable === 'true' ||
          target.closest('[contenteditable="true"]')) {
        return;
      }

      e.stopPropagation();
      clearTimeout(longPressTimer);

      dragElement = el;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragCurrentX = 0;
      dragCurrentY = 0;

      el.classList.add('dragging');
    }, {passive: false});
  });

  document.addEventListener('touchmove', function(e) {
    if (!dragElement) return;
    e.preventDefault();

    var x = e.touches[0].clientX;
    var y = e.touches[0].clientY;
    dragCurrentX = x - dragStartX;
    dragCurrentY = y - dragStartY;

    dragElement.style.transform = 'translate(' + dragCurrentX + 'px, ' + dragCurrentY + 'px)';
  }, {passive: false});

  document.addEventListener('touchend', function() {
    if (!dragElement) return;

    dragElement.classList.remove('dragging');
    dragElement.style.transform = '';

    // 获取所有可拖拽元素的中心位置
    var page = document.querySelector('.page.active');
    var allDraggables = Array.from(page.querySelectorAll('.draggable'));

    // 当前拖拽元素的目标位置
    var dragRect = dragElement.getBoundingClientRect();
    var dragCenterY = dragRect.top + dragRect.height / 2;

    // 找到应该插入的位置
    var insertBefore = null;
    for (var i = 0; i < allDraggables.length; i++) {
      var item = allDraggables[i];
      if (item === dragElement) continue;
      
      var itemRect = item.getBoundingClientRect();
      var itemCenterY = itemRect.top + itemRect.height / 2;

      if (dragCenterY < itemCenterY) {
        insertBefore = item;
        break;
      }
    }

    // 移动DOM
    var parent = dragElement.parentElement;
    if (insertBefore) {
      parent.insertBefore(dragElement, insertBefore);
    } else {
      parent.appendChild(dragElement);
    }

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
    if (window.AppDB) {
      AppDB.save('drag_order', order);
    }
  }

  function loadDragPositions() {
    if (!window.AppDB) return;
    AppDB.get('drag_order', function(order) {
      if (!order || !order.length) return;
      
      var page = document.querySelector('[data-page="home"]');
      if (!page) return;

      order.forEach(function(componentName) {
        var el = page.querySelector('[data-component="' + componentName + '"]');
        if (el) {
          el.parentElement.appendChild(el);
        }
      });
    });
  }

  // 暴露方法
  window.EditMode = {
    enter: enterEditMode,
    exit: exitEditMode,
    closePopups: closeAllPopups
  };

})();
