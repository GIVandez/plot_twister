/**
 * Модульные тесты для PageList.js
 * Тестирование основных функций карусели страниц
 */

/**
 * Функция плавности анимации (ease-out cubic)
 */
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Обрезка текста с добавлением многоточия
 */
function truncateText(text, maxLength = 2000) {
    if (!text) return '';
    const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength).trim() + '...';
}

/**
 * Вычисление трансформации карточки по смещению
 */
function getCardTransform(offset, cardWidth) {
    const absOffset = Math.abs(offset);
    
    if (absOffset > 2.5) {
        const sign = offset < 0 ? -1 : 1;
        return {
            x: sign * cardWidth * 1.95,
            z: -340,
            rotateY: 0,
            brightness: 0,
            zIndex: 0,
            pointerEvents: 'none'
        };
    }
    
    let x, z, rotateY = 0, brightness;
    
    if (absOffset <= 0.001) {
        x = 0;
        z = 0;
        brightness = 1;
    } else if (absOffset <= 1) {
        const t = absOffset;
        const sign = offset < 0 ? -1 : 1;
        x = sign * cardWidth * 0.85 * t;
        z = -140 * t;
        brightness = 1 - 0.3 * t;
    } else if (absOffset <= 2) {
        const t = absOffset - 1;
        const sign = offset < 0 ? -1 : 1;
        x = sign * cardWidth * (0.85 + 0.5 * t);
        z = -140 - 120 * t;
        brightness = 0.7 - 0.3 * t;
    } else {
        const t = Math.min(absOffset - 2, 1);
        const sign = offset < 0 ? -1 : 1;
        x = sign * cardWidth * (1.35 + 0.6 * t);
        z = -260 - 80 * t;
        brightness = 0.4 * (1 - t);
    }
    
    const zIndex = Math.max(0, 10 - Math.floor(absOffset * 3));
    
    return { x, z, rotateY, brightness, zIndex, pointerEvents: absOffset < 2.5 ? 'auto' : 'none' };
}

/**
 * Получение видимого диапазона карточек
 */
function getVisibleRange(position, totalPages) {
    const center = position;
    const base = Math.floor(center);
    const start = Math.max(0, base - 4);
    const end = Math.min(totalPages - 1, base + 4);
    return { start, end };
}

// ==================== ТЕСТЫ ====================

describe('easeOutCubic - функция плавности анимации', () => {
    test('возвращает 0 при t=0', () => {
        expect(easeOutCubic(0)).toBe(0);
    });

    test('возвращает 1 при t=1', () => {
        expect(easeOutCubic(1)).toBe(1);
    });

    test('возвращает 0.5 при t≈0.2063', () => {
        const t = 1 - Math.pow(0.5, 1/3);
        expect(easeOutCubic(t)).toBeCloseTo(0.5, 5);
    });

    test('значение на середине > 0.5 (ease-out)', () => {
        expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    });
});

describe('truncateText - обрезка текста', () => {
    test('возвращает пустую строку для null', () => {
        expect(truncateText(null)).toBe('');
    });

    test('возвращает пустую строку для undefined', () => {
        expect(truncateText(undefined)).toBe('');
    });

    test('не обрезает короткий текст', () => {
        expect(truncateText('Hello', 10)).toBe('Hello');
    });

    test('обрезает длинный текст с многоточием', () => {
        expect(truncateText('Hello World', 5)).toBe('Hello...');
    });

    test('заменяет переносы строк на пробелы', () => {
        expect(truncateText('Hello\n\nWorld', 100)).toBe('Hello World');
    });

    test('удаляет лишние пробелы', () => {
        expect(truncateText('Hello    World', 100)).toBe('Hello World');
    });
});

describe('getCardTransform - трансформация карточки', () => {
    const cardWidth = 400;

    test('центральная карточка (offset=0)', () => {
        const result = getCardTransform(0, cardWidth);
        expect(result.x).toBe(0);
        expect(result.z).toBe(0);
        expect(result.brightness).toBe(1);
    });

    test('карточка справа (offset=1)', () => {
        const result = getCardTransform(1, cardWidth);
        expect(result.x).toBeGreaterThan(0);
        expect(result.z).toBeLessThan(0);
        expect(result.brightness).toBeLessThan(1);
    });

    test('карточка слева (offset=-1)', () => {
        const result = getCardTransform(-1, cardWidth);
        expect(result.x).toBeLessThan(0);
        expect(result.z).toBeLessThan(0);
    });

    test('далекая карточка скрыта (offset=3)', () => {
        const result = getCardTransform(3, cardWidth);
        expect(result.brightness).toBe(0);
        expect(result.pointerEvents).toBe('none');
    });

    test('zIndex уменьшается с расстоянием', () => {
        const center = getCardTransform(0, cardWidth);
        const side = getCardTransform(1, cardWidth);
        expect(center.zIndex).toBeGreaterThan(side.zIndex);
    });
});

describe('getVisibleRange - видимый диапазон', () => {
    test('диапазон в начале списка', () => {
        const result = getVisibleRange(0, 20);
        expect(result.start).toBe(0);
        expect(result.end).toBe(4);
    });

    test('диапазон в середине списка', () => {
        const result = getVisibleRange(10, 20);
        expect(result.start).toBe(6);
        expect(result.end).toBe(14);
    });

    test('диапазон в конце списка', () => {
        const result = getVisibleRange(19, 20);
        expect(result.start).toBe(15);
        expect(result.end).toBe(19);
    });

    test('малый список полностью видим', () => {
        const result = getVisibleRange(1, 3);
        expect(result.start).toBe(0);
        expect(result.end).toBe(2);
    });
});
