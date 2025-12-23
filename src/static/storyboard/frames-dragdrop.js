// frames-dragdrop.js — улучшенный Drag & Drop (мгновенная вставка в конец, стабильная логика)
// Инициированы улучшения: стабильная логика слотов, suppression флагов и единый push undo для reorder

// Инициализация глобального флага для подавления скрытия панели при кликах (по умолчанию — false)
window._suppressHideOnClick = window._suppressHideOnClick || false;

function showFrameInfo(frameData) {
    if (!frameData || !frameData.id) {
        return;
    }
    
    const infoSection = document.querySelector('.info-section');
    if (!infoSection) {
        return;
    }
    
    // Проверяем, не открыта ли уже информация для этого кадра
    const existingInfo = infoSection.querySelector('.frame-info-display');
    if (existingInfo) {
        const existingFrameId = existingInfo.dataset.frameId;
        // Если информация уже открыта для этого кадра, ничего не делаем
        if (existingFrameId && String(existingFrameId) === String(frameData.id)) {
            return;
        }
        // Если информация открыта для другого кадра, удаляем её
        existingInfo.remove();
    }
    
    // Сначала скрываем страницу сценария
    if (typeof hideScriptPage === 'function') hideScriptPage();
    
    // Создаем контейнер для информации о кадре
    const frameInfoDisplay = document.createElement('div');
    frameInfoDisplay.className = 'frame-info-display active';
    // Сохраняем ID кадра для проверки, не открыта ли уже информация для этого кадра
    frameInfoDisplay.dataset.frameId = frameData.id;
    
    // Изображение кадра - растянуто на всю ширину, формат 16:9
    const frameImage = document.createElement('img');
    frameImage.className = 'frame-image-info';
    frameImage.src = `path/to/images/${frameData.image}.jpg`;
    frameImage.alt = frameData.image;

    // клик по изображению — переход в GraphicEditor
    frameImage.addEventListener('click', (ev) => {
        ev.stopPropagation();
        window.location.href = 'file:///C:/Users/iluha/Desktop/pt/graphiceditor/GraphicEditor.html';
    });

    // Флаг для отслеживания, была ли запущена анимация
    let animationStarted = false;

    // Обработчик ошибки загрузки изображения
    frameImage.onerror = function() {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'frame-image-info';
        fallbackDiv.style.cssText = `
            width: 100%;
            height: auto;
            aspect-ratio: 16/9;
            background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-weight: 600;
            font-size: 18px;
            cursor: pointer;
        `;
        fallbackDiv.textContent = frameData.image;

        // клик по fallback тоже ведет в GraphicEditor
        fallbackDiv.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.location.href = 'file:///C:/Users/iluha/Desktop/pt/graphiceditor/GraphicEditor.html';
        });

        frameInfoDisplay.insertBefore(fallbackDiv, frameInfoDisplay.firstChild);
        frameImage.remove();
        
        // Если анимация уже была запущена, добавляем класс visible к fallbackDiv
        if (animationStarted) {
            requestAnimationFrame(() => {
                fallbackDiv.classList.add('visible');
            });
        }
    };
    
    frameInfoDisplay.appendChild(frameImage);
    
    // Создаем контейнер для кнопок управления
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'frame-info-controls';
    
    // Получаем индекс кадра для обновления данных
    const store = window.storyboardStore;
    const frameIndex = store ? store.getFrameIndexById(frameData.id) : -1;
    
    // Кнопка времени начала
    const timeStartBtn = document.createElement('button');
    timeStartBtn.className = 'frame-control-btn time-start';
    timeStartBtn.textContent = formatTime(frameData.start);
    timeStartBtn.title = 'Время начала кадра (клик для редактирования)';
    
    // Кнопка времени конца
    const timeEndBtn = document.createElement('button');
    timeEndBtn.className = 'frame-control-btn time-end';
    timeEndBtn.textContent = formatTime(frameData.end);
    timeEndBtn.title = 'Время конца кадра (клик для редактирования)';
    
    // Кнопка удаления (замещает прежнюю кнопку плана кадра)
    const shotSizeBtn = document.createElement('button');
    // Используем стили кнопки времени конца и дополнительный маркер для удаления
    shotSizeBtn.className = 'frame-control-btn time-end frame-delete-time-btn';
    shotSizeBtn.innerHTML = '×';
    shotSizeBtn.title = 'Удалить кадр';
    shotSizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Вы уверены, что хотите удалить этот кадр?')) return;
        // Предпочтительно использовать глобальную функцию удаления, если она доступна
        if (typeof window.deleteFrame === 'function' && frameIndex !== -1) {
            window.deleteFrame(frameIndex);
            return;
        }
        // Паджбек: вызов метода store.deleteFrame по id
        if (frameData && frameData.id && store && typeof store.deleteFrame === 'function') {
            store.deleteFrame(frameData.id).then(ok => {
                if (ok && window.renderFrames) window.renderFrames();
            }).catch(err => console.error('deleteFrame fallback failed', err));
        }
    });
    
    // Кнопка привязанной страницы — сделать поведение как у левой `frame-button page-connect`
    const pageConnectBtn = document.createElement('button');
    pageConnectBtn.className = 'frame-control-btn page-connect';
    const pageNumber = (typeof frameData.connectedPage !== 'undefined' && frameData.connectedPage !== null && frameData.connectedPage !== '') ? frameData.connectedPage : 'connect';
    pageConnectBtn.textContent = `${pageNumber}`;
    pageConnectBtn.title = frameData.connectedPage ?
        `Открыть страницу ${frameData.connectedPage}` :
        'Привязать к странице';
    // сохраняем предыдущее значение для быстрого отката (правый клик)
    pageConnectBtn.dataset.prevConnectedPage = (frameData.connectedPage == null ? '' : String(frameData.connectedPage));
    pageConnectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.connectToPage) {
            window.connectToPage(frameIndex);
        }
    });
    pageConnectBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prev = pageConnectBtn.dataset.prevConnectedPage;
        const store = window.storyboardStore;
        if (store && prev !== undefined) {
            const val = prev === '' ? null : (isNaN(prev) ? prev : Number(prev));
            store.setFrameValuesByIndex(frameIndex, { connectedPage: val });
            if (window.renderFrames) window.renderFrames();
        }
    });
    
    // Функция для редактирования времени
    function setupTimeEdit(btn, timeType, frameData) {
        let isEditing = false;

        btn.addEventListener('click', (e) => {
            // Останавливаем всплытие события, чтобы не обрабатывалось другими обработчиками
            e.stopPropagation();
            if (isEditing) return;
            
            // Запрещаем редактирование start_time первого кадра (должно быть всегда 00:00)
            if (frameIndex === 0 && timeType === 'start') {
                return; // Не позволяем редактировать
            }
            
            isEditing = true;
            const originalTime = btn.textContent;
            
            // Создаем input для редактирования
            const input = document.createElement('input');
            input.className = 'time-edit-input';
            input.type = 'text';
            input.value = originalTime;
            input.style.width = '100%';
            input.style.height = '100%';
            
            // Заменяем кнопку на input
            btn.innerHTML = '';
            btn.appendChild(input);
            input.focus();
            // Не выделяем весь текст, установим каретку в конец
            setTimeout(() => {
                if (typeof input.setSelectionRange === 'function') {
                    const len = input.value ? input.value.length : 0;
                    input.setSelectionRange(len, len);
                }
            }, 0);
            
            async function saveTime() {
                // Запрещаем изменение start_time первого кадра (должно быть всегда 00:00)
                if (frameIndex === 0 && timeType === 'start') {
                    btn.innerHTML = formatTime(0); // Восстанавливаем 00:00
                    isEditing = false;
                    return;
                }

                const newTimeStr = input.value.trim();
                const newTime = parseTime(newTimeStr);
                
                if (!isNaN(newTime) && newTime >= 0) {
                    // Проверяем логику времени
                    if (timeType === 'start' && newTime >= frameData.end) {
                        alert('Время начала должно быть меньше времени конца');
                    } else if (timeType === 'end' && newTime <= frameData.start) {
                        alert('Время конца должно быть больше времени начала');
                    } else {
                        // Сохраняем изменения как единый undoable шаг: обновление текущего кадра + сдвиг последующих.
                        const oldTime = frameData[timeType];
                        const delta = newTime - oldTime;
                        const beforeSnapshot = store.getSnapshot ? store.getSnapshot() : null;
                        const prevSuppress = !!store._suppressUndo;
                        try {
                            store._suppressUndo = true;
                            // Apply change to current frame
                            frameData[timeType] = newTime;
                            btn.textContent = formatTime(newTime);
                            if (frameIndex !== -1 && store) {
                                if (timeType === 'start' && store.redoStartTime) {
                                    await store.redoStartTime(frameData.id, newTime);
                                } else if (timeType === 'end' && store.redoEndTime) {
                                    await store.redoEndTime(frameData.id, newTime);
                                } else {
                                    store.setFrameValuesByIndex(frameIndex, { [timeType]: newTime });
                                }
                            }

                            // Domino effect locally
                            if (timeType === 'end' && delta !== 0 && typeof shiftFramesFromIndex === 'function') {
                                shiftFramesFromIndex(frameIndex + 1, delta);
                            }
                        } finally {
                            store._suppressUndo = prevSuppress;
                        }

                        const afterSnapshot = store.getSnapshot ? store.getSnapshot() : null;
                        if (!prevSuppress && beforeSnapshot && afterSnapshot && window.undoManager) {
                            window.undoManager.pushAction({ type: 'modify', before: beforeSnapshot, after: afterSnapshot, meta: { id: frameData.id, timeType, newTime } });
                        }

                        // Background sync to server
                        if (timeType === 'end' && delta !== 0 && typeof shiftFramesFromIndexWithAPI === 'function') {
                            shiftFramesFromIndexWithAPI(frameIndex + 1, delta, true).catch(err => console.error('Error syncing shifts:', err));
                        }

                        // Обновляем отображение в левой панели
                        if (window.renderFrames) {
                            window.renderFrames();
                        }
                    }
                } else {
                    alert('Некорректное время. Используйте формат MM:SS');
                }
                
                isEditing = false;
            }
            
            // ДОБАВЛЕНО: отмена по Escape — восстанавливаем исходное значение
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape') {
                    ev.stopPropagation();
                    // Восстановим исходный текст и уберём input
                    btn.innerHTML = originalTime;
                    isEditing = false;
                } else if (ev.key === 'Enter') {
                    // enter — сохранить как раньше
                    saveTime();
                }
            });

            // Останавливаем всплытие для input поля
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            input.addEventListener('blur', saveTime);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveTime();
                }
            });
        });
    }
    
    // Настраиваем редактирование времени для обеих кнопок
    setupTimeEdit(timeStartBtn, 'start', frameData);
    setupTimeEdit(timeEndBtn, 'end', frameData);
    
    // Добавляем кнопки в контейнер
    controlsContainer.appendChild(timeStartBtn);
    controlsContainer.appendChild(timeEndBtn);
    controlsContainer.appendChild(shotSizeBtn);
    controlsContainer.appendChild(pageConnectBtn);
    
    frameInfoDisplay.appendChild(controlsContainer);
    
    // Большое описание кадра
    const frameDescriptionInfo = document.createElement('div');
    frameDescriptionInfo.className = 'frame-description-info';
    frameDescriptionInfo.dataset.fullText = frameData.description;
    frameDescriptionInfo.innerHTML = formatDescription(frameData.description);
    
    frameInfoDisplay.appendChild(frameDescriptionInfo);
    
    infoSection.appendChild(frameInfoDisplay);
    
    // Одновременная анимация появления всех элементов
    animationStarted = true;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Находим актуальный элемент изображения в DOM (может быть frameImage или fallbackDiv)
            const actualImageElement = frameInfoDisplay.querySelector('.frame-image-info');
            
            // Все элементы появляются одновременно
            if (actualImageElement) {
                actualImageElement.classList.add('visible');
            }
            controlsContainer.classList.add('visible');
            frameDescriptionInfo.classList.add('visible');
        });
    });
    
    // Добавляем обработчик клика на весь контейнер информации, чтобы остановить всплытие
    frameInfoDisplay.addEventListener('click', (e) => {
        // Останавливаем всплытие всех кликов внутри панели информации
        e.stopPropagation();
    });
}

