// main.js - обновленная инициализация
document.addEventListener('DOMContentLoaded', () => {
    
    // Выравнивание блока статистики так, чтобы его правый край совпадал с правым краем .storyboard-section
    function alignMenuStats() {
        try {
            const menu = document.querySelector('.top-menu');
            const menuStats = document.getElementById('menuStats');
            if (!menu || !menuStats) return;

            // Позиционируем .menu-stats по правому краю с фиксированным отступом 10px, как в script.html
            menuStats.style.position = 'absolute';
            menuStats.style.right = '10px';
        } catch (e) {
            /* ignore layout errors */
        }
    }

    // Вызываем выравнивание при ресайзе и после рендера кадров
    window.addEventListener('resize', () => {
        requestAnimationFrame(alignMenuStats);
    }, { passive: true });
    // Выравниваем после обновления скроллбара (когда layout может поменяться)
    window.updateLeftScrollbar = (window.updateLeftScrollbar ? (function(prev){ return function(){ prev(); alignMenuStats(); }; })(window.updateLeftScrollbar) : alignMenuStats);

    // Функция обновления статистики в шапке
    function updateTopMenuStats() {
        const framesCountEl = document.getElementById('framesCount');
        const durationEl = document.getElementById('storyDuration');
        const store = window.storyboardStore;
        if (!framesCountEl || !durationEl || !store) return;

        const frames = store.getFrames();
        framesCountEl.textContent = String(frames.length);

        if (frames.length === 0) {
            durationEl.textContent = window.formatTime ? window.formatTime(0) : '00:00';
        } else {
            let minStart = Infinity, maxEnd = -Infinity;
            frames.forEach(f => {
                if (typeof f.start === 'number') minStart = Math.min(minStart, f.start);
                if (typeof f.end === 'number') maxEnd = Math.max(maxEnd, f.end);
            });
            const duration = Math.max(0, (isFinite(minStart) ? maxEnd - minStart : maxEnd));
            durationEl.textContent = window.formatTime ? window.formatTime(duration) : '00:00';
        }
        // Обновляем позиционирование статистики (на случай изменения ширины left section)
        alignMenuStats();
    }

    // Оборачиваем renderFrames чтобы статистика обновлялась после каждого рендера
    if (window.renderFrames && !window._renderFramesWrapped) {
        const originalRender = window.renderFrames;
        window.renderFrames = function() {
            originalRender();
            try { updateTopMenuStats(); } catch (e) { /* ignore */ }
        };
        window._renderFramesWrapped = true;
    }
    
    // Инициализация левой части
    if (window.renderFrames) {
        window.renderFrames();
    }
    // Первоначальное обновление статистики (на случай, если renderFrames не был заматчен)
    try { updateTopMenuStats(); } catch (e) { /* ignore */ }
    // Инициалное выравнивание статистики
    requestAnimationFrame(alignMenuStats);
    
    if (window.initFramesDragDrop) {
        window.initFramesDragDrop();
    }
    
    if (window.initFramesClick) {
        window.initFramesClick();
    }
    
    if (window.initAddFrameButton) {
        window.initAddFrameButton();
    }

    // Инициализация кастомного ползунка слева
    if (typeof initLeftScrollbar === 'function') {
        initLeftScrollbar();
    }

    // Глобальный обработчик Esc: если нет активной редакции (ни слева ни в info-section), закрываем info-section
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        // Если открыт редактор описания — он сам обрабатывает Esc (сохранение), поэтому ничего не делаем
        if (window.isEditingDescription) return;

        // Если фокус сейчас внутри info-section в input/textarea или contenteditable — считаем, что идёт редактирование и не закрываем
        const infoSection = document.querySelector('.info-section');
        const active = document.activeElement;
        if (infoSection && active && infoSection.contains(active) &&
            (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            return;
        }

        if (typeof hideFrameInfo === 'function') hideFrameInfo();
        if (typeof hideScriptPage === 'function') hideScriptPage();
    });

    // Новое: Ctrl+Z / Cmd+Z для отмены последнего действия (undo) и Ctrl+Shift+Z для redo
    document.addEventListener('keydown', (e) => {
        const isUndo = (e.ctrlKey || e.metaKey) && (e.key && e.key.toLowerCase() === 'z') && !e.shiftKey;
        const isRedo = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key && e.key.toLowerCase() === 'z');
        if (!isUndo && !isRedo) return;
        e.preventDefault();
        if (isRedo) {
            if (window.undoManager && typeof window.undoManager.redo === 'function') {
                window.undoManager.redo();
            }
        } else {
            if (window.undoManager && typeof window.undoManager.undo === 'function') {
                window.undoManager.undo();
            }
        }
    });

    // --- Добавляем управление кнопками Undo / Redo ---
    function initUndoRedoButtons() {
        const undoBtn = document.querySelector('.menu-btn.undo-btn');
        const redoBtn = document.querySelector('.menu-btn.redo-btn');

        function updateButtons() {
            const um = window.undoManager;
            const canUndo = um && typeof um.canUndo === 'function' ? um.canUndo() : false;
            const canRedo = um && typeof um.canRedo === 'function' ? um.canRedo() : false;
            if (undoBtn) undoBtn.disabled = !canUndo;
            if (redoBtn) redoBtn.disabled = !canRedo;
        }

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (window.undoManager && typeof window.undoManager.undo === 'function') {
                    window.undoManager.undo();
                }
                updateButtons();
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (window.undoManager && typeof window.undoManager.redo === 'function') {
                    window.undoManager.redo();
                }
                updateButtons();
            });
        }

        // Listen to global stack-change events
        window.addEventListener('undoStackChanged', updateButtons);

        // initial state
        updateButtons();
    }
    // Инициализируем после основных инициализаций
    try { initUndoRedoButtons(); } catch (e) { /* ignore */ }

    // Инициализация left scrollbar (позиционируется поверх gap между секциями)
    function initLeftScrollbar() {
        const container = document.getElementById('framesContainer');
        const scrollbar = document.getElementById('leftScrollbar');
        const thumb = document.getElementById('leftScrollThumb');
        const leftSection = document.querySelector('.storyboard-section');
        const mainContainer = document.querySelector('.main-container');

        if (!container || !scrollbar || !thumb || !leftSection || !mainContainer) return;

        function clamp(n, low, high) {
            return Math.max(low, Math.min(high, n));
        }

        function updatePosition() {
            const mainRect = mainContainer.getBoundingClientRect();
            const leftRect = leftSection.getBoundingClientRect();
            const cs = getComputedStyle(leftSection);
            const padTop = parseFloat(cs.paddingTop) || 0;
            const padBottom = parseFloat(cs.paddingBottom) || 0;

            const width = 6;   // ширина ползунка
            const minGap = 6;  // минимальный зазор между ползунком и storyboard-section

            // top/height в координатах mainContainer (относительно mainRect)
            const top = Math.round((leftRect.top - mainRect.top) + padTop);
            const height = Math.round(Math.max(0, leftRect.height - padTop - padBottom));

            // leftSection.left в координатах mainContainer (расстояние от левого края main-container до storyboard-section)
            const leftSectionX = Math.round(leftRect.left - mainRect.left);

            // Центр промежутка между левым краем main-container и левой границей storyboard-section
            const centerInContainer = leftSectionX / 2;

            // Ставим ползунок так, чтобы его центр совпадал с центром промежутка
            let left = Math.round(centerInContainer - (width / 2));

            // Ограничиваем left: не меньше 4 и не заходить на storyboard-section (maxLeft)
            const maxLeft = Math.max(4, leftSectionX - width - minGap);
            left = clamp(left, 4, maxLeft);

            // Применяем позиционирование (в координатах main-container)
            scrollbar.style.display = 'flex';
            scrollbar.style.width = `${width}px`;
            scrollbar.style.left = `${left}px`;
            scrollbar.style.right = 'auto';
            scrollbar.style.top = `${top}px`;
            scrollbar.style.height = `${height}px`;
            scrollbar.style.zIndex = '220';

            updateThumb();
        }

        function updateThumb() {
            const scrollbarHeight = Math.max(1, Math.round(scrollbar.clientHeight));
            const visible = container.clientHeight;
            const total = Math.max(1, container.scrollHeight);
            const thumbHeight = Math.max(24, Math.round((visible / total) * scrollbarHeight));
            const trackHeight = Math.max(0, scrollbarHeight - thumbHeight);
            const scrollable = Math.max(0, total - visible);
            const scrollRatio = scrollable > 0 ? Math.min(1, Math.max(0, container.scrollTop / scrollable)) : 0;

            thumb.style.height = `${thumbHeight}px`;
            thumb.style.transform = `translateY(${Math.round(scrollRatio * trackHeight)}px)`;
            thumb.style.opacity = '1';
        }

        // Drag logic (unchanged)
        let dragging = false;
        let startY = 0;
        let startScroll = 0;
        thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            dragging = true;
            startY = e.clientY;
            startScroll = container.scrollTop;
            document.body.classList.add('no-select');
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const scrollbarHeight = Math.max(1, scrollbar.clientHeight);
            const visible = container.clientHeight;
            const thumbH = thumb.getBoundingClientRect().height;
            const track = Math.max(1, scrollbarHeight - thumbH);
            const scrollable = Math.max(0, container.scrollHeight - visible);
            const delta = e.clientY - startY;
            const newScroll = startScroll + (delta / track) * scrollable;
            container.scrollTop = Math.max(0, Math.min(scrollable, newScroll));
        });

        document.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                document.body.classList.remove('no-select');
            }
        });

        // Click on track
        scrollbar.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = scrollbar.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const scrollbarHeight = Math.max(1, scrollbar.clientHeight);
            const visible = container.clientHeight;
            const thumbH = thumb.getBoundingClientRect().height;
            const track = Math.max(1, scrollbarHeight - thumbH);
            const scrollable = Math.max(0, container.scrollHeight - visible);
            const center = clickY - thumbH / 2;
            const ratio = Math.max(0, Math.min(1, center / track));
            container.scrollTop = Math.round(ratio * scrollable);
        });

        // Sync events
        container.addEventListener('scroll', () => {
            requestAnimationFrame(updateThumb);
        });

        window.addEventListener('resize', () => {
            requestAnimationFrame(updatePosition);
        });

        window.addEventListener('scroll', () => {
            requestAnimationFrame(updatePosition);
        }, { passive: true });

        try {
            const ro = new ResizeObserver(() => {
                requestAnimationFrame(updatePosition);
            });
            ro.observe(leftSection);
            ro.observe(mainContainer);
            ro.observe(container);
        } catch (e) {
            window.addEventListener('resize', () => {
                requestAnimationFrame(updatePosition);
            });
        }

        window.updateLeftScrollbar = updatePosition;

        // initial initialization and a short follow-up to ensure sizes are settled
        setTimeout(updatePosition, 50);
        setTimeout(updatePosition, 250);
    }
});