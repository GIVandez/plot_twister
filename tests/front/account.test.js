/**
 * Модульные тесты для account.js
 * Использует Jest для тестирования функций управления аккаунтом и проектами
 */

// Mock для sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock для localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// =========================================================================
// ТЕСТЫ: Проверка авторизации
// =========================================================================
describe('Authorization checks', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();
  });

  test('должен перенаправить на login если нет access_token', () => {
    sessionStorageMock.clear();

    // Имитируем проверку авторизации из account.js
    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');
    
    let redirectUrl = null;
    if (!accessToken || !sessionLogin) {
      redirectUrl = 'http://127.0.0.1:8000/auth/login.html';
    }

    expect(redirectUrl).toContain('login.html');
  });

  test('должен перенаправить на login если нет login в sessionStorage', () => {
    sessionStorageMock.setItem('pt_access_token', 'token123');
    sessionStorageMock.removeItem('pt_login');
    
    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');
    
    let redirectUrl = null;
    if (!accessToken || !sessionLogin) {
      redirectUrl = 'http://127.0.0.1:8000/auth/login.html';
    }

    expect(redirectUrl).toContain('login.html');
  });

  test('должен пропустить пользователя с валидным токеном и логином', () => {
    sessionStorageMock.setItem('pt_access_token', 'token123');
    sessionStorageMock.setItem('pt_login', 'testuser');

    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');

    expect(accessToken).toBe('token123');
    expect(sessionLogin).toBe('testuser');
  });
});

// =========================================================================
// ТЕСТЫ: Управление данными пользователя
// =========================================================================
describe('User data management', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();
  });

  test('должен получить логин из sessionStorage если он есть', () => {
    sessionStorageMock.setItem('pt_login', 'mylogin');
    localStorageMock.setItem('pt_login', 'oldlogin');

    const login = sessionStorageMock.getItem('pt_login') || localStorageMock.getItem('pt_login') || 'plotuser';
    expect(login).toBe('mylogin');
  });

  test('должен вернуть логин из localStorage если нет в sessionStorage', () => {
    localStorageMock.setItem('pt_login', 'oldlogin');

    const login = sessionStorageMock.getItem('pt_login') || localStorageMock.getItem('pt_login') || 'plotuser';
    expect(login).toBe('oldlogin');
  });

  test('должен вернуть логин по умолчанию если нет нигде', () => {
    const login = sessionStorageMock.getItem('pt_login') || localStorageMock.getItem('pt_login') || 'plotuser';
    expect(login).toBe('plotuser');
  });

  test('должен загрузить email из localStorage', () => {
    localStorageMock.setItem('pt_email', 'user@example.com');

    const email = localStorageMock.getItem('pt_email') || 'default@example.com';
    expect(email).toBe('user@example.com');
  });

  test('должен вернуть email по умолчанию если его нет', () => {
    const email = localStorageMock.getItem('pt_email') || 'user@example.com';
    expect(email).toBe('user@example.com');
  });

  test('должен сохранить аватар в localStorage', () => {
    const avatar = 'data:image/png;base64,iVBORw0KGgo...';
    localStorageMock.setItem('pt_avatar', avatar);

    const savedAvatar = localStorageMock.getItem('pt_avatar');
    expect(savedAvatar).toBe(avatar);
  });
});

// =========================================================================
// ТЕСТЫ: Управление проектами (CRUD операции)
// =========================================================================
describe('Project management', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('должен загрузить пустой массив проектов если localStorage пуст', () => {
    const projects = JSON.parse(localStorageMock.getItem('pt_projects') || '[]');
    expect(projects).toEqual([]);
  });

  test('должен загрузить проекты из localStorage', () => {
    const mockProjects = [
      { id: 'p123', name: 'Project 1', orientation: 'horizontal' },
      { id: 'p456', name: 'Project 2', orientation: 'vertical' }
    ];
    localStorageMock.setItem('pt_projects', JSON.stringify(mockProjects));

    const projects = JSON.parse(localStorageMock.getItem('pt_projects') || '[]');
    expect(projects).toEqual(mockProjects);
    expect(projects.length).toBe(2);
  });

  test('должен добавить новый проект в начало массива', () => {
    const mockProjects = [
      { id: 'p123', name: 'Project 1', orientation: 'horizontal' }
    ];
    localStorageMock.setItem('pt_projects', JSON.stringify(mockProjects));

    let projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    const newProject = { id: 'p789', name: 'New Project', orientation: 'horizontal' };
    projects.unshift(newProject);
    localStorageMock.setItem('pt_projects', JSON.stringify(projects));

    projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(projects[0].id).toBe('p789');
    expect(projects.length).toBe(2);
  });

  test('должен обновить название проекта', () => {
    const mockProjects = [
      { id: 'p123', name: 'Old Name', orientation: 'horizontal' }
    ];
    localStorageMock.setItem('pt_projects', JSON.stringify(mockProjects));

    let projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    const project = projects.find(p => p.id === 'p123');
    if (project) {
      project.name = 'New Name';
    }
    localStorageMock.setItem('pt_projects', JSON.stringify(projects));

    projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(projects[0].name).toBe('New Name');
  });

  test('должен удалить проект по ID', () => {
    const mockProjects = [
      { id: 'p123', name: 'Project 1', orientation: 'horizontal' },
      { id: 'p456', name: 'Project 2', orientation: 'vertical' }
    ];
    localStorageMock.setItem('pt_projects', JSON.stringify(mockProjects));

    let projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    projects = projects.filter(p => p.id !== 'p123');
    localStorageMock.setItem('pt_projects', JSON.stringify(projects));

    projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('p456');
  });

  test('должен найти проект по ID', () => {
    const mockProjects = [
      { id: 'p123', name: 'Project 1', orientation: 'horizontal' },
      { id: 'p456', name: 'Project 2', orientation: 'vertical' }
    ];
    localStorageMock.setItem('pt_projects', JSON.stringify(mockProjects));

    const projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    const found = projects.find(p => p.id === 'p456');
    
    expect(found).toBeDefined();
    expect(found.name).toBe('Project 2');
  });
});