// Глобальная функция для скрытия информации о кадре
function hideFrameInfo() {
    const infoSection = document.querySelector('.info-section');
    const frameInfoDisplay = infoSection.querySelector('.frame-info-display');
    if (frameInfoDisplay) {
        frameInfoDisplay.remove();
    }
}

// Делаем функции глобальными
window.showFrameInfo = showFrameInfo;
window.hideFrameInfo = hideFrameInfo;

function initFramesDragDrop() {
    let draggedElement = null;
    let dragClone = null;
    let dropSlot = null;
    let hoverTimeout = null;
    let hideTimeout = null;
    let removeSlotTimeout = null; // таймаут который реально удаляет dropSlot из DOM (нужен для отмены)
    let autoScrollInterval = null;
    let isDragging = false;
    let slotUpdateScheduled = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let currentSlotTarget = null; // { frame, insertBefore, rect }
    let slotVisible = false;

    const container = document.getElementById('framesContainer');
    const scrollZoneHeight = 100;
    const baseScrollSpeed = 5;

    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    // Время задержки для показа/скрытия (в миллисекундах)
    const SHOW_DELAY = 120; // задержка для вставки между кадрами
    const HIDE_DELAY = 100; // 0.1 секунды для скрытия

    // Map для отслеживания ограничений соседних кадров
    let neighborConstraints = new Map(); // key = frame.dataset.id, value = 'before' | 'after'

    function onMouseDown(e) {
        // Разрешаем только левую кнопку мыши
        if (e.button !== 0) return;
        
        if (!e.target.closest('.storyboard-section') ||
            e.target.closest('.frame-delete-btn') ||
            e.target.classList.contains('frame-time-edit') ||
            e.target.closest('.frame-description-edit')) return;

        const frame = e.target.closest('.frame');
        if (!frame) return;
        
        // Проверяем, не открыто ли редактирование описания для этого кадра
        if (window.isEditingDescription && window.editingDescription) {
            const editingFrameEl = window.editingDescription.descDiv ? window.editingDescription.descDiv.closest('.frame') : null;
            if (editingFrameEl === frame) {
                // Редактирование открыто для этого кадра - блокируем drag
                return;
            }
        }

        e.preventDefault();

        draggedElement = frame;
        const rect = frame.getBoundingClientRect();

        pointerOffsetX = e.clientX - rect.left;
        pointerOffsetY = e.clientY - rect.top;

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;

        window.dragStartPosition = { x: rect.left, y: rect.top };

        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseup', onMouseUp, { passive: true });
        // Добавляем обработчик правой кнопки мыши
        document.addEventListener('contextmenu', onContextMenu, { passive: false });

        container.addEventListener('scroll', onAnyScroll, { passive: true });
        window.addEventListener('scroll', onAnyScroll, { passive: true });
        window.addEventListener('wheel', onAnyScroll, { passive: true });

        document.body.classList.add('no-select', 'dragging-active');
    }

    // Обработчик контекстного меню (правой кнопки мыши)
    function onContextMenu(e) {
        if (isDragging) {
            e.preventDefault();
            // Немедленно прерываем перетаскивание
            cancelDrag();
            return false;
        }
    }

    function onMouseMove(e) {
        if (!draggedElement) return;

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;

        if (!isDragging) {
            const dx = Math.abs(e.clientX - window.dragStartPosition.x);
            const dy = Math.abs(e.clientY - window.dragStartPosition.y);
            if (dx > 5 || dy > 5) startDragging(e);
            else return;
        }

        if (dragClone) {
            const tx = e.clientX - pointerOffsetX;
            const ty = e.clientY - pointerOffsetY;
            dragClone.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        }

        handleAutoScroll(e);

        if (!slotUpdateScheduled) {
            slotUpdateScheduled = true;
            requestAnimationFrame(() => {
                updateSlotAtPoint(lastPointerX, lastPointerY);
                slotUpdateScheduled = false;
            });
        }
    }

    function onAnyScroll() {
        if (!isDragging) return;
        // при скролле пересчитываем по последним координатам, не скрываем сразу
        if (lastPointerX !== 0 || lastPointerY !== 0) {
            if (!slotUpdateScheduled) {
                slotUpdateScheduled = true;
                requestAnimationFrame(() => {
                    updateSlotAtPoint(lastPointerX, lastPointerY);
                    slotUpdateScheduled = false;
                });
            }
        } else {
            scheduleHideDropSlot();
        }
    }

    function startDragging(e) {
        isDragging = true;
        const rect = draggedElement.getBoundingClientRect();
        
        // Если открыто редактирование описания для другого кадра, закрываем его
        if (window.isEditingDescription && window.editingDescription) {
            const editingFrameEl = window.editingDescription.descDiv ? window.editingDescription.descDiv.closest('.frame') : null;
            if (editingFrameEl && editingFrameEl !== draggedElement) {
                // Редактирование открыто для другого кадра - закрываем его
                if (typeof window.editingDescription.save === 'function') {
                    try { window.editingDescription.save(); } catch (e) { /* ignore */ }
                } else if (typeof window.editingDescription.cancel === 'function') {
                    try { window.editingDescription.cancel(); } catch (e) { /* ignore */ }
                }
            }
        }
        
        // Получаем данные кадра
        const frameIndex = parseInt(draggedElement.dataset.index);
        const store = window.storyboardStore;
        const frameData = store ? store.getFrameByIndex(frameIndex) : null;
        if (!frameData) {
            return;
        }
        
        // сохраняем контекст перемещения (используется в syncOrderFromDOM)
        window._draggingContext = {
            id: frameData.id,
            oldIndex: frameIndex,
            duration: Math.max(0, frameData.end - frameData.start)
        };

        // Запоминаем соседние элементы (фиксируем ограничения на время перетаскивания)
        neighborConstraints.clear();
        const prev = draggedElement.previousElementSibling && draggedElement.previousElementSibling.classList.contains('frame')
            ? draggedElement.previousElementSibling
            : null;
        const next = draggedElement.nextElementSibling && draggedElement.nextElementSibling.classList.contains('frame')
            ? draggedElement.nextElementSibling
            : null;
        if (prev && prev.dataset && prev.dataset.id != null) {
            neighborConstraints.set(String(prev.dataset.id), 'before');
        }
        if (next && next.dataset && next.dataset.id != null) {
            neighborConstraints.set(String(next.dataset.id), 'after');
        }

        // подавляем скрытие панели кликом, пока идёт операция перетаскивания/сразу после drop
        window._suppressHideOnClick = true;

        // Показываем информацию о кадре в правой панели
        showFrameInfo(frameData);

        dragClone = draggedElement.cloneNode(true);
        const del = dragClone.querySelector('.frame-delete-btn');
        if (del) del.remove();

        dragClone.style.position = 'fixed';
        dragClone.style.left = '0';
        dragClone.style.top = '0';
        dragClone.style.width = `${rect.width}px`;
        dragClone.style.height = `${rect.height}px`;
        dragClone.style.margin = '0';
        dragClone.style.zIndex = 10000;
        dragClone.style.pointerEvents = 'none';
        dragClone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
        dragClone.style.willChange = 'transform';
        dragClone.style.transition = 'none';
        dragClone.style.opacity = '0.7';

        document.body.appendChild(dragClone);

        draggedElement.style.opacity = '0.35';
        draggedElement.style.pointerEvents = 'none';
        draggedElement.classList.add('dragging');

        ensureDropSlot();
    }

    function ensureDropSlot() {
        if (!dropSlot) {
            dropSlot = document.createElement('div');
            dropSlot.className = 'drop-slot';
            dropSlot.style.transition = 'opacity 360ms ease, transform 360ms ease, height 360ms ease';
            dropSlot.style.opacity = '0';
            dropSlot.style.transform = 'translateY(-6px)';
            // чтобы elementFromPoint не возвращал его
            dropSlot.style.pointerEvents = 'none';
        }
    }

    // Функция для отмены перетаскивания
    function cancelDrag() {
        
        // Удаляем все обработчики
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('contextmenu', onContextMenu);
        
        container.removeEventListener('scroll', onAnyScroll);
        window.removeEventListener('scroll', onAnyScroll);
        window.removeEventListener('wheel', onAnyScroll);
        
        // Очищаем таймеры
        clearHoverTimeout();
        clearHideTimeout();
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        
        // Восстанавливаем оригинальный элемент
        restoreOriginal();
        
        // Удаляем клон
        destroyClone();
        
        // Удаляем слот
        removeDropSlot();
        
        // Полная очистка состояния
        cleanup();

        // Убедимся, что флаг сброшен
        window._suppressHideOnClick = false;
        // и контекст перетаскивания очищен
        window._draggingContext = null;
    }

    function hideDropSlot() {
        clearHoverTimeout();
        slotVisible = false;

        if (dropSlot && dropSlot.parentNode) {
            dropSlot.style.opacity = '0';
            dropSlot.style.transform = 'translateY(-6px)';
            // Сохраняем таймаут удаления, чтобы его можно было отменить при быстром переключении слотов
            removeSlotTimeout = setTimeout(() => {
                removeSlotTimeout = null;
                removeDropSlot();
            }, 380); // немного больше, чем transition
        } else {
            removeDropSlot();
        }
    }

    function updateSlotAtPoint(clientX, clientY) {
        // 1) Если слот уже видим — проверяем возможный сдвиг/переключение позиции
        if (currentSlotTarget && dropSlot && dropSlot.parentNode && slotVisible) {
            const frameRect = currentSlotTarget.frame.getBoundingClientRect();
            const centerY = frameRect.top + frameRect.height / 2;

            // Учёт ограничения для уже выбранного target'а (если есть)
            const curKey = currentSlotTarget.frame && currentSlotTarget.frame.dataset ? String(currentSlotTarget.frame.dataset.id) : null;
            const curConstraint = curKey ? neighborConstraints.get(curKey) : null;

            // Если есть ограничение и курсор не в нужной половине — скрываем слот
            if (curConstraint === 'before' && clientY > centerY) {
                // курсор ниже середины — для "только сверху" скрываем
                scheduleHideDropSlot();
                return;
            }
            if (curConstraint === 'after' && clientY < centerY) {
                // курсор выше середины — для "только снизу" скрываем
                scheduleHideDropSlot();
                return;
            }

            // Вычисляем новое положение (учитываем constraint, если он есть)
            let newInsertBefore;
            if (curConstraint === 'before') newInsertBefore = true;
            else if (curConstraint === 'after') newInsertBefore = false;
            else newInsertBefore = clientY < centerY;

            if (newInsertBefore !== currentSlotTarget.insertBefore) {
                clearHoverTimeout();
                clearHideTimeout();

                if (dropSlot && dropSlot.parentNode) {
                    dropSlot.parentNode.removeChild(dropSlot);
                }
                slotVisible = false;

                currentSlotTarget = {
                    frame: currentSlotTarget.frame,
                    insertBefore: newInsertBefore,
                    rect: frameRect
                };

                showDropSlot(currentSlotTarget.frame, newInsertBefore, frameRect);
                return;
            }

            checkExpandedZone(clientX, clientY);
            return;
        }

        // 2) Пытаемся найти кадр под курсором
        const element = document.elementFromPoint(clientX, clientY);
        const frame = element && element.closest ? element.closest('.frame') : null;

        // --- Обработка случая "вставка в конец" ---
        if (!frame || frame.classList.contains('dragging')) {
            const frames = container.querySelectorAll('.frame');
            const lastFrame = frames.length ? frames[frames.length - 1] : null;

            if (lastFrame) {
                const lastRect = lastFrame.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const TOLERANCE = 8;

                // Если у последнего кадра есть constraint, учитываем и его (хотя обычно нет)
                const lastKey = lastFrame.dataset && lastFrame.dataset.id != null ? String(lastFrame.dataset.id) : null;
                const lastConstraint = lastKey ? neighborConstraints.get(lastKey) : null;
                if (lastConstraint === 'before') {
                    // если последнему жестко разрешено только before, не показываем вставку после конца
                    clearHoverTimeout();
                    return;
                }

                if (clientY > lastRect.bottom - TOLERANCE || clientY > containerRect.bottom - TOLERANCE) {
                    if (currentSlotTarget && currentSlotTarget.frame === lastFrame && currentSlotTarget.insertBefore === false) {
                        if (slotVisible) return;
                        clearHideTimeout();
                        showDropSlot(lastFrame, false, lastRect);
                        return;
                    }

                    clearHoverTimeout();
                    clearHideTimeout();
                    currentSlotTarget = {
                        frame: lastFrame,
                        insertBefore: false,
                        rect: lastRect
                    };
                    showDropSlot(lastFrame, false, lastRect);
                    return;
                }
            }

            // Если курсор не внизу — не показываем
            clearHoverTimeout();
            return;
        }

        // 3) Если у найденного кадра есть ограничение — применяем его только если курсор в нужной половине
        const rect = frame.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const frameKey = frame.dataset && frame.dataset.id != null ? String(frame.dataset.id) : null;
        const constraint = frameKey ? neighborConstraints.get(frameKey) : null;

        if (constraint === 'after') {
            // Только вставка ПОСЛЕ (снизу) — показываем только если курсор в нижней половине
            if (clientY >= centerY) {
                clearHoverTimeout();
                clearHideTimeout();
                currentSlotTarget = { frame: frame, insertBefore: false, rect: rect };
                showDropSlot(frame, false, rect);
            } else {
                clearHoverTimeout();
            }
            return;
        } else if (constraint === 'before') {
            // Только вставка ПЕРЕД (сверху) — показываем только если курсор в верхней половине
            if (clientY <= centerY) {
                clearHoverTimeout();
                clearHideTimeout();
                currentSlotTarget = { frame: frame, insertBefore: true, rect: rect };
                showDropSlot(frame, true, rect);
            } else {
                clearHoverTimeout();
            }
            return;
        }

        // 4) Обычный кадр под курсором — вставка до/после по центру
        const insertBefore = clientY < centerY;

        // Если цель не изменилась — не перезапускаем hoverTimeout
        if (currentSlotTarget && currentSlotTarget.frame === frame && currentSlotTarget.insertBefore === insertBefore) {
            if (slotVisible) return;   // уже видно
            if (hoverTimeout) return;  // уже планируется показать
        }

        clearHoverTimeout();
        currentSlotTarget = { frame: frame, insertBefore, rect: rect };

        // Показываем с небольшой задержкой для устойчивости
        hoverTimeout = setTimeout(() => {
            showDropSlot(frame, insertBefore, rect);
        }, SHOW_DELAY);
    }

    function checkExpandedZone(clientX, clientY) {
        if (!currentSlotTarget || !dropSlot) return;

        const frameRect = currentSlotTarget.frame.getBoundingClientRect();
        const dropSlotRect = dropSlot.getBoundingClientRect();

        let expandedRect;
        if (currentSlotTarget.insertBefore) {
            expandedRect = {
                left: Math.min(frameRect.left, dropSlotRect.left) - 20,
                right: Math.max(frameRect.right, dropSlotRect.right) + 20,
                top: Math.min(frameRect.top, dropSlotRect.top) - 50,
                bottom: Math.max(frameRect.bottom, dropSlotRect.bottom) + 15
            };
        } else {
            expandedRect = {
                left: Math.min(frameRect.left, dropSlotRect.left) - 20,
                right: Math.max(frameRect.right, dropSlotRect.right) + 20,
                top: Math.min(frameRect.top, dropSlotRect.top) - 15,
                bottom: Math.max(frameRect.bottom, dropSlotRect.bottom) + 50
            };
        }

        if (clientX >= expandedRect.left && clientX <= expandedRect.right &&
            clientY >= expandedRect.top && clientY <= expandedRect.bottom) {
            clearHideTimeout();
        } else {
            scheduleHideDropSlot();
        }
    }

    function clearHoverTimeout() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    }

    function clearHideTimeout() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        if (removeSlotTimeout) {
            clearTimeout(removeSlotTimeout);
            removeSlotTimeout = null;
        }
    }

    function scheduleHideDropSlot() {
        if (hideTimeout) return;
        hideTimeout = setTimeout(() => {
            hideDropSlot();
        }, HIDE_DELAY);
    }

    function showDropSlot(targetFrame, insertBefore, rect) {
        ensureDropSlot();

        // Любые отложенные скрытия/удаления слота отменяем — показываем гарантированно
        clearHideTimeout();
        clearHoverTimeout();

        // Если слот уже вставлен в нужное место — не делаем лишних операций
        if (dropSlot.parentNode === targetFrame.parentNode &&
            ((insertBefore && dropSlot.nextSibling === targetFrame) ||
             (!insertBefore && dropSlot.previousSibling === targetFrame))) {
            // слот уже на месте — просто показать (если скрыт)
            requestAnimationFrame(() => {
                dropSlot.style.opacity = '1';
                dropSlot.style.transform = 'translateY(0)';
                slotVisible = true;
            });
            return;
        }

        // Установим высоту слота равной высоте кадра
        dropSlot.style.height = `${rect.height}px`;

        // Если dropSlot находится где-то: удалим его прежде чем вставлять в новое место
        if (dropSlot.parentNode && dropSlot.parentNode !== targetFrame.parentNode) {
            dropSlot.parentNode.removeChild(dropSlot);
        }

        if (insertBefore) {
            targetFrame.insertAdjacentElement('beforebegin', dropSlot);
        } else {
            targetFrame.insertAdjacentElement('afterend', dropSlot);
        }

        requestAnimationFrame(() => {
            dropSlot.style.opacity = '1';
            dropSlot.style.transform = 'translateY(0)';
            slotVisible = true;
        });
    }

    function removeDropSlot() {
        if (removeSlotTimeout) {
            clearTimeout(removeSlotTimeout);
            removeSlotTimeout = null;
        }
        if (dropSlot && dropSlot.parentNode) dropSlot.parentNode.removeChild(dropSlot);
    }

    function handleAutoScroll(e) {
        const rect = container.getBoundingClientRect();
        const mouseY = e.clientY;

        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }

        if (mouseY < rect.top + scrollZoneHeight && container.scrollTop > 0) {
            autoScrollInterval = setInterval(() => {
                const speed = Math.min(40, (rect.top + scrollZoneHeight - mouseY) / 2 + baseScrollSpeed);
                container.scrollTop = Math.max(0, container.scrollTop - speed);
            }, 16);
        } else if (mouseY > rect.bottom - scrollZoneHeight && container.scrollTop < container.scrollHeight - container.clientHeight) {
            autoScrollInterval = setInterval(() => {
                const speed = Math.min(40, (mouseY - rect.bottom + scrollZoneHeight) / 2 + baseScrollSpeed);
                container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + speed);
            }, 16);
        }
    }

    async function onMouseUp(e) {
        // Удаляем все обработчики
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('contextmenu', onContextMenu);
        
        container.removeEventListener('scroll', onAnyScroll);
        window.removeEventListener('scroll', onAnyScroll);
        window.removeEventListener('wheel', onAnyScroll);

        clearHoverTimeout();
        clearHideTimeout();
        if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; }

        if (!isDragging) {
            cleanup();
            // Сбрасываем флаг на случай, если drag не начался
            window._suppressHideOnClick = false;
            return;
        }

        if (dropSlot && dropSlot.parentNode && currentSlotTarget) {
            const targetFrame = currentSlotTarget.frame;
            const insertBefore = currentSlotTarget.insertBefore;

            if (insertBefore) {
                targetFrame.parentNode.insertBefore(draggedElement, targetFrame);
            } else {
                targetFrame.parentNode.insertBefore(draggedElement, targetFrame.nextSibling);
            }

            destroyClone();
            restoreOriginal();
            removeDropSlot();

            // --- Синхронизируем порядок в данных и перерисовываем кадры ---
            try {
                // сохраняем текущую прокрутку контейнера, чтобы не прыгать в начало после renderFrames
                const prevScroll = container ? container.scrollTop : null;

                // Снимок до изменений (важно сделать ДО вызова syncOrderFromDOM)
                const store = window.storyboardStore;
                const beforeSnapshot = store && store.getSnapshot ? store.getSnapshot() : null;
                console.log('Captured beforeSnapshot', beforeSnapshot ? beforeSnapshot.map(f => f.frame_id) : null);
                
                await syncOrderFromDOM();
                // Sync with server
                if (store && store.dragAndDropFrame) {
                    const draggedId = draggedElement.dataset.id;
                    const framesEls = Array.from(container.querySelectorAll('.frame'));
                    const newIndex = framesEls.findIndex(el => el.dataset.id == draggedId);
                    if (newIndex !== -1) {
                        console.log('Calling dragAndDropFrame for', draggedId, 'to position', newIndex + 1);
                        await store.dragAndDropFrame(draggedId, newIndex + 1, beforeSnapshot);
                        console.log('dragAndDropFrame completed');
                    } else {
                        console.log('newIndex not found for draggedId', draggedId);
                    }
                } else {
                    console.log('store or dragAndDropFrame not available');
                }
                // небольшая отложенная перерисовка чтобы DOM успел обновиться
                setTimeout(() => {
                    if (window.renderFrames) window.renderFrames();
                    if (window.updateLeftScrollbar) window.updateLeftScrollbar();
                    // Восстанавливаем scroll: предпочитаем прокрутить к перенесённому кадру (если он найден),
                    // иначе восстанавливаем сохранённый scrollTop
                    try {
                        if (container && prevScroll != null) {
                            const ctx = window._draggingContext;
                            let scrolledToFrame = false;
                            if (ctx && ctx.id != null) {
                                const movedEl = container.querySelector(`.frame[data-id="${ctx.id}"]`);
                                if (movedEl) {
                                    movedEl.scrollIntoView({ block: 'nearest' });
                                    scrolledToFrame = true;
                                }
                            }
                            if (!scrolledToFrame) {
                                container.scrollTop = prevScroll;
                            }
                        }
                    } catch (err) { /* ignore scroll restore errors */ }
                }, 0);
            } catch (err) { /* ignore */ }
        } else {
            destroyClone();
            restoreOriginal();
            removeDropSlot();
        }

        cleanup();

        // Сбросим флаг через короткий таймаут, чтобы "click" после mouseup не закрыл панель
        setTimeout(() => {
            window._suppressHideOnClick = false;
        }, 60);
    }

    function destroyClone() {
        if (dragClone && dragClone.parentNode) dragClone.parentNode.removeChild(dragClone);
        dragClone = null;
    }

    function restoreOriginal() {
        if (!draggedElement) return;
        draggedElement.style.opacity = '1';
        draggedElement.style.pointerEvents = '';
        draggedElement.classList.remove('dragging');
    }

    function cleanup() {
        isDragging = false;
        draggedElement = null;
        dragClone = null;
        clearHoverTimeout();
        clearHideTimeout();
        if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; }
        slotUpdateScheduled = false;
        lastPointerX = lastPointerY = 0;
        currentSlotTarget = null;
        slotVisible = false;
        neighborConstraints.clear(); // очистка ограничений
        document.body.classList.remove('no-select', 'dragging-active');
        // очистка глобального контекста перетаскивания
        window._draggingContext = null;
    }

    function addHandlers() {
        if (!container) return;
        container.querySelectorAll('.frame').forEach(frame => {
            frame.draggable = false;
            frame.removeEventListener('mousedown', onMouseDown);
            frame.addEventListener('mousedown', onMouseDown);
        });
    }

    const originalRender = window.renderFrames;
    window.renderFrames = function() {
        if (originalRender) originalRender();
        addHandlers();
    };

    addHandlers();
}

