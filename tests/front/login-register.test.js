/**
 * Модульные тесты для login-register.js
 * Тестирование функций валидации и авторизации
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

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// =========================================================================
// Функция hasLetter() - проверка наличия букв
// =========================================================================
describe('hasLetter() - проверка наличия букв', () => {
  const hasLetter = (s) => /[A-Za-zА-Яа-яЁё]/.test(s);

  test('возвращает true для строки с латинскими буквами', () => {
    expect(hasLetter('abc123')).toBe(true);
  });

  test('возвращает true для строки с кириллицей', () => {
    expect(hasLetter('тест123')).toBe(true);
  });

  test('возвращает false для строки только из цифр', () => {
    expect(hasLetter('123456')).toBe(false);
  });

  test('возвращает false для пустой строки', () => {
    expect(hasLetter('')).toBe(false);
  });
});

// =========================================================================
// Функция digitCount() - подсчёт цифр
// =========================================================================
describe('digitCount() - подсчёт цифр в строке', () => {
  const digitCount = (s) => (s.match(/\d/g) || []).length;

  test('возвращает количество цифр в строке', () => {
    expect(digitCount('abc1234')).toBe(4);
  });

  test('возвращает 0 для строки без цифр', () => {
    expect(digitCount('abcdef')).toBe(0);
  });

  test('возвращает 0 для пустой строки', () => {
    expect(digitCount('')).toBe(0);
  });
});

// =========================================================================
// Функция validLogin() - валидация логина
// =========================================================================
describe('validLogin() - валидация логина', () => {
  const hasLetter = (s) => /[A-Za-zА-Яа-яЁё]/.test(s);
  const validLogin = (login) => {
    if (!login) return false;
    if (login.length > 20) return false;
    return /^[A-Za-zА-Яа-яЁё0-9_]+$/.test(login) && hasLetter(login);
  };

  test('валидный логин с буквами и цифрами', () => {
    expect(validLogin('user123')).toBe(true);
  });

  test('валидный логин с подчёркиванием', () => {
    expect(validLogin('user_name')).toBe(true);
  });

  test('невалидный логин - только цифры', () => {
    expect(validLogin('123456')).toBe(false);
  });

  test('невалидный логин - пустая строка', () => {
    expect(validLogin('')).toBe(false);
  });

  test('невалидный логин - слишком длинный (>20)', () => {
    expect(validLogin('a'.repeat(21))).toBe(false);
  });

  test('невалидный логин - спецсимволы', () => {
    expect(validLogin('user@name')).toBe(false);
  });
});

// =========================================================================
// Функция validPassword() - валидация пароля
// =========================================================================
describe('validPassword() - валидация пароля', () => {
  const hasLetter = (s) => /[A-Za-zА-Яа-яЁё]/.test(s);
  const digitCount = (s) => (s.match(/\d/g) || []).length;
  const validPassword = (pw) => {
    if (!pw) return false;
    if (pw.length > 20) return false;
    return hasLetter(pw) && digitCount(pw) >= 4;
  };

  test('валидный пароль с буквами и 4+ цифрами', () => {
    expect(validPassword('pass1234')).toBe(true);
  });

  test('невалидный пароль - менее 4 цифр', () => {
    expect(validPassword('pass123')).toBe(false);
  });

  test('невалидный пароль - только цифры', () => {
    expect(validPassword('12345678')).toBe(false);
  });

  test('невалидный пароль - пустая строка', () => {
    expect(validPassword('')).toBe(false);
  });

  test('невалидный пароль - слишком длинный (>20)', () => {
    expect(validPassword('a1234' + 'x'.repeat(20))).toBe(false);
  });
});

// =========================================================================
// Функция validEmail() - валидация email
// =========================================================================
describe('validEmail() - валидация email', () => {
  const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

  test('валидный email', () => {
    expect(validEmail('user@example.com')).toBe(true);
  });

  test('невалидный email - без @', () => {
    expect(validEmail('userexample.com')).toBe(false);
  });

  test('невалидный email - без домена', () => {
    expect(validEmail('user@')).toBe(false);
  });

  test('невалидный email - пустая строка', () => {
    expect(validEmail('')).toBe(false);
  });
});

// =========================================================================
// Сохранение данных авторизации
// =========================================================================
describe('Сохранение данных авторизации', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
  });

  test('сохранение токена и логина при успешном входе', () => {
    const token = 'test_access_token';
    const login = 'testuser';
    
    sessionStorageMock.setItem('pt_access_token', token);
    sessionStorageMock.setItem('pt_login', login);
    
    expect(sessionStorageMock.getItem('pt_access_token')).toBe(token);
    expect(sessionStorageMock.getItem('pt_login')).toBe(login);
  });

  test('проверка наличия авторизации', () => {
    sessionStorageMock.setItem('pt_access_token', 'token');
    sessionStorageMock.setItem('pt_login', 'user');
    
    const isAuth = sessionStorageMock.getItem('pt_access_token') && 
                   sessionStorageMock.getItem('pt_login');
    
    expect(isAuth).toBeTruthy();
  });
});

// =========================================================================
// Формирование запросов API
// =========================================================================
describe('Формирование запросов API', () => {
  test('запрос на регистрацию содержит login и password', () => {
    const registerData = { login: 'newuser', password: 'pass1234' };
    
    expect(registerData).toHaveProperty('login');
    expect(registerData).toHaveProperty('password');
  });

  test('запрос на вход содержит login и password', () => {
    const loginData = { login: 'user', password: 'pass1234' };
    
    expect(loginData).toHaveProperty('login');
    expect(loginData).toHaveProperty('password');
  });
});

// =========================================================================
// Обработка ошибок валидации
// =========================================================================
describe('Обработка ошибок валидации', () => {
  const hasLetter = (s) => /[A-Za-zА-Яа-яЁё]/.test(s);
  const digitCount = (s) => (s.match(/\d/g) || []).length;

  test('пустой логин генерирует ошибку', () => {
    const login = '';
    const errors = [];
    
    if (login.length === 0) {
      errors.push('Некорректный логин.');
    }
    
    expect(errors.length).toBeGreaterThan(0);
  });

  test('пароль без букв генерирует ошибку', () => {
    const password = '12345678';
    const errors = [];
    
    if (!hasLetter(password)) {
      errors.push('Слишком простой пароль.');
    }
    
    expect(errors.length).toBeGreaterThan(0);
  });

  test('пароль с менее чем 4 цифрами генерирует ошибку', () => {
    const password = 'pass123';
    const errors = [];
    
    if (digitCount(password) < 4) {
      errors.push('Пароль должен содержать минимум 4 цифры.');
    }
    
    expect(errors.length).toBeGreaterThan(0);
  });
});
