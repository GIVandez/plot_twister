// frames-click.js — обработка кликов по кадрам для показа информации
function initFramesClick() {
    let currentSelectedFrame = null;
    
    async function handleFrameClick(e) {
        // Игнорируем клики по кнопкам, элементам редактирования времени и описанию кадра
        if (e.target.closest('.frame-delete-btn') || 
            e.target.classList.contains('frame-time-edit') ||
            e.target.closest('.frame-button') ||
            e.target.closest('.frame-description') ||
            e.target.closest('.frame-description-edit')) {
            return;
        }
        
        const frame = e.target.closest('.frame');
        if (!frame) return;
        
        // Если открыт редактор описания в другом кадре — запускаем сохранение (с анимацией) перед переключением,
        // но не await'им его, чтобы запускать открытие нового одновременно.
        if (window.isEditingDescription && window.editingDescription) {
            const editingFrameEl = window.editingDescription.descDiv ? window.editingDescription.descDiv.closest('.frame') : null;
            if (editingFrameEl && editingFrameEl !== frame) {
                if (typeof window.editingDescription.save === 'function') {
                    // Запускаем save(), но не ждём
                    try { window.editingDescription.save(); } catch (e) { /* ignore */ }
                } else if (typeof window.editingDescription.cancel === 'function') {
                    try { window.editingDescription.cancel(); } catch (e) { /* ignore */ }
                }
                // Не ждём descriptionAnimationPromise — хотим одновременную анимацию
            }
        }
        
        const frameIndex = parseInt(frame.dataset.index);
        const store = window.storyboardStore;
        const frameData = store ? store.getFrameByIndex(frameIndex) : null;
        
        if (!frameData) return;
        
        // Проверяем, не открыта ли уже информация для этого кадра
        const infoSection = document.querySelector('.info-section');
        const existingInfo = infoSection ? infoSection.querySelector('.frame-info-display') : null;
        if (existingInfo && frameData.id) {
            const existingFrameId = existingInfo.dataset.frameId;
            // Если информация уже открыта для этого кадра, ничего не делаем
            if (existingFrameId && String(existingFrameId) === String(frameData.id)) {
                return;
            }
        }
        
        // Убираем выделение с предыдущего кадра
        if (currentSelectedFrame && currentSelectedFrame !== frame) {
            currentSelectedFrame.classList.remove('frame-selected');
        }
        
        // Добавляем выделение текущему кадру
        frame.classList.add('frame-selected');
        currentSelectedFrame = frame;
        
        // Закрываем страницу сценария и показываем информацию о кадре
        hideScriptPage();
        showFrameInfo(frameData);
    }
    
    function handleDocumentClick(e) {
        // Если временно подавлено скрытие (например, drop генерирует клик) — не прячем панель
        if (window._suppressHideOnClick) {
            return;
        }

        // Если клик вне кадра, скрываем информацию
        if (!e.target.closest('.frame') && !e.target.closest('.frame-info-display')) {
            hideFrameInfo();
            
            // Убираем выделение
            if (currentSelectedFrame) {
                currentSelectedFrame.classList.remove('frame-selected');
                currentSelectedFrame = null;
            }
        }
    }
    
    // Добавляем обработчики ко всем кадрам
    function addClickHandlers() {
        const container = document.getElementById('framesContainer');
        if (!container) return;
        
        container.querySelectorAll('.frame').forEach(frame => {
            frame.removeEventListener('click', handleFrameClick);
            frame.addEventListener('click', handleFrameClick);
        });
    }
    
    // Добавляем обработчик клика по документу для скрытия информации
    document.removeEventListener('click', handleDocumentClick);
    document.addEventListener('click', handleDocumentClick);
    
    // Перехватываем рендер кадров для добавления обработчиков
    const originalRender = window.renderFrames;
    window.renderFrames = function() {
        if (originalRender) originalRender();
        addClickHandlers();
    };
    
    addClickHandlers();
}

window.initFramesClick = initFramesClick;