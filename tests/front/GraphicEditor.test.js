/**
 * Модульные тесты для GraphicEditor.js
 * Тестирование основных утилитарных функций
 */

// Вспомогательные функции, извлеченные из GraphicEditor.js для тестирования

/**
 * Преобразует hex цвет в rgba строку
 */
function hexToRgba(hex, alpha) {
    if (!hex) hex = '#000000';
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Преобразует hex цвет в массив RGBA [r,g,b,a(0..255)]
 */
function hexToRgbaArray(hex, alpha) {
    if (!hex) hex = '#000000';
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) || 0;
    const g = parseInt(h.substring(2, 4), 16) || 0;
    const b = parseInt(h.substring(4, 6), 16) || 0;
    const a = Math.round((alpha || 1) * 255);
    return [r, g, b, a];
}

/**
 * Сравнивает два RGBA массива с допуском
 */
function colorsMatchRGBA(a, b, tol) {
    tol = tol || 0;
    return Math.abs(a[0] - b[0]) <= tol && 
           Math.abs(a[1] - b[1]) <= tol && 
           Math.abs(a[2] - b[2]) <= tol && 
           Math.abs(a[3] - b[3]) <= tol;
}

/**
 * Преобразует dataURL в Blob
 */
function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Возвращает прозрачность кисти как число 0..1
 */
function getBrushAlpha(rawValue) {
    try {
        let n = parseInt(rawValue, 10);
        if (!Number.isFinite(n)) n = 100;
        n = Math.max(0, Math.min(100, n));
        return n / 100;
    } catch (e) { 
        return 1; 
    }
}

/**
 * Проверяет, является ли инструмент неинтерактивным
 */
function isNonInteractiveTool(toolName) {
    const nonInteractiveTools = ['fill', 'rect', 'circle', 'line', 'triangle', 'star'];
    return nonInteractiveTools.includes(toolName);
}

// ==================== ТЕСТЫ ====================

describe('hexToRgba - преобразование HEX в RGBA строку', () => {
    test('преобразует черный цвет', () => {
        expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    });

    test('преобразует белый цвет', () => {
        expect(hexToRgba('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
    });

    test('преобразует красный цвет с прозрачностью', () => {
        expect(hexToRgba('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    test('работает без символа #', () => {
        expect(hexToRgba('00FF00', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    test('обрабатывает null как черный цвет', () => {
        expect(hexToRgba(null, 1)).toBe('rgba(0, 0, 0, 1)');
    });

    test('обрабатывает undefined как черный цвет', () => {
        expect(hexToRgba(undefined, 0.8)).toBe('rgba(0, 0, 0, 0.8)');
    });
});

describe('hexToRgbaArray - преобразование HEX в массив RGBA', () => {
    test('преобразует черный цвет в массив', () => {
        expect(hexToRgbaArray('#000000', 1)).toEqual([0, 0, 0, 255]);
    });

    test('преобразует белый цвет в массив', () => {
        expect(hexToRgbaArray('#FFFFFF', 1)).toEqual([255, 255, 255, 255]);
    });

    test('преобразует синий с половинной прозрачностью', () => {
        expect(hexToRgbaArray('#0000FF', 0.5)).toEqual([0, 0, 255, 128]);
    });

    test('обрабатывает null как черный', () => {
        expect(hexToRgbaArray(null, 1)).toEqual([0, 0, 0, 255]);
    });

    test('преобразует цвет без alpha (по умолчанию 1)', () => {
        expect(hexToRgbaArray('#FF00FF', undefined)).toEqual([255, 0, 255, 255]);
    });
});

describe('colorsMatchRGBA - сравнение цветов с допуском', () => {
    test('одинаковые цвета совпадают', () => {
        expect(colorsMatchRGBA([255, 0, 0, 255], [255, 0, 0, 255], 0)).toBe(true);
    });

    test('разные цвета не совпадают без допуска', () => {
        expect(colorsMatchRGBA([255, 0, 0, 255], [254, 0, 0, 255], 0)).toBe(false);
    });

    test('похожие цвета совпадают с допуском', () => {
        expect(colorsMatchRGBA([255, 0, 0, 255], [250, 5, 5, 250], 10)).toBe(true);
    });

    test('разные цвета не совпадают даже с допуском', () => {
        expect(colorsMatchRGBA([255, 0, 0, 255], [0, 255, 0, 255], 50)).toBe(false);
    });

    test('допуск по умолчанию равен 0', () => {
        expect(colorsMatchRGBA([100, 100, 100, 100], [100, 100, 100, 100])).toBe(true);
    });
});

describe('dataURLToBlob - преобразование dataURL в Blob', () => {
    test('преобразует PNG dataURL в Blob', () => {
        // Минимальный валидный PNG в base64
        const pngDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const blob = dataURLToBlob(pngDataURL);
        
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
    });

    test('преобразует JPEG dataURL в Blob', () => {
        // Минимальный валидный JPEG в base64
        const jpegDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';
        const blob = dataURLToBlob(jpegDataURL);
        
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/jpeg');
    });

    test('Blob имеет корректный размер', () => {
        const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const blob = dataURLToBlob(dataURL);
        
        expect(blob.size).toBeGreaterThan(0);
    });
});

describe('getBrushAlpha - получение прозрачности кисти', () => {
    test('преобразует 100 в 1.0', () => {
        expect(getBrushAlpha('100')).toBe(1);
    });

    test('преобразует 50 в 0.5', () => {
        expect(getBrushAlpha('50')).toBe(0.5);
    });

    test('преобразует 0 в 0', () => {
        expect(getBrushAlpha('0')).toBe(0);
    });

    test('ограничивает значение сверху (>100)', () => {
        expect(getBrushAlpha('150')).toBe(1);
    });

    test('ограничивает значение снизу (<0)', () => {
        expect(getBrushAlpha('-50')).toBe(0);
    });

    test('возвращает 1 для некорректного значения', () => {
        expect(getBrushAlpha('abc')).toBe(1);
    });

    test('возвращает 1 для undefined', () => {
        expect(getBrushAlpha(undefined)).toBe(1);
    });
});

describe('isNonInteractiveTool - проверка неинтерактивных инструментов', () => {
    test('fill является неинтерактивным', () => {
        expect(isNonInteractiveTool('fill')).toBe(true);
    });

    test('rect является неинтерактивным', () => {
        expect(isNonInteractiveTool('rect')).toBe(true);
    });

    test('circle является неинтерактивным', () => {
        expect(isNonInteractiveTool('circle')).toBe(true);
    });

    test('pencil является интерактивным', () => {
        expect(isNonInteractiveTool('pencil')).toBe(false);
    });

    test('select является интерактивным', () => {
        expect(isNonInteractiveTool('select')).toBe(false);
    });

    test('eraser является интерактивным', () => {
        expect(isNonInteractiveTool('eraser')).toBe(false);
    });
});
