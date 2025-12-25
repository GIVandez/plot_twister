// Simple behavior for ProjectMainPage: toggle plus -> icon and delete
(function(){
  const center = document.getElementById('centerRow');
  const backBtn = document.getElementById('backBtn');
  const titleInput = document.getElementById('projTitle');

  // projectId из querystring и загрузка состояния проекта
  let PROJECT_ID = null;
  (function loadProjectFromQuery(){
    try{
      const qs = new URLSearchParams(window.location.search);
      const pid = qs.get('projectId');
      if(!pid) return;
      PROJECT_ID = pid;

      // Verify ownership: ensure current user owns this project
      (async function verifyOwnership(){
        try{
          const login = sessionStorage.getItem('pt_login') || localStorage.getItem('pt_login');
          if(!login){
            // If no login found, redirect to auth
            window.location.href = 'http://127.0.0.1:8000/auth/login.html';
            return;
          }
          const resp = await fetch(`/api/users/${encodeURIComponent(login)}/loadInfo`);
          if(!resp.ok){
            // If request failed or returns 204 (no projects) deny access
            alert('У вас нет доступа к этому проекту.');
            window.location.href = 'http://127.0.0.1:8000/user';
            return;
          }
          const data = await resp.json();
          const exists = Array.isArray(data.projects) && data.projects.some(p => Number(p.project_id) === Number(pid));
          // Если проект найден в списке пользователя — подставим его название
          if (Array.isArray(data.projects)){
            const found = data.projects.find(p => Number(p.project_id) === Number(pid));
            if(found && titleInput){ titleInput.value = found.project_name || titleInput.value; document.title = (found.project_name||'Проект') + ' — PlotTwister'; }
          }
          if(!exists){
            alert('У вас нет доступа к этому проекту.');
            window.location.href = 'http://127.0.0.1:8000/user';
            return;
          }
        }catch(e){
          console.warn('verifyOwnership failed', e);
          alert('Не удалось проверить доступ к проекту.');
          window.location.href = 'http://127.0.0.1:8000/user';
        }
      })();

      const projs = JSON.parse(localStorage.getItem('pt_projects')||'[]');
      const p = projs.find(x=>x.id===pid);
      if(p && titleInput) { titleInput.value = p.name || titleInput.value; document.title = (p.name||'Проект') + ' — PlotTwister'; }
      // если есть сохранённый state — отрисуем иконки
      const storyTile = document.querySelector('.plus-tile[data-type="story"]');
      const scriptTile = document.querySelector('.plus-tile[data-type="script"]');
      if(p){
        if(p.hasStoryboard && storyTile) createStory(storyTile, /*persist*/ false);
        if(p.hasScript && scriptTile) createScript(scriptTile, /*persist*/ false);
      }

      // Проверяем наличие кадров и страниц на сервере и обновляем плитки
      (async function checkRemoteData(){
        try{
          // Проверка наличия кадров: считаем, что статус 204 = нет кадров
          const framesResp = await fetch(`/api/frame/${encodeURIComponent(PROJECT_ID)}/loadFrames`);
          if(framesResp.ok && framesResp.status !== 204){
            if(storyTile) createStory(storyTile, /*persist*/ false);
          }
        }catch(e){ /* ignore - 204 or error means no frames */ }

        try{
          // Проверка наличия страниц: статус 204 = нет страниц
          const pagesResp = await fetch(`/api/page/${encodeURIComponent(PROJECT_ID)}/loadPages`);
          if(pagesResp.ok && pagesResp.status !== 204){
            if(scriptTile) createScript(scriptTile, /*persist*/ false);
          }
        }catch(e){ /* ignore */ }
      })();

    }catch(e){ /* ignore malformed localStorage */ }
  })();

  // go back to account (redirect to user account or login)
  if(backBtn){
    backBtn.addEventListener('click', ()=>{
      try {
        const login = sessionStorage.getItem('pt_login') || localStorage.getItem('pt_login');
        if (login) {
          // Navigate to the account page for the current user (server will read session/token)
          window.location.href = 'http://127.0.0.1:8000/user';
        } else {
          // If no login found in storage, go to login page
          window.location.href = 'http://127.0.0.1:8000/auth/login.html';
        }
      } catch(e) {
        window.location.href = 'http://127.0.0.1:8000/user';
      }
    });
  }

  // Single click handler: create icon on plus click, or delete on trash click
  center.addEventListener('click', (e) => {
    // delete first (if clicked on delete button)
    const del = e.target.closest('.icon-delete');
    if (del) {
      const tile = del.closest('.plus-tile'); if (tile){
        // show confirmation before deleting
        showConfirm('Удалить элемент? Это действие необратимо.', async ()=> {
          const type = tile.dataset.type;
          if (type === 'story') {
            // change visual to plus immediately
            tile.dataset.state = '';
            tile.innerHTML = '<button class="big-plus" aria-label="Добавить">+</button><div class="caption">Добавить раскадровку</div>';
            try {
              const resp = await fetch('/api/user/deleteFrames', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: Number(PROJECT_ID) })
              });
              if (!resp.ok) {
                const ct = resp.headers.get('content-type') || '';
                let errMsg = 'Ошибка удаления раскадровки';
                if (ct.includes('application/json')) {
                  const j = await resp.json(); errMsg = j.detail || errMsg;
                } else {
                  const t = await resp.text(); errMsg = t || errMsg;
                }
                throw new Error(errMsg);
              }
              // deletion succeeded
              setProjectFlag('hasStoryboard', false);
            } catch (err) {
              console.error('delete frames failed', err);
              alert('Не удалось удалить раскадровку: ' + (err.message || 'Ошибка'));
              // restore original created UI
              createStory(tile, false);
            }
            return;
          }
          if (tile.dataset.type === 'script') {
            // For script, keep existing behavior: restore plus and clear flag
            // change visual to plus
            tile.dataset.state = '';
            tile.innerHTML = '<button class="big-plus" aria-label="Добавить">+</button><div class="caption">Добавить сценарий</div>';
            try {
              const resp = await fetch('/api/user/deleteScript', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: Number(PROJECT_ID) })
              });
              if (!resp.ok) throw new Error('Ошибка удаления сценария');
              setProjectFlag('hasScript', false);
            } catch (err) {
              console.error('delete script failed', err);
              alert('Не удалось удалить сценарий: ' + (err.message || 'Ошибка'));
              createScript(tile, false);
            }
            return;
          }
          // default fallback
          restorePlus(tile);
        });
      }
      return;
    }
    // otherwise, handle plus-tile clicks
    const tile = e.target.closest('.plus-tile');
    if (!tile) return;
    const type = tile.dataset.type;
    if (!type) return;

    // If already created, navigate to appropriate page
    if (tile.dataset.state === 'created'){
      if(type === 'story'){
        window.location.href = '/storyboard/index.html?project=' + encodeURIComponent(PROJECT_ID);
        return;
      }
      if(type === 'script'){
        window.location.href = '/script/script.html?project=' + encodeURIComponent(PROJECT_ID);
        return;
      }
    }

    // Not created yet: create on server
    if(type === 'story'){
      // create one frame (use defaults)
      fetch('/api/frame/newFrame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: Number(PROJECT_ID), start_time: 0, end_time: 1, description: '' })
      }).then(resp => {
        if (!resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            return resp.json().then(j => { throw new Error(j.detail || 'Ошибка создания кадра'); });
          } else {
            return resp.text().then(t => { throw new Error(t || 'Ошибка создания кадра'); });
          }
        }
        return resp.json();
      }).then(data => {
        // mark tile as created
        createStory(tile, /*persist*/ true);
      }).catch(err => { console.error('create frame failed', err); alert('Не удалось создать кадр: ' + (err.message||'Ошибка')); });
    }

    if(type === 'script'){
      // create one page
      fetch('/api/page/newPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: Number(PROJECT_ID) })
      }).then(resp => {
        if (!resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            return resp.json().then(j => { throw new Error(j.detail || 'Ошибка создания страницы'); });
          } else {
            return resp.text().then(t => { throw new Error(t || 'Ошибка создания страницы'); });
          }
        }
        return resp.json();
      }).then(data => {
        createScript(tile, /*persist*/ true);
      }).catch(err => { console.error('create page failed', err); alert('Не удалось создать страницу: ' + (err.message||'Ошибка')); });
    }
  });

  function createStory(tile, persist = true){
    tile.dataset.state = 'created';
    // simpler: inject SVG markup as innerHTML
    tile.innerHTML = `
      <div class="icon-wrap story-icon">
        <button class="icon-delete" title="Удалить">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#ffffff" stroke-width="1.6320000000000001" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
        <svg viewBox="0 0 220 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <!-- Four rows: each row has a 44px "frame" rect and a 64px "description" rect -->
          <rect x="12" y="12" width="44" height="24" rx="4" fill="#e6e6e6"></rect>
          <rect x="64" y="12" width="64" height="24" rx="4" fill="#696969"></rect>

          <rect x="12" y="46" width="44" height="24" rx="4" fill="#e6e6e6"></rect>
          <rect x="64" y="46" width="64" height="24" rx="4" fill="#696969"></rect>

          <rect x="12" y="80" width="44" height="24" rx="4" fill="#e6e6e6"></rect>
          <rect x="64" y="80" width="64" height="24" rx="4" fill="#696969"></rect>

          <rect x="12" y="114" width="44" height="24" rx="4" fill="#e6e6e6"></rect>
          <rect x="64" y="114" width="64" height="24" rx="4" fill="#696969"></rect>
        </svg>
      </div>`;
    if(persist) setProjectFlag('hasStoryboard', true);
  }

  function createScript(tile, persist = true){
    tile.dataset.state = 'created';
    tile.innerHTML = `
      <div class="icon-wrap script-icon">
        <button class="icon-delete" title="Удалить">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" transform="matrix(1, 0, 0, 1, 0, 0)">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.43200000000000005"></g>
            <g id="SVGRepo_iconCarrier">
              <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#ffffff" stroke-width="1.6320000000000001" stroke-linecap="round" stroke-linejoin="round"></path>
            </g>
          </svg>
        </button>
        <svg viewBox="0 0 220 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="12" width="180" height="136" rx="6" fill="#eaeaea"></rect>
          <!-- Varying widths to mimic lines of text -->
          <rect x="34" y="28" width="140" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="46" width="120" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="64" width="152" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="82" width="100" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="100" width="132" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="64" width="152" height="5" rx="3" fill="#585858"></rect>
          <rect x="34" y="118" width="110" height="5" rx="3" fill="#585858"></rect>
        </svg>
      </div>`;
    if(persist) setProjectFlag('hasScript', true);
  }

  function restorePlus(tile){
    const type = tile.dataset.type;
    tile.dataset.state = '';
    tile.innerHTML = '<button class="big-plus" aria-label="Добавить">+</button><div class="caption">'+(type==='story'?'Добавить раскадровку':'Добавить сценарий')+'</div>';
    // обновляем флаг в проекте
    if(type==='story') setProjectFlag('hasStoryboard', false);
    if(type==='script') setProjectFlag('hasScript', false);
  }

  // --- Confirm modal helpers ---
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmOk = document.getElementById('confirmOk');
  const confirmCancel = document.getElementById('confirmCancel');
  let _confirmCb = null;
  function showConfirm(msg, cb){
    if(!confirmOverlay){ if(window.confirm){ if(window.confirm(msg)) cb(); return; } }
    _confirmCb = cb;
    if(confirmMessage) confirmMessage.textContent = msg;
    confirmOverlay.classList.add('show'); confirmOverlay.setAttribute('aria-hidden','false');
  }
  function hideConfirm(){ if(!confirmOverlay) return; confirmOverlay.classList.remove('show'); confirmOverlay.setAttribute('aria-hidden','true'); _confirmCb = null; }
  if(confirmCancel) confirmCancel.addEventListener('click', ()=>{ hideConfirm(); });
  if(confirmOk) confirmOk.addEventListener('click', ()=>{ if(typeof _confirmCb==='function') _confirmCb(); hideConfirm(); });
  if(confirmOverlay) confirmOverlay.addEventListener('click',(e)=>{ if(e.target===confirmOverlay) hideConfirm(); });

  // Помощник: установить флаг в объекте проекта в localStorage
  function setProjectFlag(key, val){
    if(!PROJECT_ID) return;
    try{
      const projs = JSON.parse(localStorage.getItem('pt_projects')||'[]');
      const idx = projs.findIndex(x=>x.id===PROJECT_ID);
      if(idx===-1) return;
      projs[idx][key] = !!val;
      localStorage.setItem('pt_projects', JSON.stringify(projs));
    }catch(e){ /* ignore */ }
  }

})();
