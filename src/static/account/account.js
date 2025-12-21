// Скрипт для страницы личного кабинета.
// Здесь реализованы: временное хранение данных (localStorage), создание/редактирование/удаление проектов,
// а также настройки аккаунта (смена аватарки, логина и почты).
(function(){
  // ----- Данные пользователя (временное хранение в localStorage) -----
  let user = {
    // логин и почта по умолчанию можно переопределить в localStorage
    login: localStorage.getItem('pt_login') || 'plotuser',
    email: localStorage.getItem('pt_email') || 'user@example.com',
    avatar: localStorage.getItem('pt_avatar') || null
  };

  // ----- Массив проектов (временные данные) -----
  // Формат: [{ id: 'pabc123', name: 'Название', orientation: 'horizontal' }, ...]
  let projects = JSON.parse(localStorage.getItem('pt_projects') || '[]');

  // ----- Ссылки на элементы DOM -----
  const avatarDisplay = document.getElementById('avatarDisplay'); // круг аватара в шапке
  const avatarPreview = document.getElementById('avatarPreview'); // превью в настройках
  const userEmail = document.getElementById('userEmail');
  const userLogin = document.getElementById('userLogin');

  const initialCreate = document.getElementById('initialCreate'); // центральная карточка создания (когда нет проектов)
  const projectsGrid = document.getElementById('projectsGrid'); // сетка проектов
  const projectsWrap = document.getElementById('projectsWrap');

  const projectModal = document.getElementById('projectModalOverlay'); // оверлей модалки создания/редактирования
  const projName = document.getElementById('projName');
  // ориентирование теперь задаётся кнопками в .orient-row
  const orientRow = document.getElementById('orientRow');
  
  const projCreate = document.getElementById('projCreate');
  const projCancel = document.getElementById('projCancel');

  const settingsBtn = document.getElementById('settingsBtn'); // кнопка шестерёнки
  const settingsOverlay = document.getElementById('settingsOverlay'); // оверлей настроек
  const settingsCancel = document.getElementById('settingsCancel');
  const settingsSave = document.getElementById('settingsSave');
  const avatarFile = document.getElementById('avatarFile'); // input type=file для аватара (скрытый)
  const chooseFileBtn = document.getElementById('chooseFileBtn');
  const fileNameLabel = document.getElementById('fileName');
  const setLogin = document.getElementById('setLogin');
  const setEmail = document.getElementById('setEmail');

  // editingId === null -> создание нового проекта; иначе - редактируем проект с этим id
  let editingId = null;

  // Сохраняет массив проектов в localStorage
  function saveState(){ localStorage.setItem('pt_projects', JSON.stringify(projects)); }

  // Применяет данные пользователя к DOM (шапка и превью в настройках)
  function applyUser(){
    userEmail.textContent = user.email;
    userLogin.textContent = user.login;
    if(user.avatar){
      // если загружена картинка — показываем её
      avatarDisplay.innerHTML = '<img src="'+user.avatar+'">';
      avatarPreview.innerHTML = '<img src="'+user.avatar+'">';
    } else {
      // иначе показываем первые две буквы логина
      avatarDisplay.textContent = (user.login||'PT').slice(0,2).toUpperCase();
      avatarPreview.textContent = (user.login||'PT').slice(0,2).toUpperCase();
    }
    // заполняем поля настроек текущими значениями
    setLogin.value = user.login; setEmail.value = user.email;
    if(user.avatar) avatarPreview.classList.add('has-img');
  }

  // Генератор простого id для проекта
  function uid(){return 'p'+Math.random().toString(36).slice(2,9)}

  // Отрисовка сетки проектов
  function renderProjects(){
    // Очищаем сетку
    projectsGrid.innerHTML = '';

    // Если нет проектов — показываем центрированную кнопку создания
    if(projects.length === 0){ initialCreate.style.display = 'flex'; }
    else{ initialCreate.style.display = 'none'; }

    // Если есть проекты — добавляем в сетку специальную плитку "создать" в начале
    if(projects.length > 0){
      const createTile = document.createElement('div');
      createTile.className = 'proj-tile create-center';
      createTile.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="plus">+</div></div>'+
        '<div style="margin-top:8px;text-align:center;color:var(--text)">Создать новый проект</div>';
      createTile.addEventListener('click', ()=>openCreateModal());
      projectsGrid.appendChild(createTile);
    }

    // Для каждого проекта создаём плитку: меню, область для картинки и заголовок
    projects.forEach(p=>{
      const el = document.createElement('div'); el.className='proj-tile';
      // используем div.proj-menu (не button) чтобы внутри можно было размещать кнопки меню
      el.innerHTML = '<div class="proj-menu" role="button" tabindex="0">'+
        '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>'+
        '<div class="menu-list"><button type="button" data-action="edit">Редактировать</button><button type="button" data-action="del">Удалить</button></div></div>'+
        '<div class="proj-image" aria-hidden="true"></div>'+
        '<div class="proj-title">'+(p.name||'Без названия')+'</div>';

      // Обработка выпадающего меню у плитки (три точки)
      const menuBtn = el.querySelector('.proj-menu');
      const menuList = menuBtn.querySelector('.menu-list');
      // toggle меню по клику на область с тремя точками
      menuBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); menuBtn.classList.toggle('open'); });
      // делегируем клик внутри меню на кнопки (Редактировать / Удалить)
      menuList.addEventListener('click',(ev)=>{
        const btn = ev.target.closest('[data-action]'); if(!btn) return;
        const act = btn.getAttribute('data-action');
        if(act==='del'){ deleteProject(p.id); }
        if(act==='edit'){ openEditModal(p.id); }
      });

      // Навигация в страницу проекта при клике по плитке (если клик не по меню)
      el.addEventListener('click',(ev)=>{
        if(ev.target.closest('.proj-menu')) return; // клик по меню — не навигация
        window.location.href = 'ProjectMainPage.html?projectId=' + encodeURIComponent(p.id);
      });

      projectsGrid.appendChild(el);
    });
  }

  // Открыть модалку для создания проекта
  function openCreateModal(){
    editingId = null; projName.value='';
    // при создании ставим подпись кнопки обратно в "Создать"
    if(projCreate) projCreate.textContent = 'Создать';
    // по умолчанию выбираем горизонтальную ориентацию
    if(orientRow){ orientRow.querySelectorAll('.orient-btn').forEach(b=>b.classList.remove('active')); const h = orientRow.querySelector('.orient-btn[data-orient="horizontal"]'); if(h) h.classList.add('active'); }
    projectModal.classList.add('show'); projectModal.setAttribute('aria-hidden','false');
  }
  function closeProjectModal(){ projectModal.classList.remove('show'); projectModal.setAttribute('aria-hidden','true'); }

  // Открыть модалку для редактирования существующего проекта
  function openEditModal(id){
    const p = projects.find(x=>x.id===id); if(!p) return;
    editingId = id; projName.value = p.name;
    // выставляем активную кнопку ориентации в модалке
    if(orientRow){ orientRow.querySelectorAll('.orient-btn').forEach(b=>b.classList.remove('active')); const sel = orientRow.querySelector('.orient-btn[data-orient="'+(p.orientation||'horizontal')+'"]'); if(sel) sel.classList.add('active'); }
    // меняем заголовок и текст кнопки на "Сохранить" при редактировании
    document.getElementById('projectModalTitle').textContent='Редактировать проект';
    if(projCreate) projCreate.textContent = 'Сохранить';
    projectModal.classList.add('show'); projectModal.setAttribute('aria-hidden','false');
  }

  // Удаление проекта: теперь через кастомное модальное подтверждение
  // showConfirm(message, callback) реализован ниже
  function deleteProject(id){
    const p = projects.find(x=>x.id===id);
    const name = p ? (p.name || 'Без названия') : '';
    showConfirm('Удалить проект "' + name + '"? Это действие необратимо.', ()=>{
      projects = projects.filter(p=>p.id!==id);
      saveState(); renderProjects();
    });
  }

  // Обработчик кнопки "Создать" в модалке (создать или сохранить правки)
  projCreate.addEventListener('click', ()=>{
    const name = projName.value.trim() || 'Новый проект';
    // определяем выбранную ориентацию по активной кнопке
    let orient = 'horizontal';
    if(orientRow){ const active = orientRow.querySelector('.orient-btn.active'); if(active) orient = active.dataset.orient || 'horizontal'; }
    if(editingId){ // обновляем существующий
      const p = projects.find(x=>x.id===editingId);
      if(p){ p.name = name; p.orientation = orient; }
    } else {
      const newP = {id: uid(), name, orientation: orient};
      projects.unshift(newP); // добавляем в начало списка
    }
    saveState(); renderProjects(); closeProjectModal(); document.getElementById('projectModalTitle').textContent='Создать проект';
    // после сохранения сбрасываем текст кнопки обратно для следующего создания
    if(projCreate) projCreate.textContent = 'Создать';
  });

  // Отмена в модалке
  projCancel.addEventListener('click', ()=>{ closeProjectModal(); document.getElementById('projectModalTitle').textContent='Создать проект'; if(projCreate) projCreate.textContent = 'Создать'; });

  // Клик/клавиши для центральной карточки создания
  initialCreate.addEventListener('click', ()=>openCreateModal());
  initialCreate.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' ') openCreateModal(); });

  // ----- Настройки аккаунта (шестерёнка) -----
  settingsBtn.addEventListener('click', (e)=>{ settingsOverlay.classList.add('show'); settingsOverlay.setAttribute('aria-hidden','false'); });
  settingsCancel.addEventListener('click', ()=>{ settingsOverlay.classList.remove('show'); settingsOverlay.setAttribute('aria-hidden','true'); });

  // Сохранение настроек: логин и почта (аватар уже сохраняется при выборе файла)
  settingsSave.addEventListener('click', ()=>{
    user.login = setLogin.value.trim() || user.login; user.email = setEmail.value.trim() || user.email;
    localStorage.setItem('pt_login', user.login); localStorage.setItem('pt_email', user.email);
    localStorage.setItem('pt_avatar', user.avatar || '');
    applyUser(); settingsOverlay.classList.remove('show'); settingsOverlay.setAttribute('aria-hidden','true');
  });

  // Кнопка выхода из аккаунта: очищаем локальные пользовательские данные и перезагружаем страницу
  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', ()=>{
      // Очищаем ключи, связанные с аккаунтом (не удаляем проекты автоматически, если не нужно)
      localStorage.removeItem('pt_login');
      localStorage.removeItem('pt_email');
      localStorage.removeItem('pt_avatar');
      // Перезагружаем страницу, чтобы отразить выход
      location.reload();
    });
  }

  // Кнопка "Выбрать файл" — открывает скрытый input
  if(chooseFileBtn && avatarFile){
    chooseFileBtn.addEventListener('click', ()=>avatarFile.click());
  }

  // Загрузка файла аватара и отображение превью/имени файла в настройках
  avatarFile.addEventListener('change', ()=>{
    const f = avatarFile.files && avatarFile.files[0];
    if(!f){ if(fileNameLabel) fileNameLabel.textContent = 'Файл не выбран'; return; }
    if(fileNameLabel) fileNameLabel.textContent = f.name;
    const reader = new FileReader(); reader.onload = function(){ user.avatar = reader.result; localStorage.setItem('pt_avatar', user.avatar); applyUser(); };
    reader.readAsDataURL(f);
  });

  // ----- Кастомное окно подтверждения (удаление проектов) -----
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmOk = document.getElementById('confirmOk');
  const confirmCancel = document.getElementById('confirmCancel');
  let _confirmCb = null;
  function showConfirm(msg, cb){
    if(!confirmOverlay) { if(window.confirm) { if(window.confirm(msg)) cb(); return; } }
    _confirmCb = cb;
    if(confirmMessage) confirmMessage.textContent = msg;
    confirmOverlay.classList.add('show'); confirmOverlay.setAttribute('aria-hidden','false');
  }
  function hideConfirm(){ if(!confirmOverlay) return; confirmOverlay.classList.remove('show'); confirmOverlay.setAttribute('aria-hidden','true'); _confirmCb = null; }
  if(confirmCancel) confirmCancel.addEventListener('click', ()=>{ hideConfirm(); });
  if(confirmOk) confirmOk.addEventListener('click', ()=>{ if(typeof _confirmCb==='function') _confirmCb(); hideConfirm(); });
  // Закрываем подтверждение по клику вне
  if(confirmOverlay) confirmOverlay.addEventListener('click',(e)=>{ if(e.target===confirmOverlay) hideConfirm(); });

  // Обработка клика по кнопкам ориентации в модалке
  if(orientRow){
    orientRow.addEventListener('click',(e)=>{
      const b = e.target.closest('.orient-btn'); if(!b) return;
      orientRow.querySelectorAll('.orient-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    });
  }

  // Закрываем все открытые меню плиток при клике вне
  document.addEventListener('click', ()=>{ document.querySelectorAll('.proj-menu.open').forEach(n=>n.classList.remove('open')); });

  // Инициализация: применяем данные пользователя и отрисовываем проекты
  applyUser(); renderProjects();

  // Экспортим для отладки в консоль: window._pt
  window._pt = { projects, add(project){ projects.unshift(project); saveState(); renderProjects(); } };

})();
