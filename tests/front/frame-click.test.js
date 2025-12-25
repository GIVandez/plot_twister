/**
 * Модульные тесты для frame-click.js
 * Тестирование функций обработки кликов по кадрам
 */

// ==================== ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ ====================

/**
 * Проверка, нужно ли игнорировать клик
 */
function shouldIgnoreClick(target) {
    if (!target) return true;
    
    // Проверяем классы и родительские элементы
    const ignoreSelectors = [
        '.frame-delete-btn',
        '.frame-time-edit',
        '.frame-button',
        '.frame-description',
        '.frame-description-edit'
    ];
    
    // Проверяем класс элемента напрямую
    if (target.classList && target.classList.contains('frame-time-edit')) {
        return true;
    }
    
    // Проверяем родительские элементы
    for (const selector of ignoreSelectors) {
        if (target.closest && target.closest(selector)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Получение индекса кадра из элемента
 */
function getFrameIndex(frameElement) {
    if (!frameElement || !frameElement.dataset) return null;
    const index = parseInt(frameElement.dataset.index, 10);
    return isNaN(index) ? null : index;
}

/**
 * Проверка, открыта ли информация для данного кадра
 */
function isFrameInfoAlreadyOpen(existingFrameId, currentFrameId) {
    if (!existingFrameId || !currentFrameId) return false;
    return String(existingFrameId) === String(currentFrameId);
}

/**
 * Проверка, находится ли клик внутри кадра или панели информации
 */
function isClickInsideFrameArea(target) {
    if (!target || !target.closest) return false;
    return !!(target.closest('.frame') || target.closest('.frame-info-display'));
}

/**
 * Проверка наличия store
 */
function isStoreValid(store) {
    if (!store) return false;
    return typeof store.getFrameByIndex === 'function';
}

/**
 * Управление классом выделения
 */
function updateFrameSelection(previousFrame, currentFrame) {
    if (previousFrame && previousFrame !== currentFrame) {
        previousFrame.classList.remove('frame-selected');
    }
    if (currentFrame) {
        currentFrame.classList.add('frame-selected');
    }
    return currentFrame;
}

// ==================== ТЕСТЫ ====================

describe('shouldIgnoreClick - игнорирование кликов', () => {
    test('возвращает true для null', () => {
        expect(shouldIgnoreClick(null)).toBe(true);
    });

    test('возвращает true для undefined', () => {
        expect(shouldIgnoreClick(undefined)).toBe(true);
    });

    test('возвращает true для элемента с классом frame-time-edit', () => {
        const el = document.createElement('input');
        el.classList.add('frame-time-edit');
        expect(shouldIgnoreClick(el)).toBe(true);
    });

    test('возвращает false для обычного элемента', () => {
        const el = document.createElement('div');
        expect(shouldIgnoreClick(el)).toBe(false);
    });

    test('возвращает true для потомка frame-delete-btn', () => {
        const parent = document.createElement('button');
        parent.classList.add('frame-delete-btn');
        const child = document.createElement('span');
        parent.appendChild(child);
        expect(shouldIgnoreClick(child)).toBe(true);
    });
});

describe('getFrameIndex - получение индекса кадра', () => {
    test('возвращает индекс из dataset', () => {
        const el = document.createElement('div');
        el.dataset.index = '5';
        expect(getFrameIndex(el)).toBe(5);
    });

    test('возвращает null для элемента без dataset.index', () => {
        const el = document.createElement('div');
        expect(getFrameIndex(el)).toBeNull();
    });

    test('возвращает null для null', () => {
        expect(getFrameIndex(null)).toBeNull();
    });

    test('возвращает null для некорректного значения', () => {
        const el = document.createElement('div');
        el.dataset.index = 'abc';
        expect(getFrameIndex(el)).toBeNull();
    });

    test('возвращает 0 для index="0"', () => {
        const el = document.createElement('div');
        el.dataset.index = '0';
        expect(getFrameIndex(el)).toBe(0);
    });
});

describe('isFrameInfoAlreadyOpen - проверка открытой информации', () => {
    test('возвращает true для одинаковых ID', () => {
        expect(isFrameInfoAlreadyOpen('123', '123')).toBe(true);
    });

    test('возвращает true для ID разных типов', () => {
        expect(isFrameInfoAlreadyOpen(123, '123')).toBe(true);
    });

    test('возвращает false для разных ID', () => {
        expect(isFrameInfoAlreadyOpen('123', '456')).toBe(false);
    });

    test('возвращает false для null existingFrameId', () => {
        expect(isFrameInfoAlreadyOpen(null, '123')).toBe(false);
    });

    test('возвращает false для null currentFrameId', () => {
        expect(isFrameInfoAlreadyOpen('123', null)).toBe(false);
    });
});

describe('isClickInsideFrameArea - клик внутри области кадра', () => {
    test('возвращает false для null', () => {
        expect(isClickInsideFrameArea(null)).toBe(false);
    });

    test('возвращает true для элемента внутри .frame', () => {
        const frame = document.createElement('div');
        frame.classList.add('frame');
        const child = document.createElement('span');
        frame.appendChild(child);
        expect(isClickInsideFrameArea(child)).toBe(true);
    });

    test('возвращает true для элемента внутри .frame-info-display', () => {
        const info = document.createElement('div');
        info.classList.add('frame-info-display');
        const child = document.createElement('span');
        info.appendChild(child);
        expect(isClickInsideFrameArea(child)).toBe(true);
    });

    test('возвращает false для элемента вне области', () => {
        const el = document.createElement('div');
        expect(isClickInsideFrameArea(el)).toBe(false);
    });
});

describe('updateFrameSelection - управление выделением', () => {
    test('добавляет класс frame-selected к текущему кадру', () => {
        const current = document.createElement('div');
        updateFrameSelection(null, current);
        expect(current.classList.contains('frame-selected')).toBe(true);
    });

    test('убирает класс у предыдущего кадра', () => {
        const previous = document.createElement('div');
        previous.classList.add('frame-selected');
        const current = document.createElement('div');
        updateFrameSelection(previous, current);
        expect(previous.classList.contains('frame-selected')).toBe(false);
    });

    test('не убирает класс если это тот же кадр', () => {
        const frame = document.createElement('div');
        frame.classList.add('frame-selected');
        updateFrameSelection(frame, frame);
        expect(frame.classList.contains('frame-selected')).toBe(true);
    });

    test('возвращает текущий кадр', () => {
        const current = document.createElement('div');
        const result = updateFrameSelection(null, current);
        expect(result).toBe(current);
    });
});
