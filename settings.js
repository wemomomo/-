
(function(){
  'use strict';

  var PARAM_DEFAULTS = { temperature: 0.8, freqPenalty: 0.3, presPenalty: 0.3 };

  var apiConfigs = [];
  var activeApi = null;
  var apiParams = null; 
  var currentTab = 'config';
  var editingIdx = -1;

  // 暴力绑定：不等待任何条件，只要找到按钮立刻绑上！
  function forceBindClicks() {
    var btnApi = document.getElementById('settingApi');
    var btnData = document.getElementById('settingData');
    if (btnApi && btnData) {
      btnApi.addEventListener('click', openApiPage);
      btnData.addEventListener('click', openDataPage);
      loadApiData(); // 顺便后台加载数据
    } else {
      setTimeout(forceBindClicks, 200); // 找不到就0.2秒后重新找
    }
  }
  forceBindClicks();

  // ============ API 配置页 ============
  function openApiPage() {
    currentTab = 'config';
    editingIdx = -1;
    var page = createSubpage('API 配置');
    
    // 强制先渲染，不管数据库卡不卡
    loadApiData(function() {
      renderApiBody(page.querySelector('.settings-subpage-body'));
      void page.offsetWidth; // 触发浏览器重绘（非常重要，不加滑不出来）
      page.classList.add('show');
    });
  }

  function renderApiBody(body) {
    var tabsHtml = '<div class="api-tabs">'
      + '<div class="api-tab' + (currentTab === 'config' ? ' active' : '') + '" data-tab="config">配置</div>'
      + '<div class="api-tab' + (currentTab === 'params' ? ' active' : '') + '" data-tab="params">参数</div>'
      + '<div class="api-tab' + (currentTab === 'saved' ? ' active' : '') + '" data-tab="saved">已存</div>'
      + '</div>';

    var contentHtml = '';

    if (currentTab === 'config') {
      var cfg = editingIdx >= 0 ? apiConfigs[editingIdx] : null;
      contentHtml = '<div class="api-section">'
        + '<div class="api-section-title">接口信息</div>'
        + '<div class="api-field"><div class="api-field-label">配置名称</div><input type="text" class="api-input" id="apiName" placeholder="例如：OpenAI 中转" value="' + esc(cfg ? cfg.name : '') + '"></div>'
        + '<div class="api-field"><div class="api-field-label">API 地址</div><input type="text" class="api-input" id="apiUrl" placeholder="https://example.com/v1" value="' + esc(cfg ? cfg.url : '') + '"></div>'
        + '<div class="api-field"><div class="api-field-label">API KEY</div><div class="api-field-row"><input type="password" class="api-input" id="apiKey" placeholder="sk-..." value="' + esc(cfg ? cfg.key : '') + '"><button class="api-icon-btn" id="apiToggleKey" type="button"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>'
        + '<div class="api-field"><div class="api-field-label">模型</div><div class="api-field-row"><input type="text" class="api-input" id="apiModel" placeholder="gpt-4o" value="' + esc(cfg ? cfg.model : '') + '"><button class="api-icon-btn" id="apiFetchModels" type="button"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v6h-6"/></svg></button></div><div class="api-model-list" id="apiModelList"></div></div>'
        + '</div>'
        + '<div class="api-btn-group"><button class="api-btn api-btn-primary" id="apiSaveBtn" type="button">保存配置</button></div>';

    } else if (currentTab === 'params') {
      var params = getParams();
      contentHtml = '<div class="api-section">'
        + '<div class="api-section-title">模型参数</div>'
        + '<div class="api-param-card"><div class="api-param-title">Temperature</div><div class="api-param-desc">越低越精确贴合，越高越有创意</div><div class="api-param-row"><input type="range" id="apiTemp" min="0" max="2" step="0.05" value="' + params.temperature + '"><span class="api-param-val" id="apiTempVal">' + params.temperature + '</span></div></div>'
        + '<div class="api-param-card"><div class="api-param-title">Frequency Penalty</div><div class="api-param-desc">避免重复使用相同词汇</div><div class="api-param-row"><input type="range" id="apiFreq" min="0" max="2" step="0.1" value="' + params.freqPenalty + '"><span class="api-param-val" id="apiFreqVal">' + params.freqPenalty + '</span></div></div>'
        + '<div class="api-param-card"><div class="api-param-title">Presence Penalty</div><div class="api-param-desc">鼓励使用新的词汇和话题</div><div class="api-param-row"><input type="range" id="apiPres" min="0" max="2" step="0.1" value="' + params.presPenalty + '"><span class="api-param-val" id="apiPresVal">' + params.presPenalty + '</span></div></div>'
        + '</div>'
        + '<div class="api-btn-group"><button class="api-btn api-btn-primary" id="apiSaveParamsBtn" type="button">保存参数</button></div>';

    } else if (currentTab === 'saved') {
      if (!apiConfigs.length) {
        contentHtml = '<div class="api-empty">暂无已存配置</div>';
      } else {
        contentHtml = '<div class="api-saved-list">' + apiConfigs.map(function(cfg, i) {
          var isActive = activeApi && activeApi.name === cfg.name;
          return '<div class="api-saved-item' + (isActive ? ' active' : '') + '">'
            + '<div class="api-saved-info"><div class="api-saved-name">' + esc(cfg.name) + (isActive ? '<span class="api-saved-tag">当前</span>' : '') + '</div>'
            + '<div class="api-saved-detail">' + esc(cfg.model + ' · ' + (cfg.url || '').replace(/^https?:\/\//, '').split('/')[0]) + '</div></div>'
            + '<div class="api-saved-actions">'
            + '<button class="api-saved-act use" data-idx="' + i + '" type="button"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>'
            + '<button class="api-saved-act edit" data-idx="' + i + '" type="button"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'
            + '<button class="api-saved-act delete" data-idx="' + i + '" type="button"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>'
            + '</div></div>';
        }).join('') + '</div>';
      }
    }

    body.innerHTML = tabsHtml + contentHtml;
    bindApiEvents(body);
  }

  function bindApiEvents(body) {
    body.querySelectorAll('.api-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        currentTab = this.dataset.tab;
        editingIdx = -1;
        renderApiBody(body);
      });
    });

    if (currentTab === 'config') {
      var toggleBtn = body.querySelector('#apiToggleKey');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
          var inp = body.querySelector('#apiKey');
          inp.type = inp.type === 'password' ? 'text' : 'password';
        });
      }

      var fetchBtn = body.querySelector('#apiFetchModels');
      if (fetchBtn) {
        fetchBtn.addEventListener('click', function() { fetchModels(body); });
      }

      var saveBtn = body.querySelector('#apiSaveBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          var name = (body.querySelector('#apiName').value || '').trim();
          var url = (body.querySelector('#apiUrl').value || '').trim();
          var key = (body.querySelector('#apiKey').value || '').trim();
          var model = (body.querySelector('#apiModel').value || '').trim();

          if (!name || !url || !key || !model) { AppNav.showToast('请填写所有字段'); return; }

          var config = { name: name, url: url, key: key, model: model };
          if (editingIdx >= 0) {
            apiConfigs[editingIdx] = config;
            if (activeApi && activeApi.name === config.name) activeApi = config;
          } else {
            var existing = -1;
            for (var i = 0; i < apiConfigs.length; i++) {
              if (apiConfigs[i].name === config.name) { existing = i; break; }
            }
            if (existing >= 0) apiConfigs[existing] = config;
            else apiConfigs.push(config);
          }
          if (!activeApi) activeApi = config;
          saveApiData();
          editingIdx = -1;
          AppNav.showToast('已保存');
          currentTab = 'saved';
          renderApiBody(body);
        });
      }

    } else if (currentTab === 'params') {
      bindRange(body, 'apiTemp', 'apiTempVal');
      bindRange(body, 'apiFreq', 'apiFreqVal');
      bindRange(body, 'apiPres', 'apiPresVal');

      var saveParamsBtn = body.querySelector('#apiSaveParamsBtn');
      if (saveParamsBtn) {
        saveParamsBtn.addEventListener('click', function() {
          var params = {
            temperature: parseFloat(body.querySelector('#apiTemp').value),
            freqPenalty: parseFloat(body.querySelector('#apiFreq').value),
            presPenalty: parseFloat(body.querySelector('#apiPres').value)
          };
          apiParams = params;
          AppDB.save('api_params', params);
          AppNav.showToast('参数已保存');
        });
      }

    } else if (currentTab === 'saved') {
      body.querySelectorAll('.api-saved-act.use').forEach(function(btn) {
        btn.addEventListener('click', function() {
          activeApi = apiConfigs[parseInt(this.dataset.idx)];
          saveApiData();
          AppNav.showToast('已切换: ' + activeApi.name);
          renderApiBody(body);
        });
      });
      body.querySelectorAll('.api-saved-act.edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
          editingIdx = parseInt(this.dataset.idx);
          currentTab = 'config';
          renderApiBody(body);
        });
      });
      body.querySelectorAll('.api-saved-act.delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var removed = apiConfigs.splice(parseInt(this.dataset.idx), 1)[0];
          if (activeApi && removed && activeApi.name === removed.name) {
            activeApi = apiConfigs.length ? apiConfigs[0] : null;
          }
          saveApiData();
          AppNav.showToast('已删除');
          renderApiBody(body);
        });
      });
    }
  }

  function fetchModels(body) {
    var url = (body.querySelector('#apiUrl').value || '').trim();
    var key = (body.querySelector('#apiKey').value || '').trim();
    if (!url || !key) { AppNav.showToast('请先填写地址和Key'); return; }

    AppNav.showToast('获取模型中...');

    fetch(url.replace(/\/+$/, '') + '/models', {
      headers: { 'Authorization': 'Bearer ' + key }
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data) {
      var raw = data.data || data;
      var models = [];
      if (Array.isArray(raw)) {
        for (var i = 0; i < raw.length; i++) {
          var id = raw[i].id || raw[i].name || raw[i];
          if (id) models.push(id);
        }
      }
      if (!models.length) { AppNav.showToast('未找到模型'); return; }

      var list = body.querySelector('#apiModelList');
      if (!list) return;

      var currentModel = body.querySelector('#apiModel').value;
      list.innerHTML = '<input type="text" class="api-model-search" id="apiModelSearch" placeholder="搜索模型...">'
        + '<div id="apiModelResults">' + models.map(function(m) {
          return '<div class="api-model-item' + (m === currentModel ? ' selected' : '') + '">' + esc(m) + '</div>';
        }).join('') + '</div>';
      list.classList.add('show');

      var searchInput = list.querySelector('#apiModelSearch');
      var resultsBox = list.querySelector('#apiModelResults');

      function bindClicks() {
        resultsBox.querySelectorAll('.api-model-item').forEach(function(item) {
          item.addEventListener('click', function() {
            body.querySelector('#apiModel').value = item.textContent;
            list.classList.remove('show');
          });
        });
      }
      bindClicks();

      searchInput.addEventListener('input', function() {
        var kw = this.value.trim().toLowerCase();
        var filtered = kw ? models.filter(function(m) { return m.toLowerCase().indexOf(kw) >= 0; }) : models;
        resultsBox.innerHTML = filtered.map(function(m) {
          return '<div class="api-model-item' + (m === currentModel ? ' selected' : '') + '">' + esc(m) + '</div>';
        }).join('');
        bindClicks();
      });

      AppNav.showToast(models.length + ' 个模型');
    }).catch(function(err) {
      AppNav.showToast('获取失败: ' + err.message);
    });
  }

  // ============ 数据页 ============
  function openDataPage() {
    var page = createSubpage('数据');
    var body = page.querySelector('.settings-subpage-body');

    body.innerHTML = '<div class="data-section">'
      + '<div class="data-item" id="dataExport"><div class="data-item-icon export"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><div class="data-item-text"><div class="data-item-title">导出数据</div><div class="data-item-desc">将所有本地数据导出为JSON文件</div></div></div>'
      + '<div class="data-item" id="dataImport"><div class="data-item-icon import"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><div class="data-item-text"><div class="data-item-title">导入数据</div><div class="data-item-desc">从JSON文件恢复数据</div></div></div>'
      + '<div class="data-item" id="dataClear"><div class="data-item-icon danger"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></div><div class="data-item-text"><div class="data-item-title danger">清除所有数据</div><div class="data-item-desc">不可恢复，请谨慎操作</div></div></div>'
      + '</div>';

    void page.offsetWidth; // 触发浏览器重绘
    page.classList.add('show');

    body.querySelector('#dataExport').addEventListener('click', exportAllData);
    body.querySelector('#dataImport').addEventListener('click', function() {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          try { importAllData(JSON.parse(e.target.result)); } catch(err) { AppNav.showToast('文件格式错误'); }
        };
        reader.readAsText(file);
      });
      input.click();
    });
    body.querySelector('#dataClear').addEventListener('click', function() {
      if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return;
      clearAllData();
    });
  }

  function exportAllData() {
    var allKeys = ['card_state', 'card_bg', 'card_avatar', 'message_avatar', 'message_preview', 'tabbar_state', 'drag_order', 'api_configs', 'active_api', 'api_params'];
    var result = {};
    var done = 0;
    allKeys.forEach(function(key) {
      if(window.AppDB) {
        AppDB.get(key, function(val) {
          if (val !== null && val !== undefined) result[key] = val;
          done++;
          if (done === allKeys.length) {
            var blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url; a.download = 'app-data-' + new Date().toISOString().slice(0, 10) + '.json';
            a.click(); URL.revokeObjectURL(url);
            AppNav.showToast('导出成功');
          }
        });
      }
    });
  }

  function importAllData(data) {
    var keys = Object.keys(data);
    var done = 0;
    keys.forEach(function(key) {
      if(window.AppDB) {
        AppDB.save(key, data[key], function() {
          done++;
          if (done === keys.length) {
            AppNav.showToast('导入成功，即将刷新');
            setTimeout(function() { location.reload(); }, 1000);
          }
        });
      }
    });
  }

  function clearAllData() {
    var request = indexedDB.deleteDatabase('AppDB');
    request.onsuccess = function() {
      AppNav.showToast('已清除，即将刷新');
      setTimeout(function() { location.reload(); }, 1000);
    };
    request.onerror = function() { AppNav.showToast('清除失败'); };
  }

  // ============ 通用工具（带丝滑拖拽返回） ============
  function createSubpage(title) {
    var existing = document.querySelector('.settings-subpage');
    if (existing) existing.remove();

    var page = document.createElement('div');
    page.className = 'settings-subpage';
    page.innerHTML = '<div class="settings-subpage-header">'
      + '<button class="settings-back-btn" type="button"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg><span>返回</span></button>'
      + '<div class="settings-subpage-title">' + title + '</div>'
      + '</div>'
      + '<div class="settings-subpage-body"></div>';
    document.body.appendChild(page);

    function closePage() {
      page.style.transform = 'translateX(100%)';
      setTimeout(function() { page.remove(); }, 300);
    }

    page.querySelector('.settings-back-btn').addEventListener('click', closePage);

    // 完美手势返回
    var startX = 0, currentX = 0, isDragging = false;
    page.addEventListener('touchstart', function(e) {
      // 必须从屏幕边缘（小于40px）滑动才能触发，防误触
      if (e.touches[0].clientX > 40) return;
      isDragging = true;
      startX = e.touches[0].clientX;
      page.style.transition = 'none'; // 滑动时去掉动画
    }, { passive: true });

    page.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX > 0) page.style.transform = 'translateX(' + currentX + 'px)';
    }, { passive: true });

    page.addEventListener('touchend', function() {
      if (!isDragging) return;
      isDragging = false;
      page.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      // 滑动超过30%屏幕宽度就关掉，否则弹回去
      if (currentX > window.innerWidth * 0.3) {
        closePage();
      } else {
        page.style.transform = 'translateX(0)';
      }
    });

    return page;
  }

  function bindRange(container, inputId, valId) {
    var input = container.querySelector('#' + inputId);
    var val = container.querySelector('#' + valId);
    if (input && val) input.addEventListener('input', function() { val.textContent = this.value; });
  }

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getParams() { return apiParams || JSON.parse(JSON.stringify(PARAM_DEFAULTS)); }

  // 极速静默读取数据库，500ms超时保护防卡死
  function loadApiData(callback) {
    if (!window.AppDB) { 
      if(callback) callback(); 
      return; 
    }
    var total = 3;
    var done = 0;
    var fired = false;
    function check() {
      done++;
      if (done >= total && !fired) {
        fired = true;
        if (callback) callback();
      }
    }
    setTimeout(function() {
      if (!fired) {
        fired = true;
        if (callback) callback();
      }
    }, 500);
    
    AppDB.get('api_configs', function(val) { if(val) apiConfigs = val; check(); });
    AppDB.get('active_api', function(val) { if(val) activeApi = val; check(); });
    AppDB.get('api_params', function(val) { if(val) apiParams = val; check(); });
  }

  function saveApiData() {
    if (!window.AppDB) return;
    AppDB.save('api_configs', apiConfigs);
    if (activeApi) AppDB.save('active_api', activeApi);
    else AppDB.delete('active_api');
  }

  window.ApiConfig = { getActive: function() { return activeApi; }, getParams: getParams };

})();
