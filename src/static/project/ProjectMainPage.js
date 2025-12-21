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
      const projs = JSON.parse(localStorage.getItem('pt_projects')||'[]');
      const p = projs.find(x=>x.id===pid);
      if(p && titleInput) { titleInput.value = p.name || titleInput.value; document.title = (p.name||'Проект') + ' — PlotTwister'; }
      // если есть сохранённый state — отрисуем иконки
      if(p){
        // render storyboard/script if flags present
        const storyTile = document.querySelector('.plus-tile[data-type="story"]');
        const scriptTile = document.querySelector('.plus-tile[data-type="script"]');
        if(p.hasStoryboard && storyTile) createStory(storyTile, /*persist*/ false);
        if(p.hasScript && scriptTile) createScript(scriptTile, /*persist*/ false);
      }
    }catch(e){ /* ignore malformed localStorage */ }
  })();

  // go back to account
  if(backBtn){ backBtn.addEventListener('click', ()=>{ window.location.href = 'Account.html'; }); }

  // Single click handler: create icon on plus click, or delete on trash click
  center.addEventListener('click', (e) => {
    // delete first (if clicked on delete button)
    const del = e.target.closest('.icon-delete');
    if (del) {
      const tile = del.closest('.plus-tile'); if (tile){
        // show confirmation before deleting
        showConfirm('Удалить элемент? Это действие необратимо.', ()=> restorePlus(tile));
      }
      return;
    }
    // otherwise, handle plus-tile clicks
    const tile = e.target.closest('.plus-tile');
    if (!tile) return;
    const type = tile.dataset.type;
    if (!type) return;
    if (tile.dataset.state === 'created') return; // already created
    if (type === 'story') createStory(tile);
    if (type === 'script') createScript(tile);
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
