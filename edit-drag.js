(function(){
  'use strict';

  var pageContainer = document.querySelector('.page-container');
  var appShell = document.querySelector('.app-shell');
  var resetLayoutBtn = document.getElementById('resetLayoutBtn');

  var longPressTimer;
  var isEditMode = false;

  var dragElement = null;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragCurrentX = 0;
  var dragCurrentY = 0;

  var touchStartX = 0;
  var touchStartY = 0;

  var defaultOrder = ['card', 'message', 'icons'];

  window.addEventListener('dbReady', loadDragPositions);

  // ============ 长按空白处进入/退出编辑模式 ============
  pageContainer.addEventListener('touchstart', function(e) {
    var target = e.target;
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
  }

  // ============ 恢复初始排布 ============
  if (resetLayoutBtn) {
    resetLayoutBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      var confirmed = confirm('确定要恢复初始排布吗？');
      if (!confirmed) return;
      
      var page = document.querySelector('[data-page="home"]');
      if (!page) return;
      
      defaultOrder.forEach(function(componentName) {
        var el = page.querySelector('[data-component="' + componentName + '"]');
        if (el) {
          page.appendChild(el);
        }
      });
      
      if (window.AppDB) {
        AppDB.delete('drag_order', function() {
          AppNav.showToast('已恢复初始排布');
        });
      }
    });
  }

  // ============ 拖拽功能 ============
  var draggables = document.querySelectorAll('.draggable');
  
  draggables.forEach(function(el) {
    el.addEventListener('touchstart', function(e) {
      if (!isEditMode) return;

      var target = e.target;
      if (target.classList.contains('edit-btn') ||
          target.closest('.edit-btn') ||
          target.classList.contains('reset-layout-btn') ||
          target.closest('.reset-layout-btn') ||
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

    var dragRect = dragElement.getBoundingClientRect();
    var dragCenterY = dragRect.top + dragRect.height / 2;

    var parent = dragElement.parentElement;
    var allItems = Array.from(parent.querySelectorAll('.draggable'));
    
    var insertBefore = null;
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (item === dragElement) continue;
      
      var itemRect = item.getBoundingClientRect();
      var itemCenterY = itemRect.top + itemRect.height / 2;
      
      if (dragCenterY < itemCenterY) {
        insertBefore = item;
        break;
      }
    }

    dragElement.style.transform = '';

    if (insertBefore) {
      parent.insertBefore(dragElement, insertBefore);
    } else {
      parent.appendChild(dragElement);
    }

    saveDragPositions();
    dragElement = null;
    dragCurrentX = 0;
    dragCurrentY = 0;
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
          page.appendChild(el);
        }
      });
    });
  }

  window.EditMode = {
    enter: enterEditMode,
    exit: exitEditMode
  };

})();