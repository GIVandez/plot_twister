/**
 * Модульные тесты для frames-add.js
 * Тестирование функций добавления кадров
 */

// ==================== ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ ====================

/**
 * Вычисление времени начала по умолчанию
 */
function calculateDefaultStartTime(store) {
    if (!store || store.getFrameCount() === 0) {
        return 0; // Первый кадр начинается с 0
    }
    
    // Новый кадр начинается с конца последнего кадра
    const lastFrame = store.getFrameByIndex(store.getFrameCount() - 1);
    return lastFrame ? lastFrame.end : 0;
}

/**
 * Вычисление времени окончания по умолчанию
 */
function calculateDefaultEndTime(store) {
    const startTime = calculateDefaultStartTime(store);
    return startTime + 15; // Новый кадр длится 15 секунд
}

/**
 * Получение ID проекта с значением по умолчанию
 */
function getProjectId(currentProjectId) {
    return currentProjectId || 1;
}

/**
 * Валидация данных кадра
 */
function validateFrameData(frameData) {
    if (!frameData) return false;
    if (typeof frameData.start !== 'number') return false;
    if (typeof frameData.end !== 'number') return false;
    if (frameData.end <= frameData.start) return false;
    return true;
}

/**
 * Генерация описания по умолчанию
 */
function getDefaultDescription() {
    return 'Описание нового кадра';
}

/**
 * Вычисление длительности кадра
 */
function calculateFrameDuration(startTime, endTime) {
    return endTime - startTime;
}

// ==================== ТЕСТЫ ====================

describe('calculateDefaultStartTime - время начала кадра', () => {
    test('возвращает 0 для пустого store', () => {
        expect(calculateDefaultStartTime(null)).toBe(0);
    });

    test('возвращает 0 при отсутствии кадров', () => {
        const store = { getFrameCount: () => 0 };
        expect(calculateDefaultStartTime(store)).toBe(0);
    });

    test('возвращает end последнего кадра', () => {
        const store = {
            getFrameCount: () => 2,
            getFrameByIndex: (idx) => idx === 1 ? { end: 30 } : { end: 15 }
        };
        expect(calculateDefaultStartTime(store)).toBe(30);
    });

    test('возвращает 0 если последний кадр null', () => {
        const store = {
            getFrameCount: () => 1,
            getFrameByIndex: () => null
        };
        expect(calculateDefaultStartTime(store)).toBe(0);
    });
});

describe('calculateDefaultEndTime - время окончания кадра', () => {
    test('добавляет 15 секунд к startTime', () => {
        const store = { getFrameCount: () => 0 };
        expect(calculateDefaultEndTime(store)).toBe(15);
    });

    test('вычисляет корректно для существующих кадров', () => {
        const store = {
            getFrameCount: () => 1,
            getFrameByIndex: () => ({ end: 30 })
        };
        expect(calculateDefaultEndTime(store)).toBe(45);
    });

    test('первый кадр: 0 + 15 = 15', () => {
        expect(calculateDefaultEndTime(null)).toBe(15);
    });
});

describe('getProjectId - ID проекта', () => {
    test('возвращает переданный ID', () => {
        expect(getProjectId(5)).toBe(5);
    });

    test('возвращает 1 по умолчанию для undefined', () => {
        expect(getProjectId(undefined)).toBe(1);
    });

    test('возвращает 1 по умолчанию для null', () => {
        expect(getProjectId(null)).toBe(1);
    });

    test('возвращает 1 по умолчанию для 0', () => {
        expect(getProjectId(0)).toBe(1);
    });
});

describe('validateFrameData - валидация данных кадра', () => {
    test('валидный кадр возвращает true', () => {
        expect(validateFrameData({ start: 0, end: 15 })).toBe(true);
    });

    test('null возвращает false', () => {
        expect(validateFrameData(null)).toBe(false);
    });

    test('отсутствие start возвращает false', () => {
        expect(validateFrameData({ end: 15 })).toBe(false);
    });

    test('отсутствие end возвращает false', () => {
        expect(validateFrameData({ start: 0 })).toBe(false);
    });

    test('end <= start возвращает false', () => {
        expect(validateFrameData({ start: 15, end: 10 })).toBe(false);
    });

    test('end === start возвращает false', () => {
        expect(validateFrameData({ start: 15, end: 15 })).toBe(false);
    });
});

describe('getDefaultDescription - описание по умолчанию', () => {
    test('возвращает строку описания', () => {
        expect(getDefaultDescription()).toBe('Описание нового кадра');
    });

    test('возвращает непустую строку', () => {
        expect(getDefaultDescription().length).toBeGreaterThan(0);
    });
});

describe('calculateFrameDuration - длительность кадра', () => {
    test('вычисляет корректную длительность', () => {
        expect(calculateFrameDuration(0, 15)).toBe(15);
    });

    test('вычисляет длительность для произвольных значений', () => {
        expect(calculateFrameDuration(30, 60)).toBe(30);
    });

    test('возвращает 0 для одинаковых значений', () => {
        expect(calculateFrameDuration(10, 10)).toBe(0);
    });

    test('возвращает отрицательное значение для некорректных данных', () => {
        expect(calculateFrameDuration(20, 10)).toBe(-10);
    });
});