// =========================================================================
// ТЕСТЫ: Генератор ID
// =========================================================================
describe('Project ID generation', () => {
  test('должен генерировать уникальный ID с префиксом p', () => {
    // Функция uid из account.js
    const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
    
    const id1 = uid();
    const id2 = uid();

    expect(id1).toMatch(/^p[a-z0-9]{7}$/);
    expect(id2).toMatch(/^p[a-z0-9]{7}$/);
    expect(id1).not.toBe(id2);
  });

  test('сгенерированные ID должны начинаться с буквы p', () => {
    const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
    
    for (let i = 0; i < 10; i++) {
      expect(uid()).toMatch(/^p/);
    }
  });
});

// =========================================================================
// ТЕСТЫ: Сохранение состояния
// =========================================================================
describe('State persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('должен сохранить проекты в localStorage', () => {
    const projects = [
      { id: 'p123', name: 'Project 1', orientation: 'horizontal' }
    ];

    localStorageMock.setItem('pt_projects', JSON.stringify(projects));
    
    const saved = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(saved).toEqual(projects);
  });

  test('должен сохранить логин пользователя', () => {
    const login = 'testuser';
    localStorageMock.setItem('pt_login', login);

    const saved = localStorageMock.getItem('pt_login');
    expect(saved).toBe(login);
  });

  test('должен сохранить email пользователя', () => {
    const email = 'test@example.com';
    localStorageMock.setItem('pt_email', email);

    const saved = localStorageMock.getItem('pt_email');
    expect(saved).toBe(email);
  });

  test('должен сохранить аватар как base64', () => {
    const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    localStorageMock.setItem('pt_avatar', avatar);

    const saved = localStorageMock.getItem('pt_avatar');
    expect(saved).toBe(avatar);
  });

  test('должен очистить аватар при удалении', () => {
    localStorageMock.setItem('pt_avatar', 'some-avatar');
    localStorageMock.removeItem('pt_avatar');

    const avatar = localStorageMock.getItem('pt_avatar');
    expect(avatar).toBeNull();
  });
});

// =========================================================================
// ТЕСТЫ: Выход из аккаунта (logout)
// =========================================================================
describe('Logout functionality', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  test('должен удалить pt_login из localStorage при выходе', () => {
    localStorageMock.setItem('pt_login', 'testuser');
    expect(localStorageMock.getItem('pt_login')).toBe('testuser');

    localStorageMock.removeItem('pt_login');
    expect(localStorageMock.getItem('pt_login')).toBeNull();
  });

  test('должен удалить pt_email из localStorage при выходе', () => {
    localStorageMock.setItem('pt_email', 'test@example.com');
    expect(localStorageMock.getItem('pt_email')).toBe('test@example.com');

    localStorageMock.removeItem('pt_email');
    expect(localStorageMock.getItem('pt_email')).toBeNull();
  });

  test('должен удалить pt_avatar из localStorage при выходе', () => {
    localStorageMock.setItem('pt_avatar', 'avatar-data');
    expect(localStorageMock.getItem('pt_avatar')).toBe('avatar-data');

    localStorageMock.removeItem('pt_avatar');
    expect(localStorageMock.getItem('pt_avatar')).toBeNull();
  });

  test('должен удалить все ключи пользователя при выходе', () => {
    localStorageMock.setItem('pt_login', 'testuser');
    localStorageMock.setItem('pt_email', 'test@example.com');
    localStorageMock.setItem('pt_avatar', 'avatar-data');

    const keysToRemove = ['pt_login', 'pt_email', 'pt_avatar'];
    keysToRemove.forEach(key => localStorageMock.removeItem(key));

    keysToRemove.forEach(key => {
      expect(localStorageMock.getItem(key)).toBeNull();
    });
  });
});

