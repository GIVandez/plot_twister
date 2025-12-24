// page-selector.js — модальное окно выбора страницы для связки с кадром
// Реализация аналогична pagesList.js с плавными анимациями

(function() {
    let pages = [];
    let pendingFrameIndex = null;
    
    // === CORE STATE ===
    let targetIndex = 0;
    let currentPosition = 0;
    let animationStartPosition = 0;
    let animationStartTime = 0; // для анимации ползунка (slider)
    let isAnimating = false;
    let animationFrameId = null;
    let lastFrameTime = 0;
    
    // === SLIDER STATE ===
    let isDragging = false;
    
    // === BUTTON HOLD STATE ===
    let holdInterval = null;
    let holdDirection = null;
    let holdStartTime = 0;
    
    // === ANIMATION SETTINGS ===
    const SLIDER_ANIMATION_DURATION = 1000000;
    const HOLD_DELAY = 400;
    const HOLD_INTERVAL = 100;
    const HOLD_FAST_INTERVAL = 50;
    const HOLD_FAST_AFTER = 1500;
    const SMOOTH_FACTOR = 0.15; // увеличено с 0.05 для более быстрой сходимости
    const SNAP_THRESHOLD = 0.01; // порог для мгновенного снэпа

    const modal = document.getElementById('pageSelectorModal');
    const overlay = modal ? modal.querySelector('.page-selector-overlay') : null;
    const track = document.getElementById('pageSelectorTrack');
    const leftArrow = document.getElementById('pageSelectorLeft');
    const rightArrow = document.getElementById('pageSelectorRight');
    const scrollbar = modal ? modal.querySelector('.page-selector-scrollbar') : null;
    const scrollbarTrack = modal ? modal.querySelector('.page-selector-scrollbar-track') : null;
    const thumb = document.getElementById('pageSelectorThumb');
    const confirmBtn = document.getElementById('pageSelectorConfirm');

    // === EASING FUNCTION ===
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // === TEXT TRUNCATION ===
    function truncateText(text, maxLength = 1500) {
        if (!text) return '';
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText.length <= maxLength) return cleanText;
        return cleanText.substring(0, maxLength).trim() + '...';
    }

    // === CARD CREATION ===
    function createPageCard(pageNum, pageText) {
        const item = document.createElement('div');
        item.className = 'page-selector-item';
        item.dataset.pageNum = pageNum;

        item.innerHTML = `
            <div class="page-selector-item-inner">
                <div class="page-header"></div>
                <div class="page-content">
                    <p class="page-text">${truncateText(pageText)}</p>
                </div>
                <div class="page-footer">
                    <span class="page-number">${pageNum}</span>
                </div>
            </div>
        `;

        return item;
    }

    // === POSITION CALCULATIONS ===
    function getCardTransform(offset, cardWidth) {
        const absOffset = Math.abs(offset);
        
        if (absOffset > 2.5) {
            const sign = offset < 0 ? -1 : 1;
            return {
                x: sign * cardWidth * 1.95,
                z: -340,
                brightness: 0,
                zIndex: 0,
                pointerEvents: 'none'
            };
        }
        
        let x, z, brightness;
        
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
        
        return { x, z, brightness, zIndex, pointerEvents: absOffset < 2.5 ? 'auto' : 'none' };
    }

    function applyCardTransform(card, transform, cardTopOffset) {
        card.style.transform = `translate3d(${transform.x}px, ${cardTopOffset}px, ${transform.z}px)`;
        card.style.filter = `brightness(${transform.brightness})`;
        card.style.zIndex = transform.zIndex;
        card.style.pointerEvents = transform.pointerEvents;
        
        if (transform.brightness <= 0) {
            card.style.visibility = 'hidden';
        } else {
            card.style.visibility = 'visible';
        }
    }

    // === RENDERING ===
    function getVisibleRange(position) {
        const center = position;
        const base = Math.floor(center);
        const start = Math.max(0, base - 4);
        const end = Math.min(pages.length - 1, base + 4);
        return { start, end };
    }

    function updateCards() {
        if (!track || pages.length === 0) return;
        
        const sample = track.querySelector('.page-selector-item');
        const cardWidth = sample ? sample.offsetWidth : 320;
        const cardTopOffset = 15;
        
        const range = getVisibleRange(currentPosition);
        
        const existingCards = track.querySelectorAll('.page-selector-item');
        existingCards.forEach(card => {
            const pn = Number(card.dataset.pageNum);
            const idx = pages.findIndex(p => p.num === pn);
            if (idx === -1 || idx < (range.start - 1) || idx > (range.end + 1)) {
                card.remove();
            }
        });
        
        for (let idx = range.start; idx <= range.end; idx++) {
            const page = pages[idx];
            if (!page) continue;
            
            let card = track.querySelector(`[data-page-num="${page.num}"]`);
            
            if (!card) {
                card = createPageCard(page.num, page.text);
                track.appendChild(card);
                
                card.addEventListener('click', () => {
                    const clickedIdx = pages.findIndex(p => p.num === page.num);
                    if (clickedIdx !== -1 && clickedIdx !== targetIndex) {
                        navigateTo(clickedIdx);
                    }
                });
            }
            
            const offset = idx - currentPosition;
            const transform = getCardTransform(offset, cardWidth);
            applyCardTransform(card, transform, cardTopOffset);
        }
    }

    // === UI UPDATES ===
    function updateSlider() {
        if (!thumb || !scrollbarTrack || pages.length <= 1) return;
        
        const progress = pages.length > 1 ? (currentPosition / (pages.length - 1)) * 100 : 0;
        thumb.style.left = `${progress}%`;
        
        // Update fill if exists
        let fill = scrollbarTrack.querySelector('.page-selector-scrollbar-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'page-selector-scrollbar-fill';
            scrollbarTrack.insertBefore(fill, thumb);
        }
        fill.style.width = `${progress}%`;
    }

    function updateButtons() {
        if (leftArrow) {
            leftArrow.disabled = targetIndex === 0;
        }
        if (rightArrow) {
            rightArrow.disabled = targetIndex >= pages.length - 1;
        }
    }

    // === ANIMATION LOOP ===
    function animate(timestamp) {
        // Initialize lastFrameTime to avoid huge dt on first frame
        if (!lastFrameTime) lastFrameTime = timestamp;
        
        // Clamp dt to avoid jumps when tab was inactive or first frame
        const dt = Math.min(64, timestamp - lastFrameTime);
        lastFrameTime = timestamp;
        
        // If dragging, follow the pointer exactly (no smoothing) for instant feedback
        if (isDragging) {
            currentPosition = targetIndex;
            updateCards();
            updateSlider();
            animationFrameId = requestAnimationFrame(animate);
            return;
        }
        
        const diff = targetIndex - currentPosition;
        const absDiff = Math.abs(diff);
        
        // Snap immediately if very close to target
        if (absDiff < SNAP_THRESHOLD) {
            currentPosition = targetIndex;
            updateCards();
            updateSlider();
            isAnimating = false;
            animationFrameId = null;
            lastFrameTime = 0;
            return;
        }
        
        // Smoothly approach the target
        const alpha = 1 - Math.pow(1 - SMOOTH_FACTOR, dt / 16);
        let step = diff * alpha;
        
        // Ensure minimum step to avoid slow crawling at the end
        const minStep = 0.002 * (diff > 0 ? 1 : -1);
        if (Math.abs(step) < Math.abs(minStep) && absDiff > SNAP_THRESHOLD) {
            step = minStep;
        }
        
        // Don't overshoot
        if (Math.abs(step) > absDiff) {
            currentPosition = targetIndex;
        } else {
            currentPosition += step;
        }
        
        updateCards();
        updateSlider();
        
        animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        animationStartPosition = currentPosition;
        if (!isAnimating) {
            // reset timer only when starting a new animation loop
            lastFrameTime = 0;
            isAnimating = true;
            animationFrameId = requestAnimationFrame(animate);
        }
     }
     
    // === NAVIGATION ===
    function navigateTo(index) {
        const clampedIndex = Math.max(0, Math.min(pages.length - 1, index));
        if (clampedIndex !== targetIndex || isAnimating) {
            targetIndex = clampedIndex;
            updateButtons();
            startAnimation();
        }
    }

    function navigateBy(delta) {
        navigateTo(targetIndex + delta);
    }

    // slideToIndex принимает дробной индекс (для плавного перетаскивания)
    function slideToIndex(index) {
        const clampedIndex = Math.max(0, Math.min(pages.length - 1, index));
        if (clampedIndex !== targetIndex) {
            targetIndex = clampedIndex;
            animationStartPosition = currentPosition;
            updateButtons();
            startAnimation();
        }
    }
 
    // === BUTTON HANDLERS ===
    function startHold(direction) {
        if (holdInterval) return;
        
        holdDirection = direction;
        holdStartTime = Date.now();
        
        navigateBy(direction);
        
        holdInterval = setTimeout(() => {
            holdInterval = setInterval(() => {
                const elapsed = Date.now() - holdStartTime;
                
                navigateBy(holdDirection);
                
                if (elapsed > HOLD_FAST_AFTER && holdInterval) {
                    clearInterval(holdInterval);
                    holdInterval = setInterval(() => {
                        navigateBy(holdDirection);
                    }, HOLD_FAST_INTERVAL);
                }
            }, HOLD_INTERVAL);
        }, HOLD_DELAY);
    }

    function stopHold() {
        if (holdInterval) {
            clearTimeout(holdInterval);
            clearInterval(holdInterval);
            holdInterval = null;
        }
        holdDirection = null;
    }

    // Left arrow
    if (leftArrow) {
        leftArrow.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startHold(-1);
        });
        leftArrow.addEventListener('mouseup', stopHold);
        leftArrow.addEventListener('mouseleave', stopHold);
    }

    // Right arrow
    if (rightArrow) {
        rightArrow.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startHold(1);
        });
        rightArrow.addEventListener('mouseup', stopHold);
        rightArrow.addEventListener('mouseleave', stopHold);
    }

    // === SLIDER HANDLERS ===
    function getSliderIndex(e) {
        if (!scrollbarTrack || pages.length === 0) return 0;
        const rect = scrollbarTrack.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        // возвращаем дробной индекс для плавного перетаскивания
        return percent * (pages.length - 1);
    }

    function handleSliderStart(e) {
        // start drag (mouse or touch). Prevent page scroll on touch.
        if (e && e.type && e.type.indexOf('touch') === 0) e.preventDefault();
         isDragging = true;
         if (thumb) thumb.classList.add('dragging');
         
         const index = getSliderIndex(e);
         slideToIndex(index);
    }

    function handleSliderMove(e) {
        if (!isDragging) return;
        if (e && e.touches) e.preventDefault(); // prevent page scroll while dragging
        const index = getSliderIndex(e);
        slideToIndex(index);
    }

    function handleSliderEnd() {
        if (isDragging) {
            isDragging = false;
            if (thumb) thumb.classList.remove('dragging');
            // snap to nearest page on release and animate to it
            targetIndex = Math.round(currentPosition);
            updateButtons();
            startAnimation();
        }
    }

    if (scrollbar) {
        scrollbar.addEventListener('mousedown', handleSliderStart);
        scrollbar.addEventListener('touchstart', handleSliderStart, { passive: false });
    }
    // also enable dragging by thumb itself
    if (thumb) {
        thumb.addEventListener('mousedown', handleSliderStart);
        thumb.addEventListener('touchstart', handleSliderStart, { passive: false });
    }
    document.addEventListener('mousemove', handleSliderMove);
    document.addEventListener('mouseup', handleSliderEnd);
    // touch support on document to reliably catch moves/ends
    document.addEventListener('touchmove', handleSliderMove, { passive: false });
    document.addEventListener('touchend', handleSliderEnd);

    function renderPages() {
        if (!track) return;
        track.innerHTML = '';

        const store = window.storyboardStore;
        if (!store) return;

        pages = store.getPages();
        
        targetIndex = 0;
        currentPosition = 0;
        animationStartPosition = 0;
        
        updateCards();
        updateSlider();
        updateButtons();
    }

    function openModal(frameIndex) {
        pendingFrameIndex = frameIndex;
        renderPages();

        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
                updateCards();
                updateSlider();
            });
        }
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        pendingFrameIndex = null;
        
        // Stop any animations
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isAnimating = false;
        stopHold();
    }

    async function confirmSelection() {
        if (pendingFrameIndex === null || pages.length === 0) {
            closeModal();
            return;
        }

        const selectedPage = pages[Math.round(currentPosition)];
        if (!selectedPage) {
            closeModal();
            return;
        }

        const store = window.storyboardStore;
        if (store) {
            // Отправляем запрос на сервер для связи (используем selectedPage.id - database ID)
            const success = await store.connectFrame(store.getFrameByIndex(pendingFrameIndex).id, selectedPage.id);
            if (success) {
                // `connectFrame` уже обновил локальные данные; просто перерисуем UI
                if (window.renderFrames) {
                    window.renderFrames();
                }

                // Сохраняем pendingFrameIndex перед closeModal
                const frameIndex = pendingFrameIndex;
                closeModal();

                setTimeout(() => {
                    if (window.openScriptPage) {
                        window.openScriptPage(selectedPage.id, frameIndex);
                    }
                }, 100);
            } else {
                alert('Ошибка при связи кадра со страницей.');
                closeModal();
            }
        } else {
            closeModal();
        }
    }

    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmSelection);
    }

    // Клавиатурная навигация
    document.addEventListener('keydown', (e) => {
        if (!modal || !modal.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateBy(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigateBy(1);
        } else if (e.key === 'Enter') {
            confirmSelection();
        }
    });

    // Скролл колёсиком
    if (modal) {
        let wheelAccumulator = 0;
        let wheelTimeout = null;
        const WHEEL_THRESHOLD = 50;

        modal.addEventListener('wheel', (e) => {
            if (!modal.classList.contains('active') || isDragging) return;
            
            wheelAccumulator += e.deltaY;
            
            if (Math.abs(wheelAccumulator) >= WHEEL_THRESHOLD) {
                const direction = wheelAccumulator > 0 ? 1 : -1;
                navigateBy(direction);
                wheelAccumulator = 0;
            }
            
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                wheelAccumulator = 0;
            }, 200);
        }, { passive: true });
    }

    // Экспортируем функции
    window.openPageSelectorModal = openModal;
    window.closePageSelectorModal = closeModal;
})();
