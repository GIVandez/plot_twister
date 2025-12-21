document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('pagesCarousel');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPageNumEl = document.getElementById('currentPageNum');
    const pagesCountEl = document.getElementById('pagesCount');
    
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');

    const pagesData = window.storyboardData.pages;
    let pageNumbers = Object.keys(pagesData).map(Number).sort((a, b) => a - b);
    let totalPages = pageNumbers.length;

    let pageIndexMap = {};
    function rebuildPageIndexMap() {
        pageIndexMap = {};
        pageNumbers.forEach((pn, idx) => pageIndexMap[pn] = idx);
    }
    rebuildPageIndexMap();
    
    // === CORE STATE ===
    let targetIndex = 0;
    let currentPosition = 0;
    let animationStartPosition = 0;
    let animationStartTime = 0;
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
    const ANIMATION_DURATION = 350;
    const SLIDER_ANIMATION_DURATION = 150;
    const HOLD_DELAY = 400;
    const HOLD_INTERVAL = 100;
    const HOLD_FAST_INTERVAL = 50;
    const HOLD_FAST_AFTER = 1500;

    // === EASING FUNCTION ===
    // Ease-out cubic: starts fast, ends smoothly at exact target
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // === TEXT TRUNCATION ===
    function truncateText(text, maxLength = 2000) {
        if (!text) return '';
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText.length <= maxLength) return cleanText;
        return cleanText.substring(0, maxLength).trim() + '...';
    }

    // === CARD CREATION ===
    function createPageCard(pageNum) {
        const pageObj = pagesData[pageNum] || {};
        const pageText = (pageObj && typeof pageObj === 'object') ? (pageObj.text || '') : (pageObj || '');
        const card = document.createElement('div');
        card.className = 'page-card';
        card.dataset.pageNum = pageNum;

        // moved .page-text up (directly after delete button) and removed .page-header
        card.innerHTML = `
            <div class="page-card-inner">
                <button class="page-delete-btn" aria-label="Удалить страницу" title="Удалить страницу">×</button>
                <p class="page-text">${truncateText(pageText)}</p>
                <div class="page-content">
                    <!-- kept for compatibility with existing .page-content rules -->
                </div>
                <div class="page-footer">
                    <span class="page-number">${pageNum}</span>
                </div>
            </div>
        `;

        // delete button handler (stop propagation so card click doesn't fire)
        const delBtn = card.querySelector('.page-delete-btn');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeletePage(Number(pageNum));
            });
        }

        // clicking the inner area should open the Text Editor when the card is the active (center) card
        const inner = card.querySelector('.page-card-inner');
        if (inner) {
            inner.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // determine which page is currently centered
                const centerIdx = Math.round(currentPosition);
                const activePageNum = pageNumbers[Math.max(0, Math.min(centerIdx, totalPages - 1))];
                const thisPageNum = Number(pageNum);

                if (thisPageNum === activePageNum) {
                    // open the text editor (relative path to the editor file)
                    window.location.href = 'script_redo/TextEditor.html';
                } else {
                    // if clicked card isn't centered yet, navigate to it
                    const clickedIdx = pageNumbers.indexOf(thisPageNum);
                    if (clickedIdx !== -1 && clickedIdx !== targetIndex) {
                        navigateTo(clickedIdx);
                    }
                }
            });
        }

        return card;
    }

    // === POSITION CALCULATIONS ===
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
            // Exact center
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

    function applyCardTransform(card, transform, cardTopOffset) {
        // use translate3d for smoother GPU-accelerated transforms
        card.style.transform = `translate3d(${transform.x}px, ${cardTopOffset}px, ${transform.z}px) rotateY(${transform.rotateY}deg)`;
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
        // use float position and give a larger buffer so small fractional shifts
        // don't trigger card creation/removal (prevents visible jerkiness)
        const center = position;
        const base = Math.floor(center);
        const start = Math.max(0, base - 4);
        const end = Math.min(totalPages - 1, base + 4);
        return { start, end };
    }

    function updateCards() {
        // Try to read actual width of rendered cards (responsive), fallback to 400
        const sample = carousel.querySelector('.page-card');
        const cardWidth = sample ? sample.offsetWidth : 400;
        const cardTopOffset = 15;
        
        const range = getVisibleRange(currentPosition);
        
        const existingCards = carousel.querySelectorAll('.page-card');
        existingCards.forEach(card => {
            const pn = Number(card.dataset.pageNum);
            const idx = (typeof pageIndexMap[pn] !== 'undefined') ? pageIndexMap[pn] : -1;
            // keep a 1-card safety margin to avoid frequent add/remove during animation
            if (idx === -1 || idx < (range.start - 1) || idx > (range.end + 1)) {
                card.remove();
            }
        });
        
        for (let idx = range.start; idx <= range.end; idx++) {
            const pageNum = pageNumbers[idx];
            let card = carousel.querySelector(`[data-page-num="${pageNum}"]`);
            
            if (!card) {
                card = createPageCard(pageNum);
                carousel.appendChild(card);
                
                card.addEventListener('click', () => {
                    const clickedIdx = pageNumbers.indexOf(pageNum);
                    if (clickedIdx !== -1 && clickedIdx !== targetIndex) {
                        navigateTo(clickedIdx);
                    }
                });
            }
            
            const offset = idx - currentPosition;
            const transform = getCardTransform(offset, cardWidth);
            applyCardTransform(card, transform, cardTopOffset);
        }

        // ensure only active (center) card has enabled delete button
        updateDeleteButtonStates();
    }

    function updateDeleteButtonStates() {
        const centerIdx = Math.round(currentPosition);
        const activePageNum = pageNumbers[Math.max(0, Math.min(centerIdx, totalPages - 1))];
        const cards = carousel.querySelectorAll('.page-card');
        cards.forEach(card => {
            const btn = card.querySelector('.page-delete-btn');
            if (!btn) return;
            const pageNum = Number(card.dataset.pageNum);
            if (pageNum === activePageNum) {
                btn.disabled = false;
                btn.classList.remove('inactive');
                btn.setAttribute('aria-hidden', 'false');
                btn.title = 'Удалить страницу';
            } else {
                btn.disabled = true;
                btn.classList.add('inactive');
                btn.setAttribute('aria-hidden', 'true');
                btn.title = 'Удалить можно только активную страницу';
            }
        });
    }

    // === UI UPDATES ===
    function updateSlider() {
        const progress = totalPages > 1 ? (currentPosition / (totalPages - 1)) * 100 : 0;
        progressFill.style.width = `${progress}%`;
        progressHandle.style.left = `${progress}%`;
    }

    function updatePageIndicator() {
        const displayIndex = Math.round(currentPosition);
        const pageNum = pageNumbers[Math.max(0, Math.min(displayIndex, totalPages - 1))];
        if (currentPageNumEl) currentPageNumEl.textContent = pageNum;
        if (pagesCountEl) pagesCountEl.textContent = totalPages;
    }

    function updateButtons() {
        prevBtn.disabled = targetIndex === 0;
        nextBtn.disabled = targetIndex === totalPages - 1;
    }

    // === ANIMATION LOOP ===
    function animate(timestamp) {
        // Preserve previous startTime logic for slider dragging (keeps slider behaviour intact)
        if (isDragging) {
            if (!animationStartTime) animationStartTime = timestamp;

            const elapsed = timestamp - animationStartTime;
            const distance = Math.abs(targetIndex - animationStartPosition);
            const baseDuration = SLIDER_ANIMATION_DURATION;
            const duration = baseDuration * Math.min(distance, 3);
            const adjustedDuration = Math.max(baseDuration * 0.3, Math.min(duration, baseDuration * 1.5));
            let progress = Math.min(elapsed / adjustedDuration, 1);
            const easedProgress = easeOutCubic(progress);
            currentPosition = animationStartPosition + (targetIndex - animationStartPosition) * easedProgress;

            updateCards();
            updateSlider();
            updatePageIndicator();

            if (progress >= 1) {
                currentPosition = targetIndex;
                updateCards();
                updateSlider();
                updatePageIndicator();
                isAnimating = false;
                animationFrameId = null;
                animationStartTime = 0;
                lastFrameTime = 0;
            } else {
                animationFrameId = requestAnimationFrame(animate);
            }
            return;
        }

        // Плавная экспоненциальная (damped) интерполяция для обычной навигации:
        if (!lastFrameTime) lastFrameTime = timestamp;
        const dt = Math.min(64, timestamp - lastFrameTime); // clamp delta
        lastFrameTime = timestamp;

        // коэффициент сглаживания — регулирует «жёсткость» (меньше = медленнее и мягче)
        const SMOOTH_FACTOR = 0.12;
        const alpha = 1 - Math.pow(1 - SMOOTH_FACTOR, dt / 16);

        // применяем сглаживание
        currentPosition += (targetIndex - currentPosition) * alpha;

        updateCards();
        updateSlider();
        updatePageIndicator();

        // Завершение анимации при попадании в точку
        if (Math.abs(currentPosition - targetIndex) < 0.001) {
            currentPosition = targetIndex;
            updateCards();
            updateSlider();
            updatePageIndicator();
            isAnimating = false;
            animationFrameId = null;
            animationStartTime = 0;
            lastFrameTime = 0;
        } else {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    function startAnimation() {
        // If already animating, update start position to current position (keeps re-target smooth)
        animationStartPosition = currentPosition;
        animationStartTime = 0; // для slider-ветки
        lastFrameTime = 0;      // сброс тайминга для сглаживания

        if (!isAnimating) {
            isAnimating = true;
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    // === NAVIGATION ===
    function navigateTo(index) {
        const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
        if (clampedIndex !== targetIndex || isAnimating) {
            targetIndex = clampedIndex;
            updateButtons();
            startAnimation();
        }
    }

    function navigateBy(delta) {
        navigateTo(targetIndex + delta);
    }

    // === INSTANT JUMP (for slider dragging) ===
    function jumpTo(index) {
        const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
        
        // Stop any ongoing animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isAnimating = false;
        animationStartTime = 0;
        
        targetIndex = clampedIndex;
        currentPosition = clampedIndex;
        animationStartPosition = clampedIndex;
        
        updateCards();
        updateSlider();
        updatePageIndicator();
        updateButtons();
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

    // Previous button
    prevBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startHold(-1);
    });
    prevBtn.addEventListener('mouseup', stopHold);
    prevBtn.addEventListener('mouseleave', stopHold);
    prevBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startHold(-1);
    });
    prevBtn.addEventListener('touchend', stopHold);

    // Next button
    nextBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startHold(1);
    });
    nextBtn.addEventListener('mouseup', stopHold);
    nextBtn.addEventListener('mouseleave', stopHold);
    nextBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startHold(1);
    });
    nextBtn.addEventListener('touchend', stopHold);

    // === SLIDER NAVIGATION (animated) ===
    function slideToIndex(index) {
        const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
        
        if (clampedIndex !== targetIndex) {
            // for slider-driven animated jumps, reset animation start so interpolation
            // always begins from currentPosition (no stale start causing jumps)
            targetIndex = clampedIndex;
            animationStartPosition = currentPosition;
            animationStartTime = 0;
            updateButtons();
            startAnimation();
        }
    }

    // === SLIDER HANDLERS ===
    function getSliderIndex(e) {
        const rect = progressSlider.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(percent * (totalPages - 1));
    }

    function handleSliderStart(e) {
        isDragging = true;
        progressHandle.classList.add('dragging');
        
        const index = getSliderIndex(e);
        slideToIndex(index);
    }

    function handleSliderMove(e) {
        if (!isDragging) return;
        const index = getSliderIndex(e);
        slideToIndex(index);
    }

    function handleSliderEnd() {
        if (isDragging) {
            isDragging = false;
            progressHandle.classList.remove('dragging');
        }
    }

    progressSlider.addEventListener('mousedown', handleSliderStart);
    document.addEventListener('mousemove', handleSliderMove);
    document.addEventListener('mouseup', handleSliderEnd);
    
    progressSlider.addEventListener('touchstart', handleSliderStart, { passive: false });
    document.addEventListener('touchmove', handleSliderMove, { passive: true });
    document.addEventListener('touchend', handleSliderEnd);

    // === KEYBOARD NAVIGATION ===
    const keyHoldState = { left: false, right: false };
    let keyHoldInterval = null;

    function updateKeyHold() {
        if (keyHoldState.left && !keyHoldState.right) {
            navigateBy(-1);
        } else if (keyHoldState.right && !keyHoldState.left) {
            navigateBy(1);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !keyHoldState.left) {
            e.preventDefault();
            keyHoldState.left = true;
            navigateBy(-1);
            
            if (!keyHoldInterval) {
                keyHoldInterval = setInterval(updateKeyHold, HOLD_INTERVAL);
            }
        } else if (e.key === 'ArrowRight' && !keyHoldState.right) {
            e.preventDefault();
            keyHoldState.right = true;
            navigateBy(1);
            
            if (!keyHoldInterval) {
                keyHoldInterval = setInterval(updateKeyHold, HOLD_INTERVAL);
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') {
            keyHoldState.left = false;
        } else if (e.key === 'ArrowRight') {
            keyHoldState.right = false;
        }
        
        if (!keyHoldState.left && !keyHoldState.right && keyHoldInterval) {
            clearInterval(keyHoldInterval);
            keyHoldInterval = null;
        }
    });

    // === MOUSE WHEEL ===
    let wheelAccumulator = 0;
    let wheelTimeout = null;
    const WHEEL_THRESHOLD = 50;

    document.addEventListener('wheel', (e) => {
        if (isDragging) return;
        
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

    // === TOUCH SWIPE ON CAROUSEL ===
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    carousel.addEventListener('touchstart', (e) => {
        if (isDragging) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        
        const diffX = touchStartX - e.touches[0].clientX;
        const diffY = touchStartY - e.touches[0].clientY;
        
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            if (diffX > 0) {
                navigateBy(1);
            } else {
                navigateBy(-1);
            }
            isSwiping = false;
        }
    }, { passive: true });

    carousel.addEventListener('touchend', () => {
        isSwiping = false;
    }, { passive: true });

    // === ADD PAGE & SAVE HANDLERS ===
    // add page button element (by id, fallback to class for perfect copy of top-menu)
    const addPageBtn = document.getElementById('addPageBtn') || document.querySelector('.menu-btn.add-frame-btn');

    function buildStoryboardFileContent() {
        return 'window.storyboardData = ' + JSON.stringify(window.storyboardData, null, 2) + ';';
    }

    function downloadUpdatedStoryboardFile() {
        try {
            const content = buildStoryboardFileContent();
            const blob = new Blob([content], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'storyboard-data.js';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Не удалось создать файл для скачивания.');
        }
    }

    // add new page at the end (empty text) and update storyboard-data + UI
    function addNewPage() {
        const maxPage = pageNumbers.length ? Math.max(...pageNumbers) : 0;
        const newPageNum = maxPage + 1;

        // update global data object and local reference — теперь объект
        const newPageObj = { number: newPageNum, text: '' };
        window.storyboardData.pages[newPageNum] = newPageObj;
        pagesData[newPageNum] = newPageObj;

        pageNumbers.push(newPageNum);
        pageNumbers.sort((a, b) => a - b);
        rebuildPageIndexMap();
        totalPages = pageNumbers.length;

        updateButtons();
        navigateTo(totalPages - 1); // animate to the newly created page
        updateCards();
        updateSlider();
        updatePageIndicator();

        // Removed automatic download on add — saving is now explicit via Save button
        // downloadUpdatedStoryboardFile();
    }

    // attach listener to button
    if (addPageBtn) {
        addPageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addNewPage();
        });
    }

    // Add explicit save button handler so adding a page no longer triggers save
    // support both id and class; attach to all matching buttons
    const saveButtons = [];
    const saveById = document.getElementById('saveDataBtn');
    if (saveById) saveButtons.push(saveById);
    document.querySelectorAll('.menu-btn.save-data-btn').forEach(btn => {
        if (!saveButtons.includes(btn)) saveButtons.push(btn);
    });
    saveButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadUpdatedStoryboardFile();
        });
    });

    function handleDeletePage(removedNum) {
        const removedIdx = pageNumbers.indexOf(removedNum);
        if (removedIdx === -1) return;

        const newPages = {};
        pageNumbers.forEach((pn) => {
            const num = Number(pn);
            if (num === removedNum) return;
            const newNum = num < removedNum ? num : num - 1;
            const src = pagesData[num] || {};
            newPages[newNum] = {
                number: newNum,
                text: (src && typeof src === 'object') ? (src.text || '') : (src || '')
            };
        });

        const frames = window.storyboardData.frames || {};
        for (const k in frames) {
            if (!Object.prototype.hasOwnProperty.call(frames, k)) continue;
            const fr = frames[k];
            if (fr && typeof fr.connectedPage !== 'undefined' && fr.connectedPage !== null) {
                const cp = Number(fr.connectedPage);
                if (cp === removedNum) fr.connectedPage = null;
                else if (cp > removedNum) fr.connectedPage = cp - 1;
            }
        }

        for (const key in pagesData) {
            if (Object.prototype.hasOwnProperty.call(pagesData, key)) delete pagesData[key];
        }
        Object.keys(newPages).forEach(n => pagesData[n] = newPages[n]);
        window.storyboardData.pages = pagesData;

        pageNumbers = Object.keys(pagesData).map(Number).sort((a, b) => a - b);
        rebuildPageIndexMap();
        totalPages = pageNumbers.length;

        if (totalPages === 0) {
            targetIndex = 0;
            currentPosition = 0;
            updateCards();
            updateSlider();
            updatePageIndicator();
            updateButtons();
        } else {
            if (removedIdx < targetIndex) targetIndex = Math.max(0, targetIndex - 1);
            else if (removedIdx === targetIndex) targetIndex = Math.max(0, targetIndex - 1);
            navigateTo(Math.min(targetIndex, totalPages - 1));
        }

        updateCards();
        updateSlider();
        updatePageIndicator();
        updateButtons();

        downloadUpdatedStoryboardFile();
    }

    // === INITIALIZATION ===
    function init() {
        targetIndex = 0;
        currentPosition = 0;
        animationStartPosition = 0;
        rebuildPageIndexMap();
        updateCards();
        updateSlider();
        updatePageIndicator();
        updateButtons();
    }

    init();
});
