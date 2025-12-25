// Client-side behavior for login/register forms
(function(){
  const autoShowKey = 'pt_rules_auto_shown';

  function qs(sel, root=document){return root.querySelector(sel)}
  function qsa(sel, root=document){return Array.from(root.querySelectorAll(sel))}

  // Toggle password visibility
  function hookToggle(btnId, inputSelector){
    const btn = qs('#'+btnId);
    if(!btn) return;
    const form = btn.closest('form');
    const input = qs(inputSelector, form);
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');
    btn.addEventListener('click', ()=>{
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      if(eyeOpen && eyeClosed){
        eyeOpen.style.display = isPwd ? 'none' : 'block';
        eyeClosed.style.display = isPwd ? 'block' : 'none';
      }
      btn.setAttribute('aria-pressed', isPwd ? 'true' : 'false');
    });
  }

  // Rules panel toggle and outside click handling
  function setupRules(toggleId, panelId, form){
    const toggle = qs('#'+toggleId);
    const panel = qs('#'+panelId);
    if(!toggle || !panel) return;
    function show(){ panel.classList.add('show'); panel.setAttribute('aria-hidden','false') }
    function hide(){ panel.classList.remove('show'); panel.setAttribute('aria-hidden','true') }
    toggle.addEventListener('click', (e)=>{ e.stopPropagation(); if(panel.classList.contains('show')) hide(); else show(); });
    // click anywhere hides
    document.addEventListener('click', (e)=>{
      if(!panel.classList.contains('show')) return;
      if(panel.contains(e.target) || toggle.contains(e.target)) return;
      hide();
    });
    return {show, hide};
  }

  // Validation helpers
  function hasLetter(s){return /[A-Za-zА-Яа-яЁё]/.test(s)}
  function digitCount(s){return (s.match(/\d/g)||[]).length}
  function validLogin(login){ if(!login) return false; if(login.length>20) return false; return /^[A-Za-zА-Яа-яЁё0-9_]+$/.test(login) && hasLetter(login) }
  function validPassword(pw){ if(!pw) return false; if(pw.length>20) return false; return hasLetter(pw) && digitCount(pw) >=4 }
  function validEmail(e){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) }

  // Apply error styles without clearing values
  function markFieldError(fieldEl, isError){
    if(isError) fieldEl.classList.add('error'); else fieldEl.classList.remove('error');
  }

  // Remove error styling when user starts typing
  function attachClearOnInput(form, callback){
    if(!form) return;
    const inputs = qsa('input', form);
    inputs.forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const fld = inp.closest('.field');
        if(fld) fld.classList.remove('error');
        if(callback) callback(inp);
      });
    });
  }

  // Register form handling
  function setupRegister(){
    const form = qs('#registerForm');
    if(!form) return;
    const toggle = setupRules('rulesToggle','rulesPanel',form);
    hookToggle('togglePassword','#registerForm #password');
    const username = qs('#username',form);
    const password = qs('#password',form);
    const errorsEl = qs('#regErrors');

    form.addEventListener('submit',(e)=>{
      e.preventDefault(); errorsEl.textContent='';
      let any=false; let msgs=[]; let showRules=false;

      // username checks
      const u = username.value.trim();
      if(u.length === 0){ any=true; msgs.push('Некорректный логин.'); markFieldError(qs('#usernameField'), true); showRules=true; }
      else if(u.length>20){ any=true; msgs.push('Максимум 20 символов для логина.'); markFieldError(qs('#usernameField'), true); showRules=true }
      else if(!hasLetter(u) ){ any=true; msgs.push('Логин должен содержать хотя бы 1 букву.'); markFieldError(qs('#usernameField'), true); showRules=true }
      else if(!/^[A-Za-zА-Яа-яЁё0-9_]+$/.test(u)){ any=true; msgs.push('Некорректный логин. Допустимы буквы, цифры и _.'); markFieldError(qs('#usernameField'), true); showRules=true }
      else{
        // simulate taken username
        if(u.toLowerCase() === 'taken'){ any=true; msgs.push('Такой логин уже занят.'); markFieldError(qs('#usernameField'), true); }
        else markFieldError(qs('#usernameField'), false);
      }

      // password checks
      const p = password.value;
      if(p.length === 0){ any=true; msgs.push('Слишком простой пароль.'); markFieldError(qs('#passwordField'), true); showRules=true }
      else if(p.length>20){ any=true; msgs.push('Максимум 20 символов для пароля.'); markFieldError(qs('#passwordField'), true); showRules=true }
      else if(!hasLetter(p) || digitCount(p) < 4){ any=true; msgs.push('Слишком простой пароль. Пароль должен содержать минимум 4 цифры и 1 букву.'); markFieldError(qs('#passwordField'), true); showRules=true }
      else markFieldError(qs('#passwordField'), false);

      if(any){
        errorsEl.innerHTML = msgs.join('<br>');
        errorsEl.classList.add('show-error');
        // show rules on first login/password error only once
        const hadShown = sessionStorage.getItem(autoShowKey);
        if(showRules && !hadShown){ toggle.show(); sessionStorage.setItem(autoShowKey,'1'); }
        return;
      }

      // If no errors — proceed with registration
      errorsEl.classList.remove('show-error');

      const registerData = { login: u, password: p };

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка регистрации'); });
        }
        return response.json();
      })
      .then(data => {
        // Регистрация успешна, теперь автоматически входим
        return fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: u, password: p })
        });
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка входа после регистрации'); });
        }
        return response.json();
      })
      .then(loginData => {
        // Сохраняем токен и логин в sessionStorage
        sessionStorage.setItem('pt_access_token', loginData.access_token);
        sessionStorage.setItem('pt_login', u);
        // Также ставим cookie, чтобы сервер мог проверить роль при переходе на защищённые страницы
        try{
          document.cookie = 'pt_login=' + encodeURIComponent(u) + '; path=/';
          document.cookie = 'pt_access_token=' + encodeURIComponent(loginData.access_token) + '; path=/';
        }catch(e){ /* ignore */ }
        // Перенаправляем на страницу личного кабинета
        window.location.href = 'http://127.0.0.1:8000/user';
      })
      .catch(error => {
        errorsEl.textContent = error.message;
        errorsEl.style.color = '#C30000';
        errorsEl.classList.add('show-error');
      });
    });
    // clear errors while typing
    attachClearOnInput(form, (inp)=>{
      errorsEl.classList.remove('show-error');
      errorsEl.textContent='';
      errorsEl.style.color='';
    });
  }

  // Login form handling (similar, but no email)
  function setupLogin(){
    const form = qs('#loginForm');
    if(!form) return;
    const toggle = setupRules('rulesToggleLogin','rulesPanelLogin',form);
    hookToggle('togglePasswordLogin','#loginForm #password');
    const username = qs('#username',form);
    const password = qs('#password',form);
    const errorsEl = qs('#loginErrors');
    form.addEventListener('submit',(e)=>{
      e.preventDefault(); errorsEl.textContent=''; errorsEl.style.color='';
      const u = username.value.trim();
      const p = password.value;
      let emptyFields = false;

      // empty field handling: mark red but do not show message
      if(u.length === 0){ markFieldError(qs('#usernameField', form), true); emptyFields = true; }
      if(p.length === 0){ markFieldError(qs('#passwordField', form), true); emptyFields = true; }
      if(emptyFields){ return; }

      // Убрана строгая клиентская валидация формата — сервер сам проверит логин и пароль

      // Реальный вход через API
      const loginData = { login: u, password: p };
      
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.detail || 'Ошибка входа'); });
        }
        return response.json();
      })
      .then(data => {
        // Сохраняем токен и логин в sessionStorage
        sessionStorage.setItem('pt_access_token', data.access_token);
        sessionStorage.setItem('pt_login', u);
        // Также ставим cookie, чтобы сервер мог проверить роль при переходе на защищённые страницы
        try{
          document.cookie = 'pt_login=' + encodeURIComponent(u) + '; path=/';
          document.cookie = 'pt_access_token=' + encodeURIComponent(data.access_token) + '; path=/';
        }catch(e){ /* ignore */ }
        // Перенаправляем на страницу личного кабинета
        window.location.href = 'http://127.0.0.1:8000/user';
      })
      .catch(error => {
        errorsEl.textContent = 'Неверный логин или пароль';
        errorsEl.style.color = '#C30000';
        errorsEl.classList.add('show-error');
        markFieldError(qs('#usernameField', form), true);
        markFieldError(qs('#passwordField', form), true);
        const hadShown = sessionStorage.getItem(autoShowKey);
        if(!hadShown){ toggle.show(); sessionStorage.setItem(autoShowKey,'1'); }
      });

      return; // Прерываем дальнейшее выполнение, ждём ответа сервера
    });

    // clear errors while typing
    attachClearOnInput(form, (inp)=>{
      errorsEl.classList.remove('show-error');
      errorsEl.textContent='';
      errorsEl.style.color='';
    });
  }

  // initialize
  document.addEventListener('DOMContentLoaded', ()=>{ setupRegister(); setupLogin(); });
})();
