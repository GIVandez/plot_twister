(function () {
  if (!window.storyboardData) {
    return;
  }

  const frames = window.storyboardData.frames || {};
  const pages = window.storyboardData.pages || {};

  function normalizeKey(value) {
    return String(value);
  }

  function parseTimestamp(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value !== 'string') {
      return 0;
    }
    const [minutes = '0', seconds = '0'] = value.split(':');
    const mins = parseInt(minutes, 10);
    const secs = parseInt(seconds, 10);
    if (Number.isNaN(mins) || Number.isNaN(secs)) {
      return 0;
    }
    return mins * 60 + secs;
  }

  function formatTimestamp(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function sanitizeShotSize(value) {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    return trimmed === '-' ? '' : trimmed;
  }

  function normalizeShotSize(value) {
    if (!value) {
      return '-';
    }
    const trimmed = String(value).trim();
    return trimmed === '' ? '-' : trimmed;
  }

  function sanitizePageValue(value) {
    if (value === null || value === undefined || value === '-' || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function normalizePageValue(value) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : '-' ;
  }

  function getFrameIds() {
    // Сортировка по полю 'number' кадра (порядок отображения), с fallback на ключ как число
    return Object.keys(frames).sort((a, b) => {
      const fa = frames[a];
      const fb = frames[b];
      const na = fa && typeof fa.number === 'number' ? fa.number : Number(a);
      const nb = fb && typeof fb.number === 'number' ? fb.number : Number(b);
      return na - nb;
    });
  }

  function getFrameCount() {
    return getFrameIds().length;
  }

  function buildFrameObject(id, raw) {
    if (!raw) return null;
    return {
      id: Number(id),
      number: Number.isFinite(Number(raw.number)) ? Number(raw.number) : Number(id),
      image: raw.image,
      description: raw.description,
      start: parseTimestamp(raw.start_time),
      end: parseTimestamp(raw.end_time),
      shotSize: sanitizeShotSize(raw.shotSize),
      connectedPage: sanitizePageValue(raw.connectedPage)
    };
  }

  function getFrameById(id) {
    const key = normalizeKey(id);
    return buildFrameObject(key, frames[key]);
  }

  function getFrameByIndex(index) {
    const ids = getFrameIds();
    const id = ids[index];
    if (id === undefined) return null;
    return getFrameById(id);
  }

  function getFrames() {
    return getFrameIds().map((id) => getFrameById(id));
  }

  function getFrameIndexById(id) {
    return getFrameIds().indexOf(normalizeKey(id));
  }

  // ---- Новое: утилиты снимков и менеджер отмены ----
  function deepCopy(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return {}; }
  }

  function getSnapshot() {
    return deepCopy(frames);
  }

  function setSnapshot(snapshot) {
    Object.keys(frames).forEach(k => { delete frames[k]; });
    if (snapshot && typeof snapshot === 'object') {
      Object.keys(snapshot).forEach(k => { frames[k] = deepCopy(snapshot[k]); });
    }
    try { window.storyboardData = window.storyboardData || {}; window.storyboardData.frames = frames; } catch (e) { /* ignore */ }
  }

  // Простой undo менеджер (push before/after snapshots)
  window.undoManager = (function() {
    const stack = [];
    let idx = -1;
    const MAX = 200;
    return {
      pushAction(action) {
        // отрезаем возможный redo
        if (idx < stack.length - 1) stack.splice(idx + 1);
        stack.push(action);
        if (stack.length > MAX) stack.shift();
        idx = stack.length - 1;
        // notify listeners about stack change
        try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
      },
      undo() {
        const store = window.storyboardStore;
        if (!store) return;
        if (idx < 0) return;
        const action = stack[idx];
        if (!action || !action.before) {
          idx--;
          try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
          return;
        }
        try {
          store._suppressUndo = true;
          setSnapshot(action.before);
          if (window.renderFrames) window.renderFrames();
          if (window.updateLeftScrollbar) window.updateLeftScrollbar();
        } finally {
          store._suppressUndo = false;
        }
        idx--;
        try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
      },
      // Новое: redo — вернуть действие, на которое был сделан undo
      redo() {
        const store = window.storyboardStore;
        if (!store) return;
        if (idx >= stack.length - 1) return;
        // следующий элемент в стеке
        const nextIdx = idx + 1;
        const action = stack[nextIdx];
        if (!action || !action.after) {
          idx = nextIdx;
          try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
          return;
        }
        try {
          store._suppressUndo = true;
          setSnapshot(action.after);
          if (window.renderFrames) window.renderFrames();
          if (window.updateLeftScrollbar) window.updateLeftScrollbar();
        } finally {
          store._suppressUndo = false;
        }
        idx = nextIdx;
        try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
      },
      clear() {
        stack.length = 0;
        idx = -1;
        try { window.dispatchEvent(new Event('undoStackChanged')); } catch(e){/*ignore*/}
      },
     // Helpers for UI
     canUndo() { return idx >= 0 && stack.length > 0; },
     canRedo() { return idx < stack.length - 1; }
    };
  })();

  function setFrameValuesById(id, values = {}) {
    const key = normalizeKey(id);
    const target = frames[key];
    if (!target) {
      return null;
    }

    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    if (Object.prototype.hasOwnProperty.call(values, 'image')) {
      target.image = values.image;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'description')) {
      target.description = values.description;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'start')) {
      target.start_time = formatTimestamp(values.start);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'end')) {
      target.end_time = formatTimestamp(values.end);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'shotSize')) {
      target.shotSize = normalizeShotSize(values.shotSize);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'connectedPage')) {
      target.connectedPage = normalizePageValue(values.connectedPage);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'number')) {
      const n = Number(values.number);
      if (Number.isFinite(n)) {
        target.number = n;
      }
    }

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'modify', before: beforeSnapshot, after: afterSnapshot, meta: { id: key, values } });
    }

    return getFrameById(id);
  }

  function setFrameValuesByIndex(index, values = {}) {
    const ids = getFrameIds();
    const id = ids[index];
    if (id === undefined) return null;
    return setFrameValuesById(id, values);
  }

  function getNextFrameId() {
    const ids = getFrameIds();
    if (ids.length === 0) return 1;
    const max = Math.max(...ids.map((id) => Number(id)));
    return max + 1;
  }

  function getNextFrameNumber() {
    const nums = Object.keys(frames).map(k => {
      const v = frames[k];
      return (v && typeof v.number === 'number') ? v.number : Number(k);
    });
    if (nums.length === 0) return 1;
    return Math.max(...nums) + 1;
  }

  function addFrame(frameData = {}) {
    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    const id = normalizeKey(frameData.id ?? getNextFrameId());
    const startSeconds = frameData.start ?? 0;
    const endSeconds = frameData.end ?? startSeconds + 15;
    const numberValue = Number.isFinite(Number(frameData.number)) ? Number(frameData.number) : getNextFrameNumber();

    frames[id] = {
      image: frameData.image || '',
      description: frameData.description || '',
      start_time: formatTimestamp(startSeconds),
      end_time: formatTimestamp(endSeconds),
      shotSize: normalizeShotSize(frameData.shotSize || '-'),
      connectedPage: normalizePageValue(frameData.connectedPage),
      number: numberValue
    };

    const newIndex = getFrameIndexById(id);

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'add', before: beforeSnapshot, after: afterSnapshot, meta: { id } });
    }

    return newIndex;
  }

  function removeFrameByIndex(index) {
    const ids = getFrameIds();
    const id = ids[index];
    if (id === undefined) return;
    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    delete frames[id];

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'remove', before: beforeSnapshot, after: afterSnapshot, meta: { id } });
    }
  }

  function removeFrameById(id) {
    const key = normalizeKey(id);
    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    delete frames[key];

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'remove', before: beforeSnapshot, after: afterSnapshot, meta: { id: key } });
    }
  }

  // PAGES: теперь pages[n] -> { number, text }
  function getPages() {
    return getPageNumbers().map((num) => {
      const p = pages[num];
      return {
        num: Number(num),
        text: p && typeof p === 'object' ? p.text : p
      };
    });
  }

  function getPageNumbers() {
    return Object.keys(pages).sort((a, b) => {
      const pa = pages[a];
      const pb = pages[b];
      const na = pa && typeof pa.number === 'number' ? pa.number : Number(a);
      const nb = pb && typeof pb.number === 'number' ? pb.number : Number(b);
      return na - nb;
    });
  }

  function getPageText(num) {
    const p = pages[normalizeKey(num)];
    return p && typeof p === 'object' ? (p.text || null) : (p || null);
  }

  function setPageText(num, text) {
    const key = normalizeKey(num);
    const n = Number(num);
    pages[key] = {
      number: Number.isFinite(n) ? n : Number(key),
      text: text
    };
  }

  window.storyboardStore = {
    getFrameIds,
    getFrameCount,
    getFrames,
    getFrameByIndex,
    getFrameById,
    getFrameIndexById,
    setFrameValuesById,
    setFrameValuesByIndex,
    getNextFrameId,
    addFrame,
    removeFrameByIndex,
    removeFrameById,
    getPages,
    getPageNumbers,
    getPageText,
    setPageText,
    getSnapshot,
    setSnapshot,
    _suppressUndo: false
  };
})();