// Синхронизировать порядок кадров в данных (frames[].number) по текущему порядку DOM
async function syncOrderFromDOM() {
    try {
        const container = document.getElementById('framesContainer');
        if (!container) return;
        const store = window.storyboardStore;
        if (!store) return;

        // Снимок до изменений
        const before = store.getSnapshot ? store.getSnapshot() : null;

        // Включаем подавление внутренних undo-записей на время пакетной операции
        store._suppressUndo = true;

        // Сохраняем исходные длительности (по id) и старт первого кадра, чтобы пересчитать таймлайны корректно
        const originalFrames = store.getFrames();
        const durationsById = {};
        originalFrames.forEach(f => { durationsById[String(f.id)] = Math.max(0, (f.end - f.start) || 0); });
        const originalFirstStart = originalFrames.length ? originalFrames[0].start : 0;

        const framesEls = Array.from(container.querySelectorAll('.frame'));
        framesEls.forEach((el, idx) => {
            const id = el.dataset.id;
            if (id == null) return;
            store.setFrameValuesById(id, { number: idx + 1 });
        });

        const ctx = window._draggingContext;
        if (ctx && ctx.id != null) {
            const finalIds = framesEls.map(el => String(el.dataset.id));
            let currentStart = originalFirstStart;
            finalIds.forEach(id => {
                const dur = durationsById[String(id)] != null ? durationsById[String(id)] : 15;
                const start = Math.round(Math.max(0, currentStart));
                const end = Math.round(start + dur);
                store.setFrameValuesById(id, { start, end });
                currentStart = end;
            });
            // UI will be updated after dragAndDropFrame call in onMouseUp
        }

        store._suppressUndo = false;
        const after = store.getSnapshot ? store.getSnapshot() : null;

        if (window.undoManager && before && after) {
            window.undoManager.pushAction({ type: 'reorder', before, after, meta: { context: window._draggingContext || null } });
        }
    } catch (e) {
        /* syncOrderFromDOM failed */
    }
}

window.initFramesDragDrop = initFramesDragDrop;