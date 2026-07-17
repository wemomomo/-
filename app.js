(function(){
  var pages = document.querySelectorAll('.page');
  var tabs = document.querySelectorAll('.tab-item');
  var icons = document.querySelectorAll('.app-icon');
  var avatar = document.getElementById('avatarBtn');
  var avatarImg = document.getElementById('avatarImg');
  var capsules = document.querySelectorAll('.capsule[data-key]');
  var photoFrames = document.querySelectorAll('.photo-frame');

  function showPage(name){
    pages.forEach(function(p){ p.classList.toggle('active', p.dataset.page === name); });
  }
  function setActiveTab(tab){
    tabs.forEach(function(t){ t.classList.toggle('active', t === tab); });
  }

  // 底部tab切换
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      setActiveTab(this);
      showPage(this.dataset.tab);
    });
  });

  // 首页图标点击
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

  // 头像上传
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.addEventListener('change', function(){
    var file = this.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
      avatarImg.src = e.target.result;
      avatar.classList.add('has-img');
      try{ localStorage.setItem('mm_avatar', e.target.result); }catch(ex){}
    };
    reader.readAsDataURL(file);
  });
  avatar.addEventListener('click', function(){ fileInput.click(); });

  // 照片框上传
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
        img.style.display = 'block';
        frame.classList.add('has-img');
        try{ localStorage.setItem('mm_photo_' + idx, e.target.result); }catch(ex){}
      };
      reader.readAsDataURL(file);
    });
    frame.addEventListener('click', function(){ input.click(); });
    var saved = localStorage.getItem('mm_photo_' + idx);
    if(saved){
      img.src = saved;
      img.style.display = 'block';
      frame.classList.add('has-img');
    }
  });

  // 胶囊内容保存
  capsules.forEach(function(cap){
    var saved = localStorage.getItem('mm_' + cap.dataset.key);
    if(saved) cap.textContent = saved;
    cap.addEventListener('blur', function(){
      localStorage.setItem('mm_' + this.dataset.key, this.textContent.trim());
    });
  });

  // 恢复头像
  var savedAvatar = localStorage.getItem('mm_avatar');
  if(savedAvatar){
    avatarImg.src = savedAvatar;
    avatar.classList.add('has-img');
  }
})();
