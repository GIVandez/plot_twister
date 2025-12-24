/* GraphicEditor.js */
document.addEventListener('DOMContentLoaded', () => {
    // Элементы управления
    // const canvasEl = document.getElementById('fabricCanvas'); // not used; Fabric owns the canvas
    const toolButtons = document.querySelectorAll('.tool');
    const brushSizeEl = document.getElementById('brushSize');
    const brushOpacity = document.getElementById('brushOpacity');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    const clearBtn = document.getElementById('clear');
    const saveBtn = document.getElementById('save');
    const imgFile = document.getElementById('imgFile');

    // size preview element in toolbar
    const brushSizePreviewEl = document.getElementById('brushSizePreview');

    // Helper function to convert dataURL to Blob
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

    // Инициализация pickera (iro.js)
    const colorPicker = new iro.ColorPicker('#colorWheel', {
        width: 160,
        color: '#ffffff',
        wheelLightness: true
    });
    try {
        console.debug('colorPicker created', {
            colorObj: !!(colorPicker && colorPicker.color),
            hsv: colorPicker?.color?.hsv || null,
            hsva: colorPicker?.color?.hsva || null
        });
    } catch (e) { /* ignore */ }
    // Add separate slider for brightness/value. Use object signature for compatibility and guard.
    let slider;
    (function initIroSliderWithRetry() {
        const sliderElem = document.getElementById('iroSlider');
        if (!sliderElem) {
            console.warn('iro slider: #iroSlider element not found; skipping slider init');
            return;
        }

        // We need the color object and the UI module ready. The color object sometimes isn't attached immediately
        // depending on version and browser. Try to create the slider when colorPicker.color && colorPicker.color.hsva exists.
        let attempts = 0;
        const maxAttempts = 30;
        const retryInterval = 50; // ms

        function tryInit() {
            attempts++;
            try {
                const colorObj = (colorPicker && colorPicker.color) ? colorPicker.color : null;
                const colorHasHsv = colorObj && (typeof colorObj.hsv === 'object' || typeof colorObj.hsva !== 'undefined');
                const canCreate = (typeof iro !== 'undefined' && iro.ui && typeof iro.ui.Slider === 'function' && colorHasHsv);
                // Debugging info to help track potential race conditions.
                console.debug('iro slider init check', { attempts, typeof_iro: typeof iro, hasUi: !!(iro && iro.ui), hasSlider: !!(iro && iro.ui && iro.ui.Slider), colorObjPresent: !!colorObj, colorHasHsv });
                if (canCreate) {
                    // Use the color object as the second parameter — slider expects a Color object instance
                    try {
                        // Pass the color via options as `color` — Slider reads `options.color`.
                        slider = new iro.ui.Slider({ element: sliderElem, sliderType: 'value', color: colorObj });
                        console.info('iro slider initialized');
                        // Stop retrying — slider created successfully
                        return;
                    } catch (e) {
                        console.warn('iro slider construction threw', e);
                    }
                }
            } catch (e) {
                console.warn('iro slider init attempt failed', e);
            }
            if (attempts < maxAttempts) {
                setTimeout(tryInit, retryInterval);
            } else {
                console.warn('iro slider init: giving up after', attempts, 'attempts');
                // Fallback: if we couldn't initialize the iro slider, build a simple numeric range fallback
                try {
                    if (sliderElem && !slider) {
                        const fallback = document.createElement('input');
                        fallback.type = 'range';
                        fallback.min = 0;
                        fallback.max = 100;
                        // read current value; if we can, set from colorPicker
                        try { fallback.value = (colorPicker && colorPicker.color && colorPicker.color.hsv) ? colorPicker.color.hsv.v : 100; } catch (e) { fallback.value = 100; }
                        fallback.className = 'iro-range-fallback';
                        sliderElem.appendChild(fallback);
                        fallback.addEventListener('input', (ev) => {
                            try {
                                const v = parseInt(ev.target.value, 10);
                                if (colorPicker && colorPicker.color) colorPicker.color.hsv = Object.assign({}, colorPicker.color.hsv, { v: v });
                            } catch(e) {}
                        });
                        console.info('iro slider fallback created (numeric input)');
                    }
                } catch(e) { /* ignore fallback failures */ }
            }
        }

        tryInit();
    })();
    // Ensure slider/color starts light
    try {
        if (colorPicker && colorPicker.color && typeof colorPicker.color.hsv !== 'undefined') {
            const hsv = colorPicker.color.hsv;
            if (typeof hsv.v === 'undefined' || hsv.v < 100) {
                colorPicker.color.hsv = { h: hsv.h, s: hsv.s, v: 100 };
            }
        }
    } catch (e) { /* ignore */ }
    // Avoid color change event on initialization clobbering primary color
    let colorWheelInitializing = true;

    // Инициализация Fabric.js canvas
    const canvas = new fabric.Canvas('fabricCanvas', {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true
    });

    // (Fabric internally uses multiple canvases. We'll keep the top canvas transparent.)

    // Ensure overlay/top canvas doesn't permanently hide the lower canvas objects by being opaque
    function ensureTopCanvasIsTransparent() {
        const upper = canvas.upperCanvasEl;
        if (!upper) return;
        upper.style.background = 'transparent';
        // We keep pointerEvents so drawing works; we only ensure transparency/zIndex
        upper.style.zIndex = '2';
        if (canvas.lowerCanvasEl) canvas.lowerCanvasEl.style.zIndex = '1';
    }

    // ensure a freeDrawingBrush exists immediately
    if (!canvas.freeDrawingBrush) canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);

    // Подгоняем канвас под область .canvas-wrap
    function fitCanvas() {
        const wrap = document.querySelector('.canvas-wrap');
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        canvas.setWidth(Math.max(400, rect.width - 40));
        canvas.setHeight(Math.max(300, rect.height - 40));
        canvas.calcOffset();
        // If a frame image is loaded, resize it to match the new canvas dimensions
        try {
            if (frameImageObject) {
                // Stretch image to cover full canvas (may change aspect ratio)
                const img = frameImageObject;
                img.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
                // Calculate scaleX/scaleY to exactly fill canvas
                const sx = canvas.getWidth() / (img.width || img.getScaledWidth());
                const sy = canvas.getHeight() / (img.height || img.getScaledHeight());
                img.scaleX = sx;
                img.scaleY = sy;
                // Ensure object coordinates are updated
                img.setCoords();
            }
        } catch (e) {
            console.warn('fitCanvas image resize failed', e);
        }

        // fitCanvas: update canvas dimensions
        canvas.renderAll();
        ensureTopCanvasIsTransparent();
    }
    window.addEventListener('resize', fitCanvas);
    fitCanvas();
    ensureTopCanvasIsTransparent();

    // Store reference to loaded frame image object so we can resize it on canvas resize
    let frameImageObject = null;
    // Track saved state vs unsaved changes
    let lastSavedState = null; // JSON string
    let isDirty = false;

    // Load image if frame_id is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const frameId = urlParams.get('frame_id');
    if (frameId) {
        loadFrameImage(frameId);
    }

    // Return brush opacity as a float 0..1 (handles 0 correctly)
    function getBrushAlpha() {
        try {
            const raw = brushOpacity && brushOpacity.value;
            let n = parseInt(raw, 10);
            if (!Number.isFinite(n)) n = 100; // default to 100 when not a number
            n = Math.max(0, Math.min(100, n));
            return n / 100;
        } catch (e) { return 1; }
    }

    // Helper for shape options
    function makeShapeOptions(extra = {}) {
        const alpha = getBrushAlpha();
        return Object.assign({
            stroke: hexToRgba(getCurrentHex(), alpha),
            strokeWidth: parseInt(brushSizeEl.value, 10),
            selectable: true,
            evented: true
        }, extra);
    }

    // PRESET COLORS
    const presetColors = [
        '#FF0000','#FFA500','#FFFF00','#00FF00','#00FFFF','#0000FF','#800080','#FF00FF','#808080','#000000','#FFFFFF'
    ];
    const paletteEl = document.getElementById('stdPalette');
    // Editing / active swatch element (when user clicks a slot to edit)
    let editingSwatch = null;
    function createPalette() {
        paletteEl.innerHTML = '';
        // Add preset
        presetColors.forEach(color => {
            const d = document.createElement('div');
            d.className = 'palette-swatch';
            d.style.background = color;
            d.dataset.color = color;
            paletteEl.appendChild(d);
        });
        // grey slots (extend by 3 additional empty greys)
        for (let i=0;i<7;i++){
            const d = document.createElement('div');
            d.className = 'palette-swatch grey';
            d.dataset.slot = i;
            paletteEl.appendChild(d);
        }
    }
    createPalette();

    // Add event listeners for palette clicks and + button
    let activePaletteColor = '#000000';
    function setEditingSwatch(el) {
        if (!el || !el.classList.contains('palette-swatch')) return;
        // toggle off if same
        if (editingSwatch === el) {
            clearEditingSwatch();
            return;
        }
        // deactivate previous
        if (editingSwatch) editingSwatch.classList.remove('active');
        editingSwatch = el;
        editingSwatch.classList.add('active');
        // Sync color picker with swatch color (or primary color if none)
        const color = editingSwatch.dataset.color || primaryColor || '#000000';
        try {
            colorWheelInitializing = true;
            colorPicker.color.hexString = color;
        } catch (e) {}
        colorWheelInitializing = false;
        // Also set this color as the primary (optional)
        primaryColor = color;
        updateSwapUI();
        setupDrawingBrush();
    }
    function clearEditingSwatch() {
        if (!editingSwatch) return;
        editingSwatch.classList.remove('active');
        editingSwatch = null;
    }
    if (paletteEl) paletteEl.addEventListener('click', (ev) => {
        const tgt = ev.target;
        if (!tgt.classList.contains('palette-swatch')) return;
        setEditingSwatch(tgt);
    });
    // addPaletteColor button removed — no UI for adding colors programmatically

    // Clicking outside of palette or color wheel clears editing state
    document.addEventListener('click', (ev) => {
        const isPaletteClick = !!ev.target.closest('.std-palette') || !!ev.target.closest('#colorWheel') || !!ev.target.closest('#iroSlider');
        if (!isPaletteClick) clearEditingSwatch();
    });
    // Pressing ESC cancels editing
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') clearEditingSwatch();
    });

    // Primary / Secondary color panel
    const primaryColorEl = document.getElementById('primaryColor');
    const secondaryColorEl = document.getElementById('secondaryColor');
    let primaryColor = '#000000';
    let secondaryColor = '#ffffff';
    function updateSwapUI(){
        primaryColorEl.style.background = primaryColor;
        secondaryColorEl.style.background = secondaryColor;
    }
    updateSwapUI();
    const swapToggleBtn = document.getElementById('swapToggle');
    if (swapToggleBtn) swapToggleBtn.addEventListener('click', () => {
        [primaryColor, secondaryColor] = [secondaryColor, primaryColor];
        updateSwapUI();
        colorPicker.color.hexString = primaryColor;
        setupDrawingBrush();
    });
    // Click to pick primary/secondary
    if (primaryColorEl) primaryColorEl.addEventListener('click', () => {
        colorPicker.color.hexString = primaryColor;
        setupDrawingBrush();
    });
    if (secondaryColorEl) secondaryColorEl.addEventListener('click', () => {
        colorPicker.color.hexString = secondaryColor;
        setupDrawingBrush();
    });


    // История для undo/redo
    const history = [];
    let historyIndex = -1;
    const HISTORY_LIMIT = 50;

    function saveState() {
        try {
            const json = JSON.stringify(canvas.toJSON());
            // Удаляем все состояния после текущего индекса (для redo)
            history.splice(historyIndex + 1);
            // Добавляем новое состояние
            history.push(json);
            // Ограничиваем размер истории
            if (history.length > HISTORY_LIMIT) {
                history.shift();
            } else {
                historyIndex++;
            }
            updateUndoRedoButtons();
            // Mark that canvas has unsaved changes relative to lastSavedState
            try { isDirty = (lastSavedState !== JSON.stringify(canvas.toJSON())); } catch(e) { isDirty = true; }
        } catch (e) {
            console.warn('Не удалось сохранить состояние:', e);
        }
    }

    function markSaved() {
        try {
            lastSavedState = JSON.stringify(canvas.toJSON());
            isDirty = false;
        } catch(e) { isDirty = false; }
    }

    function loadState(json) {
        // Load canvas from JSON and normalize any frame image object created by the load
        canvas.loadFromJSON(json, () => {
            try {
                // Try to find frame image: prefer object with explicit flag, otherwise heuristic
                let found = canvas.getObjects().find(o => !!o.frameImage);
                if (!found) {
                    // fallback: choose the image that sits at the top-left and roughly fills the canvas
                    const imgs = canvas.getObjects().filter(o => o.type === 'image');
                    found = imgs.find(o => Math.abs((o.left || 0)) < 2 && Math.abs((o.top || 0)) < 2 && (o.getScaledWidth() >= canvas.getWidth() - 2 || o.getScaledHeight() >= canvas.getHeight() - 2));
                    if (!found && imgs.length) found = imgs[0];
                }
                if (found) {
                    frameImageObject = found;
                    // ensure it's positioned and scaled to cover the canvas
                    try {
                        frameImageObject.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
                        const sx = canvas.getWidth() / (frameImageObject.width || frameImageObject.getScaledWidth());
                        const sy = canvas.getHeight() / (frameImageObject.height || frameImageObject.getScaledHeight());
                        frameImageObject.scaleX = sx;
                        frameImageObject.scaleY = sy;
                        frameImageObject.setCoords();
                    } catch (e) { /* ignore per-object errors */ }
                }
            } catch (e) { console.warn('loadState normalize failed', e); }
            canvas.renderAll();
        });
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            loadState(history[historyIndex]);
            updateUndoRedoButtons();
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            loadState(history[historyIndex]);
            updateUndoRedoButtons();
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // Initial state will be saved after frame image loads (if any) or immediately
    // Check if frame_id is NOT provided, then save initial empty state now
    if (!frameId) {
        saveState();
    }
    // If frameId is provided, saveState() will be called after image loads in loadFrameImage()

    // Текущий инструмент
    let currentTool = 'pencil';
    let drawingObject = null;
    let startPointer = null;
    let isDrawing = false;

    // Настройка кисти для рисования карандашом / ластиком
    function hexToRgba(hex, alpha) {
        if (!hex) hex = '#000000';
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0,2),16);
        const g = parseInt(h.substring(2,4),16);
        const b = parseInt(h.substring(4,6),16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Convert hex + alpha (0..1) to RGBA array [r,g,b,a(0..255)]
    function hexToRgbaArray(hex, alpha) {
        if (!hex) hex = '#000000';
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0,2),16) || 0;
        const g = parseInt(h.substring(2,4),16) || 0;
        const b = parseInt(h.substring(4,6),16) || 0;
        const a = Math.round((alpha || 1) * 255);
        return [r, g, b, a];
    }

    // Compare two RGBA arrays with optional tolerance (0..255)
    function colorsMatchRGBA(a, b, tol) {
        tol = tol || 0;
        return Math.abs(a[0]-b[0]) <= tol && Math.abs(a[1]-b[1]) <= tol && Math.abs(a[2]-b[2]) <= tol && Math.abs(a[3]-b[3]) <= tol;
    }

    // Rasterize all canvas objects to background image, clearing objects
    function rasterizeObjectsToBackground() {
        if (canvas.getObjects().length === 0) return;
        const dataURL = canvas.toDataURL({ format: 'png' });
        canvas.clear();
        canvas.setBackgroundImage(dataURL, canvas.renderAll.bind(canvas), {
            originX: 'left', originY: 'top', width: canvas.width, height: canvas.height
        });
    }

    // Pixel flood fill on the canvas raster. Uses canvas.contextContainer to read/write pixels.
    // x,y are canvas coordinates (fabric pointer coords). fillColorRgba is [r,g,b,a(0..255)].
    function floodFillCanvas(startX, startY, fillColorRgba, tolerance) {
        tolerance = typeof tolerance === 'number' ? tolerance : 0;
        const ctx = canvas.contextContainer;
        if (!ctx) return false;
        try {
            const w = canvas.width;
            const h = canvas.height;
            // Guard coords
            const x0 = Math.round(startX);
            const y0 = Math.round(startY);
            if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return false;

            const img = ctx.getImageData(0, 0, w, h);
            const data = img.data;
            const startIdx = (y0 * w + x0) * 4;
            const target = [data[startIdx], data[startIdx+1], data[startIdx+2], data[startIdx+3]];

            // If the target color is already the fill color (within tolerance), nothing to do
            if (colorsMatchRGBA(target, fillColorRgba, tolerance)) return false;

            // Stack fill (iterative)
            const stack = [];
            stack.push([x0, y0]);
            while (stack.length) {
                const pt = stack.pop();
                const x = pt[0];
                const y = pt[1];
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                const idx = (y * w + x) * 4;
                const cur = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
                if (!colorsMatchRGBA(cur, target, tolerance)) continue;

                // set pixel to fill color
                data[idx]   = fillColorRgba[0];
                data[idx+1] = fillColorRgba[1];
                data[idx+2] = fillColorRgba[2];
                data[idx+3] = fillColorRgba[3];

                // push neighbors
                stack.push([x+1, y]);
                stack.push([x-1, y]);
                stack.push([x, y+1]);
                stack.push([x, y-1]);
            }

            // write back
            ctx.putImageData(img, 0, 0);
            return true;
        } catch (e) {
            console.warn('floodFillCanvas error', e);
            return false;
        }
    }

    // Flood fill for ImageData object (works on an offscreen canvas ImageData)
    function floodFillImageData(imgData, startX, startY, fillColorRgba, tolerance) {
        tolerance = typeof tolerance === 'number' ? tolerance : 0;
        try {
            const data = imgData.data;
            const w = imgData.width;
            const h = imgData.height;
            const x0 = Math.round(startX);
            const y0 = Math.round(startY);
            if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return false;

            const startIdx = (y0 * w + x0) * 4;
            const target = [data[startIdx], data[startIdx+1], data[startIdx+2], data[startIdx+3]];
            if (colorsMatchRGBA(target, fillColorRgba, tolerance)) return false;

            const stack = [[x0, y0]];
            while (stack.length) {
                const pt = stack.pop();
                const x = pt[0];
                const y = pt[1];
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                const idx = (y * w + x) * 4;
                const cur = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
                if (!colorsMatchRGBA(cur, target, tolerance)) continue;

                data[idx]   = fillColorRgba[0];
                data[idx+1] = fillColorRgba[1];
                data[idx+2] = fillColorRgba[2];
                data[idx+3] = fillColorRgba[3];

                stack.push([x+1, y]);
                stack.push([x-1, y]);
                stack.push([x, y+1]);
                stack.push([x, y-1]);
            }
            return true;
        } catch (e) {
            console.warn('floodFillImageData error', e);
            return false;
        }
    }

    function updateSizePreview(size) {
        const el = brushSizePreviewEl;
        if (!el) return;
        const diameter = Math.max(1, Math.min(200, parseInt(size, 10) || 1));
        const alpha = getBrushAlpha();
        try {
            const circle = el;
            circle.style.width = diameter + 'px';
            circle.style.height = diameter + 'px';
            circle.style.backgroundColor = hexToRgba(primaryColor || '#000000', alpha);
            circle.style.borderColor = 'rgba(0,0,0,0.3)'; // optional, for visibility
        } catch(e) {}
    }

    function getCurrentHex() {
        try {
            return primaryColor || (colorPicker && colorPicker.color && colorPicker.color.hexString) || '#000000';
        } catch(e) {
            return '#000000';
        }
    }

    function setupDrawingBrush() {
        const width = parseInt(brushSizeEl.value, 10);
        const color = getCurrentHex();
        const alpha = getBrushAlpha();
        const brush = canvas.freeDrawingBrush;
        brush.width = width;
        brush.color = (currentTool === 'eraser') ? (canvas.backgroundColor || '#ffffff') : hexToRgba(color, alpha);
        canvas.isDrawingMode = (currentTool === 'pencil' || currentTool === 'eraser');
        canvas.selection = (currentTool === 'select');
        // sync the size preview
        try { if (brushSizePreviewEl) updateSizePreview(brushSizeEl.value); } catch(e) {}
    }

    // Установка активного инструмента
    function setActiveTool(toolName) {
        currentTool = toolName;
        toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === toolName));
        setupDrawingBrush();
        // When using tools that should not interact with objects (like fill),
        // disable Fabric's target finding so objects can't be selected or dragged.
        // For other tools, restore normal behavior.
        // For tools that operate directly on the raster or create primitives, disable target finding
        // so clicks don't select or drag existing objects while the tool is active.
        const nonInteractiveTools = ['fill','rect','circle','line','triangle','star'];
        if (nonInteractiveTools.includes(toolName)) {
            canvas.skipTargetFind = true;
            canvas.selection = false;
        } else {
            canvas.skipTargetFind = false;
            // restore selection behavior (setupDrawingBrush will set canvas.selection for 'select')
        }
    }

    // Обработчики для кнопок инструментов
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTool(btn.dataset.tool);
        });
    });

    // Tool shortcut clicks from icon rows
    document.querySelectorAll('.tool-icon').forEach(btn=>btn.addEventListener('click',()=>setActiveTool(btn.dataset.tool)));

    // For primitives like triangle and star we will add simple handlers
    function addPrimitive(type){
        // Create primitives as movable immediately after creation, then 'stick' them to the canvas
        // (only allow moving right after creation).
        const baseOpts = makeShapeOptions({ fill: 'transparent' });
        if (type === 'triangle') {
            const tri = new fabric.Triangle(Object.assign({ left: 100, top: 100, width: 60, height: 60 }, baseOpts));
            // allow user to move it once
            tri.set({ selectable: true, evented: true });
            // mark to become non-selectable once selection is cleared
            tri._movableOnce = true;
            canvas.add(tri);
            canvas.setActiveObject(tri);
            // switch to select so the user can drag immediately
            setActiveTool('select');
            saveState();
        } else if (type === 'star') {
            // star not native - create polygon as star quickly
            const starPoints = 5;
            const outer = 40; const inner = 16; // approximate
            const points=[];
            for(let i=0;i<starPoints;i++){
                const a = Math.PI*2*i/starPoints;
                points.push({ x: 120 + Math.cos(a)*outer, y: 120 + Math.sin(a)*outer });
                const a2 = a + Math.PI/starPoints;
                points.push({ x: 120 + Math.cos(a2)*inner, y: 120 + Math.sin(a2)*inner });
            }
            const polygon = new fabric.Polygon(points, Object.assign({ left: 120, top: 120 }, baseOpts));
            polygon.set({ selectable: true, evented: true });
            polygon._movableOnce = true;
            canvas.add(polygon);
            canvas.setActiveObject(polygon);
            setActiveTool('select');
            saveState();
        }
    }
    document.querySelectorAll('.primitives-row .tool').forEach(e=>e.addEventListener('click', ()=> addPrimitive(e.dataset.tool)));

    // Обработчики событий мыши на канвасе
    canvas.on('mouse:down', (opt) => {
        const pointer = canvas.getPointer(opt.e);
        isDrawing = true;
        startPointer = pointer;

        // Fill tool uses click rather than drag
        if (currentTool === 'fill') {
            try {
                // Create a raster snapshot of the current canvas (composed pixels)
                // Do NOT clear the canvas immediately — generate the source image first to avoid
                // removing visible objects (this previously caused the loaded drawing to disappear).
                const sourceDataURL = canvas.toDataURL({ format: 'png' });

                // Prepare fill color and tolerance
                const hex = (colorPicker && colorPicker.color && colorPicker.color.hexString) ? colorPicker.color.hexString : '#000000';
                const alpha = getBrushAlpha();
                const fillArr = hexToRgbaArray(hex, alpha);
                const fillTolerance = 32; // adjustable tolerance for color matching (0-255)
                const tolerance = fillTolerance;

                // Draw the raster into an offscreen canvas and perform flood fill on its pixels
                const tmp = document.createElement('canvas');
                tmp.width = canvas.width;
                tmp.height = canvas.height;
                const tctx = tmp.getContext('2d');
                const img = new Image();
                img.onload = function() {
                    try {
                        tctx.clearRect(0,0,tmp.width,tmp.height);
                        tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
                        const imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
                        const sx = Math.round(pointer.x);
                        const sy = Math.round(pointer.y);
                        // If click is outside bounds, bail
                        if (sx < 0 || sy < 0 || sx >= tmp.width || sy >= tmp.height) {
                            return;
                        }
                        // Perform fill on the offscreen ImageData
                        floodFillImageData(imgData, sx, sy, fillArr, tolerance);
                        tctx.putImageData(imgData, 0, 0);

                        // Set the filled raster as the canvas background image.
                        // Only after the background image is set we remove vector objects so the
                        // user does not see the canvas briefly emptied.
                        const filledDataURL = tmp.toDataURL('image/png');
                        canvas.setBackgroundImage(filledDataURL, function() {
                            try {
                                // Remove all vector objects (they are now flattened into background)
                                const objs = canvas.getObjects().slice();
                                for (let i = 0; i < objs.length; i++) {
                                    try { canvas.remove(objs[i]); } catch(e) {}
                                }
                                canvas.renderAll();
                                // Save state after background image is updated and objects cleared
                                saveState();
                            } catch(e) {
                                console.warn('apply filled background failed', e);
                            }
                        }, {
                            originX: 'left', originY: 'top', width: canvas.width, height: canvas.height
                        });
                    } catch(e) {
                        console.warn('fill processing failed', e);
                    }
                };
                img.onerror = function(e){ console.warn('fill image load failed', e); };
                img.src = sourceDataURL;
            } catch (e) {
                console.warn('fill tool error', e);
            }
            return;
        }

        // Pipette (eyedropper) - sample color under pointer
        if (currentTool === 'pipette') {
            try {
                // Rasterize the entire canvas to a data URL and sample that image. This ensures
                // we read the composed pixels (background + objects) rather than relying on a
                // specific Fabric context that may not contain everything.
                const sourceDataURL = canvas.toDataURL({ format: 'png' });
                const img = new Image();
                img.onload = function() {
                    try {
                        const tmp = document.createElement('canvas');
                        tmp.width = canvas.width;
                        tmp.height = canvas.height;
                        const tctx = tmp.getContext('2d');
                        tctx.clearRect(0,0,tmp.width,tmp.height);
                        tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
                        const sx = Math.round(pointer.x);
                        const sy = Math.round(pointer.y);
                        if (sx < 0 || sy < 0 || sx >= tmp.width || sy >= tmp.height) return;
                        const p = tctx.getImageData(sx, sy, 1, 1).data;
                        const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                        try { colorPicker.color.hexString = hex; } catch(e) {}
                        primaryColor = hex;
                        updateSwapUI();
                        setupDrawingBrush();
                    } catch(e) {
                        console.warn('pipette processing failed', e);
                    }
                };
                img.onerror = function(e){ console.warn('pipette image load failed', e); };
                img.src = sourceDataURL;
            } catch (e) {
                console.warn('pipette error', e);
            }
            return;
        }

        const strokeOpts = makeShapeOptions();
        if (currentTool === 'line') {
            // create the line for dragging (not selectable yet)
            drawingObject = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], strokeOpts);
            drawingObject.set({ selectable: false, evented: false });
            canvas.add(drawingObject);
            canvas.requestRenderAll();
        } else if (currentTool === 'rect') {
            // create rect while dragging; make it non-selectable until mouseup
            drawingObject = new fabric.Rect(Object.assign({ left: pointer.x, top: pointer.y, width: 0, height: 0, fill: 'transparent' }, strokeOpts));
            drawingObject.set({ selectable: false, evented: false });
            canvas.add(drawingObject);
            canvas.requestRenderAll();
        } else if (currentTool === 'circle') {
            drawingObject = new fabric.Circle(Object.assign({ left: pointer.x, top: pointer.y, radius: 0, fill: 'transparent', originX: 'center', originY: 'center' }, strokeOpts));
            drawingObject.set({ selectable: false, evented: false });
            canvas.add(drawingObject);
            canvas.requestRenderAll();
        }
    });

    canvas.on('mouse:move', (opt) => {
        if (!isDrawing || !drawingObject || !startPointer) return;
        
        const pointer = canvas.getPointer(opt.e);
        
        if (currentTool === 'line') {
            drawingObject.set({ x2: pointer.x, y2: pointer.y });
        } 
        else if (currentTool === 'rect') {
            const width = pointer.x - startPointer.x;
            const height = pointer.y - startPointer.y;
            drawingObject.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width > 0 ? startPointer.x : pointer.x,
                top: height > 0 ? startPointer.y : pointer.y
            });
        } 
        else if (currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(pointer.x - startPointer.x, 2) + 
                Math.pow(pointer.y - startPointer.y, 2)
            ) / 2;
            const centerX = (startPointer.x + pointer.x) / 2;
            const centerY = (startPointer.y + pointer.y) / 2;
            
            // Because origin is center, we set left/top to the center
            drawingObject.set({
                left: centerX,
                top: centerY,
                radius: radius
            });
        }
        
        canvas.requestRenderAll();
    });

    canvas.on('mouse:up', () => {
        if (drawingObject) {
            // Сохраняем объект: если инструмент — примитив, оставляем его неинтерактивным (не перетаскиваемым).
            try {
                const primitiveTools = ['line','rect','circle','triangle','star'];
                if (primitiveTools.includes(currentTool)) {
                    // For shapes created via drag (line/rect/circle), enable selection now so the
                    // user can move the newly created shape once. Mark with _movableOnce so it
                    // becomes fixed when selection is cleared.
                    if (!drawingObject._movableOnce) {
                        try {
                            drawingObject.set({ selectable: true, evented: true });
                            drawingObject._movableOnce = true;
                            canvas.setActiveObject(drawingObject);
                            setActiveTool('select');
                        } catch(e) { /* ignore */ }
                    }
                } else {
                    // for other cases (if any) keep existing behavior
                    drawingObject.set({ selectable: true, evented: true });
                }
            } catch(e){}
            try { drawingObject.setCoords(); } catch(e){}
            drawingObject = null;
            saveState();
            canvas.requestRenderAll();
            ensureTopCanvasIsTransparent();
        }
        isDrawing = false;
        startPointer = null;
    });

    // (fill handled in single mouse:down handler above)

    // Событие завершения рисования карандашом/ластиком
    canvas.on('path:created', (opt) => {
        try { opt.path.set({ selectable: false, evented: false }); } catch (e) {}
        try { opt.path.setCoords(); } catch (e) {}
        saveState();
        ensureTopCanvasIsTransparent();
    });

    // Обновление кисти при изменении параметров
    brushSizeEl.addEventListener('input', (e) => {
        setupDrawingBrush();
        // update preview
        try { updateSizePreview(e.target.value); } catch(e) {}
    });
    if (brushOpacity) brushOpacity.addEventListener('input', () => { setupDrawingBrush(); updateSizePreview(brushSizeEl.value); });

    colorPicker.on('color:change', () => {
        if (colorWheelInitializing) return; // ignore initial programmatic change
        const hex = colorPicker.color.hexString;
        // If editing a palette swatch, update that swatch with the new color
        if (editingSwatch) {
            editingSwatch.style.background = hex;
            editingSwatch.dataset.color = hex;
        }
        // Always update primaryColor so brush follows wheel
        primaryColor = hex;
        updateSwapUI();
        setupDrawingBrush();
    });

    // Кнопки действий
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);

    // Keyboard shortcuts: Undo/Redo
    // Support: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (also Russian 'я'/'Я' key)
    document.addEventListener('keydown', (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        if (!isCtrlOrCmd) return;
        const k = (e.key || '').toLowerCase();
        if (k === 'z' || k === 'я') {
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            e.preventDefault();
        }
    });

    if (clearBtn) clearBtn.addEventListener('click', () => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        saveState();
    });

    if (saveBtn) saveBtn.addEventListener('click', () => {
        const dataURL = canvas.toDataURL({ 
            format: 'png' 
        });
        const urlParams = new URLSearchParams(window.location.search);
        const frameId = urlParams.get('frame_id');
        if (frameId) {
            // Save to database
            const blob = dataURLToBlob(dataURL);
            const formData = new FormData();
            formData.append('file', blob, 'drawing.png');
            fetch(`/api/frame/${frameId}/image`, {
                method: 'POST',
                body: formData
            }).then(response => {
                if (response.ok) {
                    alert('Изображение сохранено в кадр!');
                    // mark as saved
                    try { markSaved(); } catch(e) {}
                } else {
                    alert('Ошибка сохранения');
                }
            }).catch(err => {
                console.error('Save error:', err);
                alert('Ошибка сохранения');
            });
        } else {
            // Fallback: download
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `drawing_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    });

    // Импорт изображения
    if (imgFile) imgFile.addEventListener('change', (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, (img) => {
                const scale = Math.min(
                    canvas.width / img.width, 
                    canvas.height / img.height, 
                    1
                );
                img.scale(scale);
                img.set({ 
                    left: canvas.width / 2, 
                    top: canvas.height / 2, 
                    originX: 'center', 
                    originY: 'center',
                    selectable: false,
                    evented: false
                });
                canvas.add(img);
                saveState();
            });
        };
        reader.readAsDataURL(file);
        imgFile.value = '';
    });

    // Инициализация начального состояния
    setupDrawingBrush();
    setActiveTool('pencil');

    // Ensure existing objects on canvas are not selectable by default (stick to canvas)
    try {
        canvas.getObjects().forEach(o => {
            try { o.set({ selectable: false, evented: false }); } catch(e) {}
        });
    } catch(e) {}

    // When selection is cleared, any object that was allowed to move once should become fixed
    canvas.on('selection:cleared', () => {
        try {
            canvas.getObjects().forEach(o => {
                if (o && o._movableOnce) {
                    try { o.set({ selectable: false, evented: false }); } catch(e) {}
                    try { o._movableOnce = false; } catch(e) {}
                }
            });
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        } catch(e) {}
    });

    // Also when selection updates (user selects something else), stick previously movable objects
    canvas.on('selection:updated', (opt) => {
        try {
            // any previously movableOnce objects not currently active should get fixed
            canvas.getObjects().forEach(o => {
                if (o && o._movableOnce && canvas.getActiveObject() !== o) {
                    try { o.set({ selectable: false, evented: false }); } catch(e) {}
                    try { o._movableOnce = false; } catch(e) {}
                }
            });
        } catch(e) {}
    });

    // Color wheel initialization complete
    colorWheelInitializing = false;
    // Sync primary color with color wheel default
    try {
        primaryColor = getCurrentHex();
        updateSwapUI();
        setupDrawingBrush();
    } catch (e) { /* ignore */ }

    // Function to load frame image from server
    async function loadFrameImage(frameId) {
        try {
            const response = await fetch(`/api/frame/${frameId}/image`);
            if (!response.ok) {
                console.warn('Frame image not found or not available');
                return;
            }
            const blob = await response.blob();
            const imgUrl = URL.createObjectURL(blob);
            
            fabric.Image.fromURL(imgUrl, function(img) {
                // Set image to full canvas size to maintain original drawing scale
                try {
                    img.set({
                        left: 0,
                        top: 0,
                        originX: 'left',
                        originY: 'top',
                        selectable: true,
                        evented: true,
                        // mark image as frame image so we can find it when loading state
                        frameImage: true
                    });
                    // Stretch to fill canvas
                    const sx = canvas.getWidth() / img.width;
                    const sy = canvas.getHeight() / img.height;
                    img.scaleX = sx;
                    img.scaleY = sy;
                    // keep a reference so we can resize on window resize
                    frameImageObject = img;
                    canvas.add(img);
                    canvas.sendToBack(img);
                    canvas.renderAll();
                    // Save initial state including the loaded image
                    // This becomes the base state, not an undoable action
                    if (history.length === 0) {
                        saveState();
                        // The initial loaded image is considered 'saved' (no unsaved changes yet)
                        markSaved();
                    }
                } catch(e) {
                    console.warn('loading frame image failed', e);
                    canvas.add(img);
                    canvas.renderAll();
                    if (history.length === 0) saveState();
                }
            });
        } catch (error) {
            console.error('Error loading frame image:', error);
        }
    }

    // Exit button behavior and navigation protection
    const exitBtn = document.getElementById('exit');
    const exitUrl = 'http://127.0.0.1:8000/static/storyboard/index.html';
    if (exitBtn) {
        exitBtn.addEventListener('click', (ev) => {
            try {
                if (isDirty) {
                    const ok = confirm('Есть несохранённые изменения. При выходе они будут потеряны. Продолжить?');
                    if (!ok) return;
                }
                // navigate to storyboard
                window.location.href = exitUrl;
            } catch(e) { window.location.href = exitUrl; }
        });
    }

    // Warn on page unload (back button / mouse back / closing tab)
    window.addEventListener('beforeunload', function(e) {
        if (!isDirty) return undefined;
        const confirmationMessage = 'Есть несохранённые изменения. При выходе они будут потеряны.';
        (e || window.event).returnValue = confirmationMessage; // Gecko + IE
        return confirmationMessage; // Gecko + Webkit, Safari, Chrome
    });

    // Object events disabled (no selection/interaction)
});