// Скрипт для страницы личного кабинета.
// Здесь реализованы: временное хранение данных (localStorage), создание/редактирование/удаление проектов,
// а также настройки аккаунта (смена аватарки, логина и почты).
(function(){
  // ----- Проверка авторизации (сессионный токен) -----
  const accessToken = sessionStorage.getItem('pt_access_token');
  const sessionLogin = sessionStorage.getItem('pt_login');
  
  // Если нет токена — перенаправляем на страницу входа
  if (!accessToken || !sessionLogin) {
    window.location.href = 'http://127.0.0.1:8000/auth/login.html';
    return;
  }

  // ----- Данные пользователя (временное хранение в localStorage) -----
  let user = {
    // логин и почта по умолчанию можно переопределить в localStorage
    login: sessionLogin || localStorage.getItem('pt_login') || 'plotuser',
    email: localStorage.getItem('pt_email') || 'user@example.com',
    avatar: localStorage.getItem('pt_avatar') || null
  };

  // ----- Массив проектов (временные данные) -----
  // Формат: [{ id: 'pabc123', name: 'Название', orientation: 'horizontal' }, ...]
  let projects = JSON.parse(localStorage.getItem('pt_projects') || '[]');

  // ----- Ссылки на элементы DOM -----
  const avatarPreview = document.getElementById('avatarPreview'); // превью в настройках
  const userLogin = document.getElementById('userLogin');

  const initialCreate = document.getElementById('initialCreate'); // центральная карточка создания (когда нет проектов)
  const projectsGrid = document.getElementById('projectsGrid'); // сетка проектов
  const projectsWrap = document.getElementById('projectsWrap');

  const projectModal = document.getElementById('projectModalOverlay'); // оверлей модалки создания/редактирования
  const projName = document.getElementById('projName');
  // ориентирование теперь задаётся кнопками в .orient-row
  
  const projCreate = document.getElementById('projCreate');
  const projCancel = document.getElementById('projCancel');

  // editingId === null -> создание нового проекта; иначе - редактируем проект с этим id
  let editingId = null;

  // Сохраняет массив проектов в localStorage
  function saveState(){ localStorage.setItem('pt_projects', JSON.stringify(projects)); }

  // Применяет данные пользователя к DOM (шапка и превью в настройках)
  function applyUser(){
    userLogin.textContent = user.login;
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
        // Переходим на страницу проекта (используем статическую страницу в /project)
        window.location.href = '/project/ProjectMainPage.html?projectId=' + encodeURIComponent(p.id);
      });

      projectsGrid.appendChild(el);
    });

  }

  // Загружает проекты пользователя с сервера
  function fetchUserProjects(){
    if(!user || !user.login) { projects = []; renderProjects(); return; }
    fetch('/api/users/' + encodeURIComponent(user.login) + '/loadInfo')
      .then(resp => {
        if(resp.status === 204){ projects = []; renderProjects(); return null; }
        if(!resp.ok) throw new Error('Не удалось загрузить проекты');
        return resp.json();
      })
      .then(data => {
        if(!data) return;
        projects = data.projects.map(p => ({ id: p.project_id, name: p.project_name, orientation: 'horizontal' }));
        saveState(); renderProjects();
      })
      .catch(err => {
        console.error('Failed to load projects', err);
        projects = []; renderProjects();
      });
  }

  // Открыть модалку для создания проекта
  function openCreateModal(){
    editingId = null; projName.value='';
    // при создании ставим подпись кнопки обратно в "Создать"
    if(projCreate) projCreate.textContent = 'Создать';
    projectModal.classList.add('show'); projectModal.setAttribute('aria-hidden','false');
  }
  function closeProjectModal(){ projectModal.classList.remove('show'); projectModal.setAttribute('aria-hidden','true'); }

  // Открыть модалку для редактирования существующего проекта
  function openEditModal(id){
    const p = projects.find(x=>x.id===id); if(!p) return;
    editingId = id; projName.value = p.name;
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
      // Отправляем запрос на удаление на сервер
      fetch('/api/user/deleteProject', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id })
      })
      .then(resp => {
        if(!resp.ok){ return resp.json().then(j=>{ throw new Error(j.detail || 'Ошибка при удалении проекта'); }); }
        return resp.json().catch(()=>({ success: true }));
      })
      .then(data => {
        // Удаляем локально и перерисовываем
        projects = projects.filter(p=>p.id!==id);
        saveState(); renderProjects();
      })
      .catch(err => {
        console.error('Delete project failed', err);
        alert('Не удалось удалить проект: ' + (err.message || 'ошибка'));
      });
    });
  }

  // Обработчик кнопки "Создать" в модалке (создать или сохранить правки)
  projCreate.addEventListener('click', ()=>{
    const name = projName.value.trim() || 'Новый проект';
    // определяем выбранную ориентацию по активной кнопке

    if(editingId){ // обновляем существующий на сервере
      projCreate.disabled = true; // блокируем кнопку на время запроса
      fetch('/api/user/updateProjectInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: editingId, name: name })
      })
      .then(resp => {
        projCreate.disabled = false;
        if(!resp.ok){ return resp.json().then(j=>{ throw new Error(j.detail || 'Ошибка обновления проекта'); }); }
        // Обновляем локально
        const p = projects.find(x=>x.id===editingId);
        if(p){ p.name = name; saveState(); renderProjects(); }
        closeProjectModal(); document.getElementById('projectModalTitle').textContent='Создать проект';
        if(projCreate) projCreate.textContent = 'Создать';
      })
      .catch(err => {
        projCreate.disabled = false;
        console.error('Update project failed', err);
        alert('Не удалось обновить проект: ' + (err.message || 'ошибка'));
      });
      return;
    }

    // Создаём проект на сервере
    if(!user || !user.login){ alert('Не удалось определить пользователя. Перезайдите.'); return; }
    projCreate.disabled = true; // блокируем кнопку на время запроса
    fetch('/api/user/createProject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, login: user.login })
    })
    .then(resp => {
      projCreate.disabled = false;
      if(!resp.ok){ return resp.json().then(j=>{ throw new Error(j.detail || 'Ошибка создания проекта'); }); }
      return resp.json();
    })
    .then(data => {
      // Ожидается { project_id }
      const newP = { id: data.project_id, name: name };
      projects.unshift(newP);
      saveState(); renderProjects(); closeProjectModal(); document.getElementById('projectModalTitle').textContent='Создать проект';
      if(projCreate) projCreate.textContent = 'Создать';
    })
    .catch(err => {
      projCreate.disabled = false;
      console.error('Create project failed', err);
      alert('Не удалось создать проект: ' + (err.message || 'ошибка'));
    });
  });

  // Отмена в модалке
  projCancel.addEventListener('click', ()=>{ closeProjectModal(); document.getElementById('projectModalTitle').textContent='Создать проект'; if(projCreate) projCreate.textContent = 'Создать'; });

  // Клик/клавиши для центральной карточки создания
  initialCreate.addEventListener('click', ()=>openCreateModal());
  initialCreate.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' ') openCreateModal(); });

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

  // Закрываем все открытые меню плиток при клике вне
  document.addEventListener('click', ()=>{ document.querySelectorAll('.proj-menu.open').forEach(n=>n.classList.remove('open')); });
  document.addEventListener('click', ()=>{ document.querySelectorAll('.proj-menu.open').forEach(n=>n.classList.remove('open')); });

  // Инициализация: применяем данные пользователя и загружаем проекты с сервера
  applyUser(); fetchUserProjects();

  // Экспортим для отладки в консоль: window._pt
  window._pt = { projects, add(project){ projects.unshift(project); saveState(); renderProjects(); } };

})();
