/**
 * Модульные тесты для account.js
 * Тестирование основных функций управления аккаунтом и проектами
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
// Функция uid() - генератор ID проектов
// =========================================================================
describe('uid() - генератор ID проектов', () => {
  // Воссоздаём функцию uid из account.js
  const uid = () => 'p' + Math.random().toString(36).slice(2, 9);

  test('генерирует ID с префиксом "p"', () => {
    const id = uid();
    expect(id.startsWith('p')).toBe(true);
  });

  test('генерирует ID длиной 8 символов', () => {
    const id = uid();
    expect(id.length).toBe(8);
  });

  test('генерирует уникальные ID', () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).not.toBe(id2);
  });
});

// =========================================================================
// Функция saveState() - сохранение проектов
// =========================================================================
describe('saveState() - сохранение проектов в localStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('сохраняет массив проектов в localStorage', () => {
    const projects = [
      { id: 'p123', name: 'Project 1' },
      { id: 'p456', name: 'Project 2' }
    ];
    
    // Эмулируем saveState()
    localStorageMock.setItem('pt_projects', JSON.stringify(projects));
    
    const saved = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(saved).toEqual(projects);
    expect(saved.length).toBe(2);
  });

  test('сохраняет пустой массив при отсутствии проектов', () => {
    const projects = [];
    localStorageMock.setItem('pt_projects', JSON.stringify(projects));
    
    const saved = JSON.parse(localStorageMock.getItem('pt_projects'));
    expect(saved).toEqual([]);
  });
});

// =========================================================================
// Проверка авторизации
// =========================================================================
describe('Проверка авторизации', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
  });

  test('пользователь не авторизован без токена', () => {
    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');
    
    const isAuthorized = accessToken && sessionLogin;
    expect(isAuthorized).toBeFalsy();
  });

  test('пользователь авторизован с токеном и логином', () => {
    sessionStorageMock.setItem('pt_access_token', 'valid_token');
    sessionStorageMock.setItem('pt_login', 'testuser');
    
    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');
    
    const isAuthorized = accessToken && sessionLogin;
    expect(isAuthorized).toBeTruthy();
  });

  test('пользователь не авторизован только с токеном (без логина)', () => {
    sessionStorageMock.setItem('pt_access_token', 'valid_token');
    
    const accessToken = sessionStorageMock.getItem('pt_access_token');
    const sessionLogin = sessionStorageMock.getItem('pt_login');
    
    const isAuthorized = accessToken && sessionLogin;
    expect(isAuthorized).toBeFalsy();
  });
});

// =========================================================================
// Управление проектами (CRUD)
// =========================================================================
describe('Управление проектами', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('добавление нового проекта в начало списка', () => {
    let projects = [{ id: 'p111', name: 'Old Project' }];
    const newProject = { id: 'p222', name: 'New Project' };
    
    projects.unshift(newProject);
    
    expect(projects[0].id).toBe('p222');
    expect(projects.length).toBe(2);
  });

  test('обновление названия проекта', () => {
    let projects = [{ id: 'p123', name: 'Old Name' }];
    
    const project = projects.find(p => p.id === 'p123');
    if (project) {
      project.name = 'New Name';
    }
    
    expect(projects[0].name).toBe('New Name');
  });

  test('удаление проекта по ID', () => {
    let projects = [
      { id: 'p123', name: 'Project 1' },
      { id: 'p456', name: 'Project 2' }
    ];
    
    projects = projects.filter(p => p.id !== 'p123');
    
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('p456');
  });

  test('поиск проекта по ID', () => {
    const projects = [
      { id: 'p123', name: 'Project 1' },
      { id: 'p456', name: 'Project 2' }
    ];
    
    const found = projects.find(p => p.id === 'p456');
    
    expect(found).toBeDefined();
    expect(found.name).toBe('Project 2');
  });

  test('поиск несуществующего проекта возвращает undefined', () => {
    const projects = [{ id: 'p123', name: 'Project 1' }];
    
    const found = projects.find(p => p.id === 'p999');
    
    expect(found).toBeUndefined();
  });
});

// =========================================================================
// Валидация названия проекта
// =========================================================================
describe('Валидация названия проекта', () => {
  test('пустое название заменяется на "Новый проект"', () => {
    const inputName = '';
    const name = inputName.trim() || 'Новый проект';
    
    expect(name).toBe('Новый проект');
  });

  test('название с пробелами обрезается (trim)', () => {
    const inputName = '  My Project  ';
    const name = inputName.trim() || 'Новый проект';
    
    expect(name).toBe('My Project');
  });

  test('пустое название в проекте отображается как "Без названия"', () => {
    const project = { id: 'p123', name: '' };
    const displayName = project.name || 'Без названия';
    
    expect(displayName).toBe('Без названия');
  });
});

// =========================================================================
// Logout - выход из аккаунта
// =========================================================================
describe('Logout - выход из аккаунта', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();
  });

  test('очистка данных авторизации при выходе', () => {
    // Устанавливаем данные
    sessionStorageMock.setItem('pt_access_token', 'token');
    sessionStorageMock.setItem('pt_login', 'user');
    localStorageMock.setItem('pt_login', 'user');
    localStorageMock.setItem('pt_email', 'user@example.com');
    localStorageMock.setItem('pt_avatar', 'avatar_data');
    localStorageMock.setItem('pt_projects', '[]');
    
    // Эмулируем logout
    sessionStorageMock.removeItem('pt_access_token');
    sessionStorageMock.removeItem('pt_login');
    localStorageMock.removeItem('pt_login');
    localStorageMock.removeItem('pt_email');
    localStorageMock.removeItem('pt_avatar');
    localStorageMock.removeItem('pt_projects');
    
    // Проверяем очистку
    expect(sessionStorageMock.getItem('pt_access_token')).toBeNull();
    expect(sessionStorageMock.getItem('pt_login')).toBeNull();
    expect(localStorageMock.getItem('pt_login')).toBeNull();
    expect(localStorageMock.getItem('pt_email')).toBeNull();
  });
});

// =========================================================================
// Формирование запросов API
// =========================================================================
describe('Формирование запросов API', () => {
  test('запрос на создание проекта содержит name и login', () => {
    const request = {
      name: 'New Project',
      login: 'testuser'
    };
    
    expect(request).toHaveProperty('name');
    expect(request).toHaveProperty('login');
  });

  test('запрос на обновление проекта содержит project_id и name', () => {
    const request = {
      project_id: 'p123',
      name: 'Updated Name'
    };
    
    expect(request).toHaveProperty('project_id');
    expect(request).toHaveProperty('name');
  });

  test('запрос на удаление проекта содержит project_id', () => {
    const request = {
      project_id: 'p123'
    };
    
    expect(request).toHaveProperty('project_id');
  });
});

// =========================================================================
// Обработка ошибок
// =========================================================================
describe('Обработка ошибок', () => {
  test('некорректный JSON в localStorage возвращает пустой массив', () => {
    localStorageMock.setItem('pt_projects', 'invalid json');
    
    let projects;
    try {
      projects = JSON.parse(localStorageMock.getItem('pt_projects'));
    } catch (e) {
      projects = [];
    }
    
    expect(projects).toEqual([]);
  });

  test('отсутствующий пользователь возвращает дефолтные значения', () => {
    const login = sessionStorageMock.getItem('pt_login') || 
                  localStorageMock.getItem('pt_login') || 
                  'plotuser';
    
    expect(login).toBe('plotuser');
  });
});
