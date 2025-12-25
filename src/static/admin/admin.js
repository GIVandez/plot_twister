/**
 * Страница администрирования PlotTwister
 * Управление пользователями и их проектами
 * 
 * TODO: Подключить базу данных вместо локальных данных
 * Для подключения БД замените функции в разделе "DATABASE API"
 */

(function() {
	'use strict';

	// =========================================================================
	// DATABASE API - Замените эти функции для подключения реальной БД
	// =========================================================================

	/**
	 * Получить всех пользователей из базы данных
	 * @returns {Promise<Array>} Массив пользователей
	 */
	async function fetchAllUsers() {
		try{
			const resp = await fetch('/api/admin/user/loadUsersAccounts');
			if(!resp.ok){
				console.warn('fetchAllUsers: API returned', resp.status);
				return getMockUsers();
			}
			const data = await resp.json();
			// data.users -> [{ login, email }]
			return (data.users || []).map(u => ({ id: u.login, login: u.login, email: u.email || '', avatar: null }));
		}catch(e){
			console.error('fetchAllUsers failed', e);
			return getMockUsers();
		}
	}

	/**
	 * Получить проекты пользователя
	 * @param {string} userId - ID пользователя
	 * @returns {Promise<Array>} Массив проектов
	 */
	async function fetchUserProjects(userId) {
		try{
			const resp = await fetch(`/api/users/${encodeURIComponent(userId)}/loadInfo`);
			if(resp.status === 204) return [];
			if(!resp.ok) { console.warn('fetchUserProjects: API error', resp.status); return getMockProjects(userId); }
			const data = await resp.json();
			// data.projects -> [{ project_id, project_name }]
			return (data.projects || []).map(p => ({ id: String(p.project_id), name: p.project_name, image: null }));
		}catch(e){
			console.error('fetchUserProjects failed', e);
			return getMockProjects(userId);
		}
	}

	/**
	 * Удалить пользователя
	 * @param {string} userId - ID пользователя
	 * @param {string} reason - Причина удаления
	 * @returns {Promise<boolean>} Успешность операции
	 */
	async function deleteUser(userId, reason) {
		// TODO: Заменить на реальный API запрос
		// return await fetch(`/api/users/${userId}`, { 
		//     method: 'DELETE', 
		//     body: JSON.stringify({ reason }) 
		// }).then(r => r.ok);
		
		console.log(`[API] Удаление пользователя ${userId}, причина: ${reason}`);
		// Удаляем из локальных данных
		mockUsers = mockUsers.filter(u => u.id !== userId);
		delete mockProjects[userId];
		return true;
	}

	/**
	 * Удалить проект
	 * @param {string} projectId - ID проекта
	 * @param {string} reason - Причина удаления
	 * @returns {Promise<boolean>} Успешность операции
	 */
	async function deleteProject(projectId, reason) {
		// Попробуем удалить через серверный API (админский endpoint)
		console.log(`[API] Удаление проекта ${projectId}, причина: ${reason}`);
		const numericId = Number(projectId);
		if (!Number.isNaN(numericId)) {
			try {
				const resp = await fetch('/api/admin/project/deleteProject', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ project_id: numericId })
				});
				if (!resp.ok) {
					console.warn('deleteProject API returned', resp.status);
					return false;
				}
				return true;
			} catch (e) {
				console.error('deleteProject API failed', e);
				// fall through to mock deletion
			}
		}
		// Если ID не числовой или API недоступен — удаляем из mock-данных
		for (const userId in mockProjects) {
			mockProjects[userId] = mockProjects[userId].filter(p => p.id !== projectId);
		}
		return true;
	}

	/**
	 * Отправить email пользователю
	 * @param {string} email - Email получателя
	 * @param {string} subject - Тема письма
	 * @param {string} message - Текст письма
	 * @returns {Promise<boolean>} Успешность отправки
	 */
	async function sendEmail(email, subject, message) {
		// TODO: Заменить на реальный API запрос
		// return await fetch('/api/email/send', { 
		//     method: 'POST', 
		//     body: JSON.stringify({ email, subject, message }) 
		// }).then(r => r.ok);
		
		console.log(`[API] Отправка письма на ${email}`);
		console.log(`Тема: ${subject}`);
		console.log(`Сообщение: ${message}`);
		return true;
	}

	// =========================================================================
	// MOCK DATA - Временные данные для тестирования
	// =========================================================================

	let mockUsers = [
		{ id: 'u1', login: 'ivan_petrov', email: 'ivan@example.com', avatar: null },
		{ id: 'u2', login: 'anna_sidorova', email: 'anna@example.com', avatar: null },
		{ id: 'u3', login: 'dmitry_kozlov', email: 'dmitry@example.com', avatar: null },
		{ id: 'u4', login: 'elena_smirnova', email: 'elena@example.com', avatar: null },
		{ id: 'u5', login: 'sergey_volkov', email: 'sergey@example.com', avatar: null },
		{ id: 'u6', login: 'maria_novikova', email: 'maria@example.com', avatar: null },
		{ id: 'u7', login: 'alexey_morozov', email: 'alexey@example.com', avatar: null },
		{ id: 'u8', login: 'olga_fedorova', email: 'olga@example.com', avatar: null },
	];

	let mockProjects = {
		'u1': [
			{ id: 'p1', name: 'Драма в городе', image: null },
			{ id: 'p2', name: 'Летняя история', image: null },
			{ id: 'p3', name: 'Тайна старого дома', image: null },
		],
		'u2': [
			{ id: 'p4', name: 'Комедия ошибок', image: null },
			{ id: 'p5', name: 'Романтическая встреча', image: null },
		],
		'u3': [
			{ id: 'p6', name: 'Детектив', image: null },
		],
		'u4': [],
		'u5': [
			{ id: 'p7', name: 'Фантастика 2077', image: null },
			{ id: 'p8', name: 'Космическая одиссея', image: null },
			{ id: 'p9', name: 'Звездные войны', image: null },
			{ id: 'p10', name: 'Марсианин', image: null },
		],
		'u6': [
			{ id: 'p11', name: 'Мелодрама', image: null },
		],
		'u7': [
			{ id: 'p12', name: 'Триллер', image: null },
			{ id: 'p13', name: 'Ужасы ночи', image: null },
		],
		'u8': [],
	};

	function getMockUsers() {
		return [...mockUsers];
	}

	function getMockProjects(userId) {
		return mockProjects[userId] ? [...mockProjects[userId]] : [];
	}

	// =========================================================================
	// DOM ELEMENTS
	// =========================================================================

	const userSearch = document.getElementById('userSearch');
	const usersList = document.getElementById('usersList');
	const detailsPlaceholder = document.getElementById('detailsPlaceholder');
	const detailsContent = document.getElementById('detailsContent');
	const detailAvatar = document.getElementById('detailAvatar');
	const detailLogin = document.getElementById('detailLogin');
	const detailEmail = document.getElementById('detailEmail');
	const detailProjectsCount = document.getElementById('detailProjectsCount');
	const detailProjectsGrid = document.getElementById('detailProjectsGrid');
	const detailBackBtn = document.getElementById('detailBackBtn');
	const detailDeleteBtn = document.getElementById('detailDeleteBtn');
	const detailGiveAdminBtn = document.getElementById('detailGiveAdminBtn');
	const detailRemoveAdminBtn = document.getElementById('detailRemoveAdminBtn');
	const detailBackBtnPlaceholder = document.getElementById('detailBackBtnPlaceholder');

	// Email Modal
	const emailOverlay = document.getElementById('emailOverlay');
	const emailTo = document.getElementById('emailTo');
	const emailSubject = document.getElementById('emailSubject');
	const emailMessage = document.getElementById('emailMessage');
	const emailSend = document.getElementById('emailSend');
	const emailCancel = document.getElementById('emailCancel');

	// Delete User Modal
	const deleteUserOverlay = document.getElementById('deleteUserOverlay');
	const deleteUserEmail = document.getElementById('deleteUserEmail');
	const deleteUserReason = document.getElementById('deleteUserReason');
	const deleteUserConfirm = document.getElementById('deleteUserConfirm');
	const deleteUserCancel = document.getElementById('deleteUserCancel');

	// Delete Project Modal
	const deleteProjectOverlay = document.getElementById('deleteProjectOverlay');
	const deleteProjectEmail = document.getElementById('deleteProjectEmail');
	const deleteProjectReason = document.getElementById('deleteProjectReason');
	const deleteProjectConfirm = document.getElementById('deleteProjectConfirm');
	const deleteProjectCancel = document.getElementById('deleteProjectCancel');

	// =========================================================================
	// STATE
	// =========================================================================

	let allUsers = [];
	let selectedUser = null;
	let selectedUserProjects = [];
	let pendingDeleteUserId = null;
	let pendingDeleteProjectId = null;
	const currentLogin = sessionStorage.getItem('pt_login');

	// =========================================================================
	// RENDER FUNCTIONS
	// =========================================================================

	/**
	 * Отрисовка списка пользователей
	 */
	function renderUsersList(users) {
		usersList.innerHTML = '';

		if (users.length === 0) {
			usersList.innerHTML = '<div class="no-projects">Пользователи не найдены</div>';
			return;
		}

		users.forEach(user => {
			const block = document.createElement('div');
			block.className = 'user-block' + (selectedUser && selectedUser.id === user.id ? ' active' : '');
			block.dataset.userId = user.id;

			const avatarContent = user.avatar 
				? `<img src="${user.avatar}" alt="">` 
				: (user.login || 'U').slice(0, 2).toUpperCase();

			block.innerHTML = `
				<div class="user-avatar">${avatarContent}</div>
				<div class="user-meta">
					<div class="user-login">${escapeHtml(user.login)}</div>
					<div class="user-email">${escapeHtml(user.email)}</div>
				</div>
				<button class="user-menu-btn" title="Меню">
					<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
				</button>
				<div class="user-menu-dropdown">
					<button data-action="email">Написать письмо</button>
					<button data-action="delete" class="delete-action">Удалить пользователя</button>
				</div>
			`;

			// Клик по блоку пользователя (выбор)
			block.addEventListener('click', (e) => {
				if (e.target.closest('.user-menu-btn') || e.target.closest('.user-menu-dropdown')) {
					return;
				}
				selectUser(user);
			});

			// Кнопка меню
			const menuBtn = block.querySelector('.user-menu-btn');
			const menuDropdown = block.querySelector('.user-menu-dropdown');

			menuBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				closeAllMenus();
				menuDropdown.classList.toggle('open');
			});

			// Действия в меню
			menuDropdown.addEventListener('click', (e) => {
				const action = e.target.dataset.action;
				if (action === 'email') {
					openEmailModal(user.email);
				} else if (action === 'delete') {
					// Быстрое подтверждение удаления без запроса причины
					confirmAndDeleteUser(user);
				}
				menuDropdown.classList.remove('open');
			});

			usersList.appendChild(block);
		});
	}

	/**
	 * Отрисовка деталей пользователя
	 */
	function renderUserDetails() {
		if (!selectedUser) {
			detailsPlaceholder.style.display = 'flex';
			detailsContent.style.display = 'none';
			return;
		}

		detailsPlaceholder.style.display = 'none';
		detailsContent.style.display = 'block';

		// Аватар
		if (selectedUser.avatar) {
			detailAvatar.innerHTML = `<img src="${selectedUser.avatar}" alt="">`;
		} else {
			detailAvatar.textContent = (selectedUser.login || 'U').slice(0, 2).toUpperCase();
		}

		// Информация
		detailLogin.textContent = selectedUser.login;
		detailEmail.textContent = selectedUser.email;
		detailProjectsCount.textContent = selectedUserProjects.length;

		// Управление кнопками ролей
		const isAdmin = selectedUser.role === 'admin';
		if (detailGiveAdminBtn) detailGiveAdminBtn.style.display = isAdmin ? 'none' : 'inline-block';
		if (detailRemoveAdminBtn) detailRemoveAdminBtn.style.display = isAdmin ? 'inline-block' : 'none';

		// Проекты
		renderProjectsGrid();
	}

	/**
	 * Отрисовка сетки проектов
	 */
	function renderProjectsGrid() {
		detailProjectsGrid.innerHTML = '';

		if (selectedUserProjects.length === 0) {
			detailProjectsGrid.innerHTML = '<div class="no-projects">У пользователя нет проектов</div>';
			return;
		}

		selectedUserProjects.forEach(project => {
			const tile = document.createElement('div');
			tile.className = 'proj-tile';
			tile.dataset.projectId = project.id;

			tile.innerHTML = `
				<button class="proj-menu-btn" title="Меню">
					<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
				</button>
				<div class="proj-menu-dropdown">
					<button data-action="email">Написать письмо</button>
					<button data-action="delete" class="delete-action">Удалить проект</button>
				</div>
				<div class="proj-image">
					${project.image ? `<img src="${project.image}" alt="">` : getSvgPlaceholder()}
				</div>
				<div class="proj-title">${escapeHtml(project.name || 'Без названия')}</div>
			`;

			// Кнопка меню проекта
			const menuBtn = tile.querySelector('.proj-menu-btn');
			const menuDropdown = tile.querySelector('.proj-menu-dropdown');

			menuBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				closeAllMenus();
				menuDropdown.classList.toggle('open');
			});

			// Действия в меню проекта
			menuDropdown.addEventListener('click', (e) => {
				const action = e.target.dataset.action;
				if (action === 'email') {
					openEmailModal(selectedUser.email, `Проект "${project.name}"`);
				} else if (action === 'delete') {
					// Быстрое подтверждение удаления проекта без запроса причины
					confirmAndDeleteProject(project);
				}
				menuDropdown.classList.remove('open');
			});

			detailProjectsGrid.appendChild(tile);
		});
	}

	// =========================================================================
	// USER ACTIONS
	// =========================================================================

	/**
	 * Выбрать пользователя
	 */
	async function selectUser(user) {
		selectedUser = user;
		// Получить роль пользователя
		try {
			const resp = await fetch(`/api/users/${encodeURIComponent(user.id)}/info`);
			if (resp.ok) {
				const data = await resp.json();
				selectedUser.role = data.role || 'user';
			} else {
				selectedUser.role = 'user'; // по умолчанию
			}
		} catch (e) {
			console.warn('Failed to fetch user role', e);
			selectedUser.role = 'user';
		}
		// Обновить роль в allUsers
		const userInList = allUsers.find(u => u.id === user.id);
		if (userInList) userInList.role = selectedUser.role;
		selectedUserProjects = await fetchUserProjects(user.id);
		
		// Обновляем активный класс в списке
		document.querySelectorAll('.user-block').forEach(block => {
			block.classList.toggle('active', block.dataset.userId === user.id);
		});

		renderUserDetails();
	}


	/**
	 * Подтверждение и удаление пользователя без запроса причины
	 */
	async function confirmAndDeleteUser(user) {
		if(!user) return;
		// Проверка: нельзя удалить свой аккаунт
		if (user.id === currentLogin) {
			alert('Нельзя удалить свой собственный аккаунт.');
			return;
		}
		// Проверка: нельзя удалить последнего админа
		const adminCount = allUsers.filter(u => u.role === 'admin').length;
		if (user.role === 'admin' && adminCount <= 1) {
			alert('Нельзя удалить последнего пользователя с ролью admin.');
			return;
		}
		const ok = window.confirm(`Удалить пользователя "${user.login}"? Это действие необратимо.`);
		if(!ok) return;
		try{
			await deleteUser(user.id, '');
			// Обновляем список
			allUsers = await fetchAllUsers();
			// Если удалён выбранный пользователь — сбрасываем выбор
			if(selectedUser && selectedUser.id === user.id){
				selectedUser = null; selectedUserProjects = [];
				renderUserDetails();
			}
			renderUsersList(allUsers);
		}catch(e){
			console.error('confirmAndDeleteUser failed', e);
			alert('Не удалось удалить пользователя');
		}
	}

	/**
	 * Подтверждение и удаление проекта без запроса причины
	 */
	async function confirmAndDeleteProject(project) {
		if(!project) return;
		const ok = window.confirm(`Удалить проект "${project.name}"? Это действие необратимо.`);
		if(!ok) return;
		try{
			await deleteProject(project.id, '');
			if(selectedUser){
				selectedUserProjects = await fetchUserProjects(selectedUser.id);
				detailProjectsCount.textContent = selectedUserProjects.length;
				renderProjectsGrid();
			}
		}catch(e){
			console.error('confirmAndDeleteProject failed', e);
			alert('Не удалось удалить проект');
		}
	}

	/**
	 * Поиск пользователей
	 */
	function searchUsers(query) {
		const q = query.toLowerCase().trim();
		if (!q) {
			renderUsersList(allUsers);
			return;
		}

		const filtered = allUsers.filter(user => 
			user.login.toLowerCase().includes(q) || 
			user.email.toLowerCase().includes(q)
		);
		renderUsersList(filtered);
	}

	// =========================================================================
	// MODAL FUNCTIONS
	// =========================================================================

	function openEmailModal(email, subjectPrefix = '') {
		emailTo.value = email;
		emailSubject.value = subjectPrefix ? `${subjectPrefix}: ` : '';
		emailMessage.value = '';
		emailOverlay.classList.add('show');
		emailOverlay.setAttribute('aria-hidden', 'false');
	}

	function closeEmailModal() {
		emailOverlay.classList.remove('show');
		emailOverlay.setAttribute('aria-hidden', 'true');
	}

	function openDeleteUserModal(user) {
		pendingDeleteUserId = user.id;
		deleteUserEmail.value = user.email;
		deleteUserReason.value = '';
		deleteUserConfirm.disabled = true;
		deleteUserOverlay.classList.add('show');
		deleteUserOverlay.setAttribute('aria-hidden', 'false');
	}

	function closeDeleteUserModal() {
		deleteUserOverlay.classList.remove('show');
		deleteUserOverlay.setAttribute('aria-hidden', 'true');
		pendingDeleteUserId = null;
	}

	function openDeleteProjectModal(project) {
		pendingDeleteProjectId = project.id;
		deleteProjectEmail.value = selectedUser.email;
		deleteProjectReason.value = '';
		deleteProjectConfirm.disabled = true;
		deleteProjectOverlay.classList.add('show');
		deleteProjectOverlay.setAttribute('aria-hidden', 'false');
	}

	function closeDeleteProjectModal() {
		deleteProjectOverlay.classList.remove('show');
		deleteProjectOverlay.setAttribute('aria-hidden', 'true');
		pendingDeleteProjectId = null;
	}

	function closeAllMenus() {
		document.querySelectorAll('.user-menu-dropdown.open, .proj-menu-dropdown.open').forEach(menu => {
			menu.classList.remove('open');
		});
	}

	// =========================================================================
	// EVENT LISTENERS
	// =========================================================================

	// Поиск
	userSearch.addEventListener('input', (e) => {
		searchUsers(e.target.value);
	});

	// Кнопки в панели деталей
	if(detailBackBtn){
		detailBackBtn.addEventListener('click', () => {
			// Возврат в личный кабинет
			window.location.href = '/user';
		});
	}
	if(detailBackBtnPlaceholder){
		detailBackBtnPlaceholder.addEventListener('click', () => {
			// Возврат в личный кабинет
			window.location.href = '/user';
		});
	}

	detailDeleteBtn.addEventListener('click', () => {
		if (selectedUser) {
			confirmAndDeleteUser(selectedUser);
		}
	});

	if(detailGiveAdminBtn){
		detailGiveAdminBtn.addEventListener('click', async () => {
			if (!selectedUser) return;
			const ok = window.confirm(`Выдать роль admin пользователю "${selectedUser.login}"?`);
			if (!ok) return;
			try {
				const resp = await fetch('/api/admin/user/upgradeAccount', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ login: selectedUser.login })
				});
				if (!resp.ok) {
					console.warn('upgradeAccount failed', resp.status);
					alert('Не удалось выдать роль admin');
					return;
				}
				alert('Роль admin выдана');
				// Обновить роль в selectedUser и allUsers
				selectedUser.role = 'admin';
				const userInList = allUsers.find(u => u.id === selectedUser.id);
				if (userInList) userInList.role = 'admin';
				renderUserDetails();
			} catch (e) {
				console.error('upgradeAccount error', e);
				alert('Ошибка при выдаче роли');
			}
		});
	}

	if(detailRemoveAdminBtn){
		detailRemoveAdminBtn.addEventListener('click', async () => {
			if (!selectedUser) return;
			// Проверка: нельзя снять роль admin с последнего админа
			const adminCount = allUsers.filter(u => u.role === 'admin').length;
			if (adminCount <= 1) {
				alert('Нельзя снять роль admin с последнего пользователя с этой ролью.');
				return;
			}
			const ok = window.confirm(`Снять роль admin у пользователя "${selectedUser.login}"?`);
			if (!ok) return;
			try {
				const resp = await fetch('/api/admin/dropAdmin', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ login: selectedUser.login })
				});
				if (!resp.ok) {
					console.warn('dropAdmin failed', resp.status);
					alert('Не удалось снять роль admin');
					return;
				}
				alert('Роль admin снята');
				// Обновить роль в selectedUser и allUsers
				selectedUser.role = 'user';
				const userInList = allUsers.find(u => u.id === selectedUser.id);
				if (userInList) userInList.role = 'user';
				renderUserDetails();
			} catch (e) {
				console.error('dropAdmin error', e);
				alert('Ошибка при снятии роли');
			}
		});
	}

	// Email Modal
	emailCancel.addEventListener('click', closeEmailModal);
	emailSend.addEventListener('click', async () => {
		const email = emailTo.value;
		const subject = emailSubject.value.trim();
		const message = emailMessage.value.trim();

		if (!subject || !message) {
			alert('Заполните тему и сообщение');
			return;
		}

		await sendEmail(email, subject, message);
		alert('Письмо отправлено');
		closeEmailModal();
	});

	// Delete User Modal
	deleteUserCancel.addEventListener('click', closeDeleteUserModal);
	deleteUserReason.addEventListener('input', () => {
		deleteUserConfirm.disabled = !deleteUserReason.value.trim();
	});
	deleteUserConfirm.addEventListener('click', async () => {
		if (!pendingDeleteUserId) return;

		const reason = deleteUserReason.value.trim();
		const email = deleteUserEmail.value;

		// Отправляем письмо с причиной
		await sendEmail(email, 'Ваш аккаунт удален', `Причина удаления: ${reason}`);
		
		// Удаляем пользователя
		await deleteUser(pendingDeleteUserId, reason);

		// Если удалили выбранного пользователя, сбрасываем выбор
		if (selectedUser && selectedUser.id === pendingDeleteUserId) {
			selectedUser = null;
			selectedUserProjects = [];
			renderUserDetails();
		}

		// Обновляем список
		allUsers = await fetchAllUsers();
		renderUsersList(allUsers);

		closeDeleteUserModal();
	});

	// Delete Project Modal
	deleteProjectCancel.addEventListener('click', closeDeleteProjectModal);
	deleteProjectReason.addEventListener('input', () => {
		deleteProjectConfirm.disabled = !deleteProjectReason.value.trim();
	});
	deleteProjectConfirm.addEventListener('click', async () => {
		if (!pendingDeleteProjectId) return;

		const reason = deleteProjectReason.value.trim();
		const email = deleteProjectEmail.value;

		// Отправляем письмо с причиной
		await sendEmail(email, 'Ваш проект удален', `Причина удаления: ${reason}`);
		
		// Удаляем проект
		await deleteProject(pendingDeleteProjectId, reason);

		// Обновляем проекты выбранного пользователя
		if (selectedUser) {
			selectedUserProjects = await fetchUserProjects(selectedUser.id);
			detailProjectsCount.textContent = selectedUserProjects.length;
			renderProjectsGrid();
		}

		closeDeleteProjectModal();
	});

	// Закрытие модалок по клику на оверлей
	emailOverlay.addEventListener('click', (e) => {
		if (e.target === emailOverlay) closeEmailModal();
	});
	deleteUserOverlay.addEventListener('click', (e) => {
		if (e.target === deleteUserOverlay) closeDeleteUserModal();
	});
	deleteProjectOverlay.addEventListener('click', (e) => {
		if (e.target === deleteProjectOverlay) closeDeleteProjectModal();
	});

	// Закрытие меню при клике вне
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.user-menu-btn') && !e.target.closest('.user-menu-dropdown') &&
			!e.target.closest('.proj-menu-btn') && !e.target.closest('.proj-menu-dropdown')) {
			closeAllMenus();
		}
	});

	// =========================================================================
	// UTILITY FUNCTIONS
	// =========================================================================

	function escapeHtml(str) {
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	function getSvgPlaceholder() {
		return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
			<path d="M3 16L8 11L13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M13 14L16 11L21 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
		</svg>`;
	}

	// =========================================================================
	// INITIALIZATION
	// =========================================================================

	async function init() {
		allUsers = await fetchAllUsers();
		renderUsersList(allUsers);
	}

	init();

})();
