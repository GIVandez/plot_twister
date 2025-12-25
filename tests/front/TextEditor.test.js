/**
 * Модульные тесты для TextEditor.js
 * Тестирование основных функций текстового редактора
 */

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ==================== ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ ====================

/**
 * Управление стеком undo/redo
 */
class UndoRedoManager {
    constructor(limit = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.limit = limit;
    }

    saveState(content) {
        this.undoStack.push(content);
        this.redoStack = [];
        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }
    }

    undo(currentContent) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(currentContent);
        return this.undoStack.pop();
    }

    redo(currentContent) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(currentContent);
        return this.redoStack.pop();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }
}

/**
 * Извлечение plain text из HTML
 */
function getPlainText(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let text = '';
    tempDiv.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            text += node.textContent + '\n';
        }
    });
    
    return text.trim();
}

/**
 * Управление темой приложения
 */
function getTheme(savedTheme) {
    return savedTheme || 'dark';
}

function toggleTheme(currentTheme) {
    return currentTheme === 'light' ? 'dark' : 'light';
}

/**
 * Управление темой страницы
 */
function getPageTheme(savedTheme) {
    return savedTheme || 'dark';
}

function togglePageTheme(currentTheme) {
    return currentTheme === 'light' ? 'dark' : 'light';
}

/**
 * Валидация выравнивания текста
 */
function isValidAlignment(alignment) {
    return ['left', 'center', 'right'].includes(alignment);
}

/**
 * Валидация формата текста
 */
function isValidFormat(format) {
    return ['bold', 'italic'].includes(format);
}

/**
 * Парсинг параметров URL
 */
function parsePageParams(searchString) {
    const params = new URLSearchParams(searchString);
    return {
        pageNum: Number(params.get('pageNum')) || 1,
        pageId: params.get('pageId') ? Number(params.get('pageId')) : null,
        projectId: params.get('project') || '1'
    };
}

// ==================== ТЕСТЫ ====================

describe('UndoRedoManager - управление историей', () => {
    let manager;

    beforeEach(() => {
        manager = new UndoRedoManager(50);
    });

    test('сохранение состояния добавляет в стек undo', () => {
        manager.saveState('text1');
        expect(manager.canUndo()).toBe(true);
    });

    test('сохранение очищает стек redo', () => {
        manager.saveState('text1');
        manager.undo('text2');
        manager.saveState('text3');
        expect(manager.canRedo()).toBe(false);
    });

    test('undo возвращает предыдущее состояние', () => {
        manager.saveState('text1');
        const result = manager.undo('text2');
        expect(result).toBe('text1');
    });

    test('undo при пустом стеке возвращает null', () => {
        const result = manager.undo('text');
        expect(result).toBeNull();
    });

    test('redo возвращает следующее состояние', () => {
        manager.saveState('text1');
        manager.undo('text2');
        const result = manager.redo('text1');
        expect(result).toBe('text2');
    });

    test('redo при пустом стеке возвращает null', () => {
        const result = manager.redo('text');
        expect(result).toBeNull();
    });

    test('ограничение размера стека undo', () => {
        const smallManager = new UndoRedoManager(3);
        smallManager.saveState('1');
        smallManager.saveState('2');
        smallManager.saveState('3');
        smallManager.saveState('4');
        expect(smallManager.undoStack.length).toBe(3);
        expect(smallManager.undoStack[0]).toBe('2');
    });
});

describe('getPlainText - извлечение текста из HTML', () => {
    test('извлекает текст из простого HTML', () => {
        const html = '<p>Hello World</p>';
        expect(getPlainText(html)).toBe('Hello World');
    });

    test('извлекает текст с форматированием', () => {
        const html = '<b>Bold</b> and <i>italic</i>';
        expect(getPlainText(html)).toContain('Bold');
        expect(getPlainText(html)).toContain('italic');
    });

    test('возвращает пустую строку для пустого HTML', () => {
        expect(getPlainText('')).toBe('');
    });

    test('обрабатывает вложенные элементы', () => {
        const html = '<div><span>Nested</span></div>';
        expect(getPlainText(html)).toBe('Nested');
    });
});

describe('getTheme / toggleTheme - управление темой', () => {
    test('возвращает dark по умолчанию', () => {
        expect(getTheme(null)).toBe('dark');
    });

    test('возвращает сохраненную тему', () => {
        expect(getTheme('light')).toBe('light');
    });

    test('переключает с light на dark', () => {
        expect(toggleTheme('light')).toBe('dark');
    });

    test('переключает с dark на light', () => {
        expect(toggleTheme('dark')).toBe('light');
    });
});

describe('getPageTheme / togglePageTheme - управление темой страницы', () => {
    test('возвращает dark по умолчанию', () => {
        expect(getPageTheme(null)).toBe('dark');
    });

    test('возвращает сохраненную тему страницы', () => {
        expect(getPageTheme('light')).toBe('light');
    });

    test('переключает тему страницы с light на dark', () => {
        expect(togglePageTheme('light')).toBe('dark');
    });

    test('переключает тему страницы с dark на light', () => {
        expect(togglePageTheme('dark')).toBe('light');
    });
});

describe('isValidAlignment - валидация выравнивания', () => {
    test('left является допустимым', () => {
        expect(isValidAlignment('left')).toBe(true);
    });

    test('center является допустимым', () => {
        expect(isValidAlignment('center')).toBe(true);
    });

    test('right является допустимым', () => {
        expect(isValidAlignment('right')).toBe(true);
    });

    test('justify не является допустимым', () => {
        expect(isValidAlignment('justify')).toBe(false);
    });

    test('пустая строка не является допустимой', () => {
        expect(isValidAlignment('')).toBe(false);
    });
});

describe('isValidFormat - валидация формата', () => {
    test('bold является допустимым', () => {
        expect(isValidFormat('bold')).toBe(true);
    });

    test('italic является допустимым', () => {
        expect(isValidFormat('italic')).toBe(true);
    });

    test('underline не является допустимым', () => {
        expect(isValidFormat('underline')).toBe(false);
    });

    test('пустая строка не является допустимой', () => {
        expect(isValidFormat('')).toBe(false);
    });
});

describe('parsePageParams - парсинг URL параметров', () => {
    test('парсит все параметры', () => {
        const result = parsePageParams('?pageNum=5&pageId=123&project=42');
        expect(result.pageNum).toBe(5);
        expect(result.pageId).toBe(123);
        expect(result.projectId).toBe('42');
    });

    test('возвращает значения по умолчанию при отсутствии параметров', () => {
        const result = parsePageParams('');
        expect(result.pageNum).toBe(1);
        expect(result.pageId).toBeNull();
        expect(result.projectId).toBe('1');
    });

    test('обрабатывает частичные параметры', () => {
        const result = parsePageParams('?pageNum=3');
        expect(result.pageNum).toBe(3);
        expect(result.pageId).toBeNull();
        expect(result.projectId).toBe('1');
    });

    test('некорректный pageNum возвращает 1', () => {
        const result = parsePageParams('?pageNum=abc');
        expect(result.pageNum).toBe(1);
    });
});