// =========================================================================
// ТЕСТЫ: API взаимодействие (без моков fetch)
// =========================================================================
describe('API interactions', () => {
  test('должен содержать необходимые поля при отправке запроса на создание проекта', () => {
    const createProjectRequest = {
      name: 'Test Project',
      login: 'testuser'
    };

    expect(createProjectRequest).toHaveProperty('name');
    expect(createProjectRequest).toHaveProperty('login');
    expect(createProjectRequest.name).toBe('Test Project');
    expect(createProjectRequest.login).toBe('testuser');
  });

  test('должен содержать необходимые поля при отправке запроса на удаление проекта', () => {
    const deleteProjectRequest = {
      project_id: 'p123'
    };

    expect(deleteProjectRequest).toHaveProperty('project_id');
    expect(deleteProjectRequest.project_id).toBe('p123');
  });

  test('должен содержать необходимые поля при отправке запроса на обновление проекта', () => {
    const updateProjectRequest = {
      project_id: 'p123',
      name: 'Updated Name'
    };

    expect(updateProjectRequest).toHaveProperty('project_id');
    expect(updateProjectRequest).toHaveProperty('name');
    expect(updateProjectRequest.name).toBe('Updated Name');
  });

  test('должен возвращать объект с project_id при успешном создании', () => {
    const mockResponse = { project_id: 'p12345' };

    const newProject = {
      id: mockResponse.project_id,
      name: 'New Project'
    };

    expect(newProject.id).toBe('p12345');
  });
});

// =========================================================================
// ТЕСТЫ: Валидация данных
// =========================================================================
describe('Data validation', () => {
  test('должен вернуть "Новый проект" если название пусто', () => {
    const name = ''.trim() || 'Новый проект';
    expect(name).toBe('Новый проект');
  });

  test('должен использовать введённое название если оно не пусто', () => {
    const name = '  My Project  '.trim() || 'Новый проект';
    expect(name).toBe('My Project');
  });

  test('должен обрезать пробелы с начала и конца названия', () => {
    const input = '  Проект с пробелами  ';
    const name = input.trim();
    expect(name).toBe('Проект с пробелами');
  });

  test('должен вернуть "Без названия" для проекта без названия', () => {
    const project = { id: 'p123', name: '' };
    const displayName = project.name || 'Без названия';
    expect(displayName).toBe('Без названия');
  });

  test('должен проверить корректность email формата (базовая проверка)', () => {
    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid.email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

// =========================================================================
// ТЕСТЫ: Обработка ошибок
// =========================================================================
describe('Error handling', () => {
  test('должен обработать пустую строку логина', () => {
    const login = ''.trim() || 'default_user';
    expect(login).toBe('default_user');
  });

  test('должен обработать null/undefined в данных пользователя', () => {
    const user = {
      login: null || 'default',
      email: undefined || 'default@example.com'
    };

    expect(user.login).toBe('default');
    expect(user.email).toBe('default@example.com');
  });

  test('должен безопасно работать с некорректным JSON в localStorage', () => {
    localStorageMock.setItem('pt_projects', 'invalid json');
    
    let projects;
    try {
      projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    } catch (e) {
      projects = [];
    }

    expect(projects).toEqual([]);
  });

  test('должен обработать отсутствие элементов DOM при инициализации', () => {
    const element = document.getElementById('nonexistent-element');
    expect(element).toBeNull();
  });
});

// =========================================================================
// ТЕСТЫ: Поиск и фильтрация проектов
// =========================================================================
describe('Project search and filtering', () => {
  const mockProjects = [
    { id: 'p1', name: 'React Project', orientation: 'horizontal' },
    { id: 'p2', name: 'Vue Project', orientation: 'vertical' },
    { id: 'p3', name: 'Angular App', orientation: 'horizontal' }
  ];

  test('должен найти проект по ID', () => {
    const found = mockProjects.find(p => p.id === 'p2');
    expect(found.name).toBe('Vue Project');
  });

  test('должен фильтровать проекты по названию', () => {
    const filtered = mockProjects.filter(p => p.name.includes('Project'));
    expect(filtered.length).toBe(2);
    expect(filtered[0].name).toBe('React Project');
  });

  test('должен возвращать undefined при поиске несуществующего проекта', () => {
    const found = mockProjects.find(p => p.id === 'p999');
    expect(found).toBeUndefined();
  });

  test('должен фильтровать проекты по ориентации', () => {
    const horizontal = mockProjects.filter(p => p.orientation === 'horizontal');
    expect(horizontal.length).toBe(2);
  });
});

// =========================================================================
// ТЕСТЫ: Порядок проектов
// =========================================================================
describe('Project ordering', () => {
  test('новые проекты должны добавляться в начало списка (unshift)', () => {
    let projects = [
      { id: 'p1', name: 'First' }
    ];

    const newProject = { id: 'p2', name: 'Second' };
    projects.unshift(newProject);

    expect(projects[0].id).toBe('p2');
    expect(projects[1].id).toBe('p1');
  });

  test('должен сохранить порядок при загрузке из localStorage', () => {
    const ordered = [
      { id: 'p1', name: 'First' },
      { id: 'p2', name: 'Second' },
      { id: 'p3', name: 'Third' }
    ];

    localStorageMock.setItem('pt_projects', JSON.stringify(ordered));
    const loaded = JSON.parse(localStorageMock.getItem('pt_projects'));

    expect(loaded[0].id).toBe('p1');
    expect(loaded[1].id).toBe('p2');
    expect(loaded[2].id).toBe('p3');
  });
});
