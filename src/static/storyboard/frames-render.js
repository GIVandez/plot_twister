// frames-render.js — рендеринг кадров (без логики кнопок)
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, '0'); // MM:SS — привычный формат
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
}

function parseTime(timeString) {
    const parts = String(timeString).split(':');
    if (parts.length === 2) {
        const minutes = Number(parts[0]);
        const seconds = Number(parts[1]);
        if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds < 0 || seconds > 59) {
            return NaN;
        }
        return Math.max(0, Math.floor(minutes) * 60 + Math.floor(seconds));
    }
    return NaN;
}

// Функция для преобразования \n в HTML переносы (учитываем CRLF)
function formatDescription(text) {
    if (!text) return '';
    return String(text).replace(/\r?\n/g, '<br>');
}

// Функция для обрезки текста с учетом высоты контейнера
function truncateTextToFit(element, maxHeight) {
    // Берём оригинальный "plain" текст (с реальными \n), предпочитаем data-fullText
    const plainSource = element.dataset && element.dataset.fullText != null
        ? String(element.dataset.fullText)
        : (element.textContent || element.innerText || '');

    // Если элемент невидим или нулевой — вернём отформатированный полный текст
    if (!element.offsetWidth || !element.offsetHeight) {
        return formatDescription(plainSource);
    }

    // Временный элемент для измерения — используем те же стили
    const tempElement = document.createElement('div');
    const cs = getComputedStyle(element);
    tempElement.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${element.clientWidth}px;
        font-family: ${cs.fontFamily};
        font-size: ${cs.fontSize};
        line-height: ${cs.lineHeight};
        padding: ${cs.padding};
        box-sizing: border-box;
        white-space: pre-wrap; /* важно: matching rendering mode to preserve leading spaces */
        word-wrap: break-word;
        word-break: break-word;
    `;
    document.body.appendChild(tempElement);

    // Если весь текст помещается — возвращаем сразу (в HTML с <br>)
    tempElement.innerHTML = formatDescription(plainSource);
    if (tempElement.scrollHeight <= maxHeight) {
        document.body.removeChild(tempElement);
        return formatDescription(plainSource);
    }

    // Бинарный поиск максимальной длины подстроки, которая помещается
    let low = 0;
    let high = plainSource.length;
    let best = 0;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        // Чтобы не обрезать в середине слова, возьмём ближайший пробел или перенос перед mid
        let probePos = mid;
        if (probePos < plainSource.length && !/\s/.test(plainSource[probePos])) {
            const back = plainSource.lastIndexOf(' ', probePos);
            const br = plainSource.lastIndexOf('\n', probePos);
            const cut = Math.max(back, br);
            if (cut > 0) probePos = cut;
        }
        if (probePos <= 0) probePos = mid; // fallback

        // Оставляем пробелы в начале/конце, не применяем .trim()
        const probeText = plainSource.slice(0, probePos);
        tempElement.innerHTML = formatDescription(probeText + '...');
        if (tempElement.scrollHeight <= maxHeight) {
            best = probePos;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    // Построим итоговую усечённую строку (с сохранением ведущих пробелов)
    let truncatedPlain = '';
    if (best > 0) {
        const lastSpace = Math.max(plainSource.lastIndexOf(' ', best), plainSource.lastIndexOf('\n', best));
        const cut = lastSpace > 0 ? lastSpace : best;
        truncatedPlain = plainSource.slice(0, cut);
    } else {
        truncatedPlain = plainSource.slice(0, Math.min(40, plainSource.length));
    }

    // Финальный HTML с <br> — formatDescription сохраняет переносы, а pre-wrap в контейнере сохранит ведущие пробелы
    const finalHtml = formatDescription(truncatedPlain + '...');

    document.body.removeChild(tempElement);
    return finalHtml;
}

// Функция для применения обрезки к элементу описания
function applyTruncation(descDiv) {
    if (!descDiv || !descDiv.offsetWidth) return;
    
    const maxHeight = descDiv.clientHeight;
    if (maxHeight <= 0) return;
    
    const truncatedText = truncateTextToFit(descDiv, maxHeight);
    if (truncatedText !== descDiv.innerHTML) {
        descDiv.innerHTML = truncatedText;
    }
}

// =============================================================================
// НАЧАЛО: ЛОГИКА РЕДАКТИРОВАНИЯ ОПИСАНИЯ КАДРА
// =============================================================================

// Глобальная переменная текущего редактора описания
window.editingDescription = null;
// Глобальный "замок" для анимации описания — если не null, ждём его разрешения
window.descriptionAnimationPromise = null;

// Функция для редактирования описания кадра
async function editDescription(index, descDiv) {
    // Если открыт другой редактор — инициируем его сохранение/закрытие, но НЕ ждём его, чтобы анимации могли идти одновременно
    if (window.editingDescription && window.editingDescription.textarea && window.editingDescription.descDiv !== descDiv) {
        if (typeof window.editingDescription.save === 'function') {
            // Запускаем сохранение, но не await — чтобы анимация закрытия и открытие нового шли одновременно
            try { window.editingDescription.save(); } catch (e) { /* ignore */ }
        } else if (typeof window.editingDescription.cancel === 'function') {
            try { window.editingDescription.cancel(); } catch (e) { /* ignore */ }
        }
    }

    const frame = descDiv.closest('.frame');
    const store = window.storyboardStore;
    if (!store) return;
    const frameData = store.getFrameByIndex(index);
    
    // Открываем информацию о кадре справа, если она еще не открыта
    if (frameData && window.showFrameInfo) {
        // Проверяем, не открыта ли уже информация для этого кадра
        const infoSection = document.querySelector('.info-section');
        const existingInfo = infoSection ? infoSection.querySelector('.frame-info-display') : null;
        if (!existingInfo || existingInfo.dataset.frameId !== frameData.id) {
            hideScriptPage();
            showFrameInfo(frameData);
        }
    }

    // Блокируем drag & drop на время редактирования
    window.isEditingDescription = true;

    // Создаем textarea для редактирования
    const textarea = document.createElement('textarea');
    textarea.className = 'frame-description-edit';
    textarea.value = frameData ? frameData.description : '';

    // Предотвратить всплытие mousedown (чтобы не триггерился drag)
    textarea.addEventListener('mousedown', (ev) => {
        ev.stopPropagation();
    });

    // Сохраняем оригинальные стили описания
    const computedStyle = getComputedStyle(descDiv);
    textarea.style.background = computedStyle.backgroundColor;
    textarea.style.color = computedStyle.color;
    textarea.style.fontFamily = computedStyle.fontFamily;
    textarea.style.fontSize = computedStyle.fontSize;
    textarea.style.lineHeight = computedStyle.lineHeight;
    textarea.style.border = 'none';
    textarea.style.borderRadius = '6px';
    textarea.style.padding = '10px';
    textarea.style.width = '100%';
    textarea.style.resize = 'none';
    textarea.style.boxSizing = 'border-box';

    // Делаем размер редактора адаптивным: зависимость от высоты info-section, с разумными границами
    const infoSection = document.querySelector('.info-section');
    const containerHeight = infoSection ? infoSection.clientHeight : 410;
    const expandedHeight = Math.max(300, Math.min(520, Math.round(containerHeight * 0.78)));
    textarea.style.height = `${Math.max(160, expandedHeight - 80)}px`; // учитываем отступы и минимальную высоту

    // Заменяем descDiv на textarea
    descDiv.style.display = 'none';
    descDiv.parentNode.insertBefore(textarea, descDiv.nextSibling);

    // Устанавливаем курсор в конец текста
    setTimeout(() => {
        // Попытка установить фокус без прокрутки (современные браузеры)
        try {
            textarea.focus({ preventScroll: true });
        } catch (err) {
            // fallback для старых браузеров: сохранение и восстановление прокрутки контейнера и окна
            const framesContainer = document.getElementById('framesContainer');
            const savedContainerScroll = framesContainer ? framesContainer.scrollTop : null;
            const savedDocScrollY = window.scrollY || document.documentElement.scrollTop;
            textarea.focus();
            if (framesContainer && savedContainerScroll != null) framesContainer.scrollTop = savedContainerScroll;
            window.scrollTo(window.scrollX || 0, savedDocScrollY || 0);
        }
        // Устанавливаем каретку в конец (не должно вызывать прокрутку)
        setTimeout(() => {
            if (typeof textarea.setSelectionRange === 'function') {
                const len = textarea.value ? textarea.value.length : 0;
                textarea.setSelectionRange(len, len);
            }
        }, 0);
    }, 0);

    // Вспомогательная очистка общая
    function cleanupEditor() {
        window.isEditingDescription = false;
        if (window.editingDescription && window.editingDescription.textarea === textarea) {
            window.editingDescription = null;
        }
        textarea.removeEventListener('keydown', handleKeyDown);
    }

    // Отмена редактирования (не сохраняет изменения) — возвращает Promise
    function cancelEditing() {
        // создаём "замок" на время анимации
        let resolver;
        window.descriptionAnimationPromise = new Promise((res) => { resolver = res; });

        return new Promise((resolve) => {
            textarea.style.animation = 'collapseDescription 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            
            setTimeout(() => {
                if (textarea.parentNode) textarea.remove();
                
                const latestFrame = store.getFrameByIndex(index);
                const descriptionText = latestFrame ? latestFrame.description : (frameData ? frameData.description : '');
                descDiv.dataset.fullText = descriptionText;
                
                // Сначала устанавливаем полный текст для измерения
                descDiv.innerHTML = formatDescription(descriptionText);
                descDiv.style.display = 'block';
                descDiv.style.opacity = '1';
                
                // Применяем обрезку сразу синхронно
                applyTruncation(descDiv);
                
                cleanupEditor();
                if (resolver) resolver();
                window.descriptionAnimationPromise = null;
                resolve();
            }, 320);
        });
    }

    // Сохранение редактирования — возвращает Promise
    async function saveDescription() {
        // создаём "замок" на время анимации
        let resolver;
        window.descriptionAnimationPromise = new Promise((res) => { resolver = res; });

        return new Promise(async (resolve) => {
            const newDescription = textarea.value;
            // Update via API
            const frameData = store.getFrameByIndex(index);
            if (frameData && store.redoDescription) {
                await store.redoDescription(frameData.id, newDescription);
            } else {
                // Fallback to local update
                store.setFrameValuesByIndex(index, { description: newDescription });
            }
            
            // Сохраняем полный текст
            descDiv.dataset.fullText = newDescription;

            textarea.style.animation = 'collapseDescription 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            
            setTimeout(() => {
                if (textarea.parentNode) textarea.remove();

                // Сначала устанавливаем полный текст для измерения
                descDiv.innerHTML = formatDescription(newDescription);
                descDiv.style.display = 'block';
                descDiv.style.opacity = '1';
                
                // Применяем обрезку сразу синхронно
                applyTruncation(descDiv);
                
                cleanupEditor();
                if (resolver) resolver();
                window.descriptionAnimationPromise = null;
                resolve();
            }, 320);
        });
    }

    // Обработка клавиш — Ctrl+Enter и Escape сохраняют изменения
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            // Сохраняем изменения по Escape (как Ctrl+Enter)
            e.preventDefault();
            saveDescription();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            saveDescription();
        }
    }

    // Не вешаем blur — закрытие только по ESC или клику на другой кадр
    textarea.addEventListener('keydown', handleKeyDown);

    // Экспортируем текущий редактор глобально, чтобы другие модули могли управлять
    window.editingDescription = {
        index,
        descDiv,
        textarea,
        save: saveDescription,
        cancel: cancelEditing
    };

    // Возвращаем объект редактора в случае, если кто-то захочет await
    return window.editingDescription;
}

// =============================================================================
// КОНЕЦ: ЛОГИКА РЕДАКТИРОВАНИЯ ОПИСАНИЯ КАДРА
// =============================================================================

function renderFrames() {
    const container = document.getElementById('framesContainer');
    if (!container) {
        return;
    }
    
    container.innerHTML = '';

    const store = window.storyboardStore;
    const ids = store ? store.getFrameIds() : [];

    ids.forEach((id, index) => {
        const frame = store.getFrameById(id);
        if (!frame) return;
         const frameDiv = document.createElement('div');
         frameDiv.className = 'frame';
         frameDiv.dataset.index = index;
         frameDiv.dataset.id = frame.id; // добавлено: стабильный идентификатор кадра для drag-drop ограничений

        const imgDiv = document.createElement('div');
        imgDiv.className = 'frame-image';
        imgDiv.textContent = frame.image;

        const descDiv = document.createElement('div');
        descDiv.className = 'frame-description';
        descDiv.dataset.fullText = frame.description; // сохраняем полный текст
        descDiv.innerHTML = formatDescription(frame.description);
        // Спрячем до применения усечения, чтобы не было кратковременного "всплывания" полного текста
        descDiv.style.visibility = 'hidden';
        
        // =============================================================================
        // ДОБАВЛЕНО: Обработчик клика для редактирования описания
        // =============================================================================
        descDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            editDescription(index, descDiv);
        });
        // =============================================================================

        // Контейнер для времени начала и конца
        const timeContainer = document.createElement('div');
        timeContainer.className = 'frame-time-main-container';
        
        // Контейнер для времени (начало над концом)
        const timeVerticalContainer = document.createElement('div');
        timeVerticalContainer.className = 'frame-time-vertical-container'; 
        
        // Время начала
        const timeStartContainer = document.createElement('div');
        timeStartContainer.className = 'frame-time-container';
        
        const timeStartDiv = document.createElement('div');
        timeStartDiv.className = 'frame-time-start';
        timeStartDiv.textContent = formatTime(frame.start);
        timeStartDiv.addEventListener('click', () => editTime(index, 'start', timeStartDiv));

        const timeStartEdit = document.createElement('input');
        timeStartEdit.className = 'frame-time-edit';
        timeStartEdit.type = 'text';
        timeStartEdit.value = formatTime(frame.start);
        timeStartEdit.style.display = 'none';
        timeStartEdit.addEventListener('blur', async () => { await saveTime(index, 'start', timeStartEdit, timeStartDiv); });
        timeStartEdit.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                timeStartEdit.blur();
            }
        });
        // ДОБАВЛЕНО: Escape отменяет редактирование и восстанавливает исходное значение
        timeStartEdit.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                const store = window.storyboardStore;
                const frameNow = store ? store.getFrameByIndex(index) : null;
                timeStartEdit.style.display = 'none';
                timeStartDiv.style.display = 'flex';
                timeStartEdit.value = formatTime(frameNow ? frameNow.start : frame.start);
            }
        });

        timeStartContainer.appendChild(timeStartDiv);
        timeStartContainer.appendChild(timeStartEdit);

        // Время конца
        const timeEndContainer = document.createElement('div');
        timeEndContainer.className = 'frame-time-container';
        
        const timeEndDiv = document.createElement('div');
        timeEndDiv.className = 'frame-time-end';
        timeEndDiv.textContent = formatTime(frame.end);
        timeEndDiv.addEventListener('click', () => editTime(index, 'end', timeEndDiv));

        const timeEndEdit = document.createElement('input');
        timeEndEdit.className = 'frame-time-edit';
        timeEndEdit.type = 'text';
        timeEndEdit.value = formatTime(frame.end);
        timeEndEdit.style.display = 'none';
        timeEndEdit.addEventListener('blur', async () => { await saveTime(index, 'end', timeEndEdit, timeEndDiv); });
        timeEndEdit.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                timeEndEdit.blur();
            }
        });
        // ДОБАВЛЕНО: Escape отменяет редактирование и восстанавливает исходное значение
        timeEndEdit.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                const store = window.storyboardStore;
                const frameNow = store ? store.getFrameByIndex(index) : null;
                timeEndEdit.style.display = 'none';
                timeEndDiv.style.display = 'flex';
                timeEndEdit.value = formatTime(frameNow ? frameNow.end : frame.end);
            }
        });

        timeEndContainer.appendChild(timeEndDiv);
        timeEndContainer.appendChild(timeEndEdit);

        // Добавляем время начала и конца в вертикальный контейнер
        timeVerticalContainer.appendChild(timeStartContainer);
        timeVerticalContainer.appendChild(timeEndContainer);

        // Кнопки плана кадра и привязки страницы
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'frame-buttons-container';
        
        // Кнопка выбора плана кадра (shot size)
        const shotSizeButton = document.createElement('button');
        shotSizeButton.className = 'frame-button shot-size';
        shotSizeButton.textContent = frame.shotSize || 'Shot Size';
        shotSizeButton.title = 'Выбрать план кадра';
        // сохраняем предыдущее значение для быстрого отката (правый клик)
        shotSizeButton.dataset.prevShotSize = (frame.shotSize == null ? '' : String(frame.shotSize));
        shotSizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.selectShotSize) {
                window.selectShotSize(index);
            }
        });
        shotSizeButton.addEventListener('contextmenu', (e) => {
            // правый клик — откат к предыдущему значению
            e.preventDefault();
            e.stopPropagation();
            const prev = shotSizeButton.dataset.prevShotSize;
            const store = window.storyboardStore;
            if (store && prev !== undefined) {
                store.setFrameValuesByIndex(index, { shotSize: prev || null });
                if (window.renderFrames) window.renderFrames();
            }
        });

        // Кнопка привязки страницы (page connect)
        const pageConnectButton = document.createElement('button');
        pageConnectButton.className = 'frame-button page-connect';

        // Отображаем номер привязанной страницы или "Connect", если страница не привязана
        const pageNumber = frame.connectedPage || 'Connect';
        pageConnectButton.textContent = pageNumber;
        pageConnectButton.title = frame.connectedPage ? 
            `Открыть страницу ${frame.connectedPage}` : 
            'Привязать к странице';
        // сохраняем предыдущее значение для быстрого отката (правый клик)
        pageConnectButton.dataset.prevConnectedPage = (frame.connectedPage == null ? '' : String(frame.connectedPage));
        pageConnectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.connectToPage) {
                window.connectToPage(index);
            }
        });
        pageConnectButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const prev = pageConnectButton.dataset.prevConnectedPage;
            const store = window.storyboardStore;
            if (store && prev !== undefined) {
                const val = prev === '' ? null : (isNaN(prev) ? prev : Number(prev));
                store.setFrameValuesByIndex(index, { connectedPage: val });
                if (window.renderFrames) window.renderFrames();
            }
        });

        buttonsContainer.appendChild(shotSizeButton);
        buttonsContainer.appendChild(pageConnectButton);

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'frame-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Удалить кадр';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteFrame(index);
        });

        frameDiv.appendChild(imgDiv);
        frameDiv.appendChild(descDiv);
        frameDiv.appendChild(timeVerticalContainer);
        frameDiv.appendChild(buttonsContainer);
        frameDiv.appendChild(deleteBtn);

        container.appendChild(frameDiv);
        
        // Применяем обрезку текста синхронно и показываем блок (убираем flicker)
        try {
            applyTruncation(descDiv);
        } catch (e) { /* ignore */ }
        descDiv.style.visibility = '';
    });

    // Обновляем left scrollbar после рендера (если есть)
    setTimeout(() => {
        if (window.updateLeftScrollbar) {
            try { window.updateLeftScrollbar(); } catch (e) { /* ignore */ }
        }
    }, 0);
}

function editTime(index, type, timeDiv) {
    const container = timeDiv.parentElement;
    const display = timeDiv;
    const edit = container.querySelector('.frame-time-edit');
    
    display.style.display = 'none';
    edit.style.display = 'block';
    edit.focus();
    // Не выделяем текст целиком, ставим каретку в конец
    setTimeout(() => {
        if (typeof edit.setSelectionRange === 'function') {
            const len = edit.value ? edit.value.length : 0;
            edit.setSelectionRange(len, len);
        }
    }, 0);
}

async function saveTime(index, type, editInput, timeDiv) {
    const newTime = parseTime(editInput.value);
    const store = window.storyboardStore;
    if (!store) return;
    const frame = store.getFrameByIndex(index);

    // Валидация времени
    if (isNaN(newTime) || newTime < 0) {
        alert('Некорректное время. Используйте формат MM:SS');
        editInput.value = formatTime(frame[type]);
    } else {
        // Проверяем логику времени (начало должно быть раньше конца)
        if (type === 'start' && newTime >= frame.end) {
            alert('Время начала должно быть меньше времени конца');
            editInput.value = formatTime(frame[type]);
        } else if (type === 'end' && newTime <= frame.start) {
            alert('Время конца должно быть больше времени начала');
            editInput.value = formatTime(frame[type]);
        } else {
            // Calculate delta for domino effect
            const oldValue = frame[type];
            const delta = newTime - oldValue;

            // Update current frame via API
            if (type === 'start' && store.redoStartTime) {
                await store.redoStartTime(frame.id, newTime);
            } else if (type === 'end' && store.redoEndTime) {
                await store.redoEndTime(frame.id, newTime);
            } else {
                store.setFrameValuesByIndex(index, { [type]: newTime });
            }

            // Domino effect: shift subsequent frames when end time changes
            if (type === 'end' && delta !== 0) {
                await shiftFramesFromIndexWithAPI(index + 1, delta);
            }

            timeDiv.textContent = formatTime(newTime);

            // Обновляем отображение
            setTimeout(() => {
                if (window.renderFrames) {
                    window.renderFrames();
                }
            }, 0);
        }
    }

    editInput.style.display = 'none';
    timeDiv.style.display = 'flex';
}

// Утилита: сдвинуть start/end всех кадров начиная с startIndex на delta секунд с отправкой на сервер
async function shiftFramesFromIndexWithAPI(startIndex, delta) {
    const store = window.storyboardStore;
    if (!store || !Number.isFinite(delta) || delta === 0) return;
    
    const frameCount = store.getFrameCount();
    for (let i = startIndex; i < frameCount; i++) {
        const f = store.getFrameByIndex(i);
        if (!f) continue;
        const newStart = Math.max(0, Math.round(f.start + delta));
        const newEnd = Math.max(newStart, Math.round(f.end + delta));
        
        // Update via API
        if (store.redoStartTime) {
            await store.redoStartTime(f.id, newStart);
        }
        if (store.redoEndTime) {
            await store.redoEndTime(f.id, newEnd);
        }
    }
}

// Утилита: сдвинуть start/end всех кадров начиная с startIndex на delta секунд (локально, без API)
function shiftFramesFromIndex(startIndex, delta) {
    const store = window.storyboardStore;
    if (!store || !Number.isFinite(delta) || delta === 0) return;
    for (let i = startIndex; i < store.getFrameCount(); i++) {
        const f = store.getFrameByIndex(i);
        if (!f) continue;
        const newStart = Math.max(0, Math.round(f.start + delta));
        const newEnd = Math.max(newStart, Math.round(f.end + delta));
        store.setFrameValuesByIndex(i, { start: newStart, end: newEnd });
    }
}
window.shiftFramesFromIndex = shiftFramesFromIndex;

async function deleteFrame(index) {
    if (!confirm('Вы уверены, что хотите удалить этот кадр?')) return;
    const store = window.storyboardStore;
    if (!store) return;

    const frame = store.getFrameByIndex(index);
    if (!frame) return;

    // Delete via API
    const success = await store.deleteFrame(frame.id);
    if (success) {
        if (window.renderFrames) {
            window.renderFrames();
        }

        // Обновляем скроллбар после удаления
        setTimeout(() => {
            if (window.updateLeftScrollbar) {
                window.updateLeftScrollbar();
            }
        }, 0);
    }
}

// Добавляем функции в глобальную область видимости
window.renderFrames = renderFrames;
window.deleteFrame = deleteFrame;
window.formatTime = formatTime;
window.parseTime = parseTime;
