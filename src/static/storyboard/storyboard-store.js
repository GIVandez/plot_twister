(function () {
  // Initialize empty data structures
  const frames = [];
  const pages = {};

  function normalizeKey(value) {
    return Number(value) || 0;
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
    // Сортировка по полю 'number' кадра (порядок отображения)
    return frames.slice().sort((a, b) => a.number - b.number).map(f => f.frame_id);
  }

  function getFrameCount() {
    return getFrameIds().length;
  }

  function buildFrameObject(raw) {
    if (!raw) return null;
    return {
      id: raw.frame_id,
      number: raw.number,
      image: raw.pic_path,
      description: raw.description,
      start: raw.start_time,
      end: raw.end_time,
      shotSize: '', // no shotSize in new format
      connectedPage: raw.connected
    };
  }

  function getFrameById(id) {
    const frame = frames.find(f => f.frame_id === Number(id));
    return buildFrameObject(frame);
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
    return getFrameIds().indexOf(Number(id));
  }

  // ---- Новое: утилиты снимков и менеджер отмены ----
  function deepCopy(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return {}; }
  }

  function getSnapshot() {
    return deepCopy(frames);
  }

  function setSnapshot(snapshot) {
    frames.length = 0;
    if (Array.isArray(snapshot)) {
      frames.push(...deepCopy(snapshot));
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
    const target = frames.find(f => f.frame_id === Number(id));
    if (!target) {
      return null;
    }

    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    if (Object.prototype.hasOwnProperty.call(values, 'image')) {
      target.pic_path = values.image;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'description')) {
      target.description = values.description;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'start')) {
      target.start_time = values.start;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'end')) {
      target.end_time = values.end;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'connectedPage')) {
      target.connected = values.connectedPage;
    }
    if (Object.prototype.hasOwnProperty.call(values, 'number')) {
      const n = Number(values.number);
      if (Number.isFinite(n)) {
        target.number = n;
      }
    }

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'modify', before: beforeSnapshot, after: afterSnapshot, meta: { id: Number(id), values } });
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
    const nums = frames.map(f => f.number).filter(n => typeof n === 'number');
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

    const newFrame = {
      frame_id: id,
      description: frameData.description || '',
      start_time: startSeconds,
      end_time: endSeconds,
      pic_path: frameData.image || '',
      connected: frameData.connectedPage || '',
      number: numberValue
    };

    frames.push(newFrame);

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
    const numId = Number(id);
    const index = frames.findIndex(f => f.frame_id === numId);
    if (index === -1) return;

    const storeObj = window.storyboardStore || {};
    const suppress = !!storeObj._suppressUndo;
    const beforeSnapshot = suppress ? null : getSnapshot();

    frames.splice(index, 1);

    if (!suppress) {
      const afterSnapshot = getSnapshot();
      window.undoManager && window.undoManager.pushAction({ type: 'remove', before: beforeSnapshot, after: afterSnapshot, meta: { id: numId } });
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

  // API functions
  const API_BASE = window.location.origin;

  async function loadFrames(projectId) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/${projectId}/loadFrames`);
      if (!response.ok) throw new Error('Failed to load frames');
      const data = await response.json();
      // data.frames is array
      frames.length = 0; // Clear existing
      data.frames.forEach(frame => {
        frames.push({
          frame_id: frame.frame_id,
          description: frame.description,
          start_time: frame.start_time,
          end_time: frame.end_time,
          pic_path: frame.pic_path,
          connected: frame.connected || '',
          number: frame.number
        });
      });
      return true;
    } catch (error) {
      console.error('Error loading frames:', error);
      return false;
    }
  }

  async function loadPages(projectId) {
    try {
      const response = await fetch(`${API_BASE}/api/page/${projectId}/loadPages`);
      if (!response.ok) throw new Error('Failed to load pages');
      const data = await response.json();
      // data.pages is Dict[str, PageInfo]
      Object.keys(pages).forEach(key => delete pages[key]); // Clear existing
      Object.entries(data.pages).forEach(([key, page]) => {
        pages[key] = {
          number: page.number,
          text: page.text
        };
      });
      return true;
    } catch (error) {
      console.error('Error loading pages:', error);
      return false;
    }
  }

  // Other API functions
  async function newFrame(projectId, description, startTime, endTime, connectedPageId) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/newFrame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          description: description || '',
          start_time: startTime,
          end_time: endTime,
          connected_page_id: connectedPageId || null
        })
      });
      if (!response.ok) throw new Error('Failed to create frame');
      const data = await response.json();
      // Assuming response has frame_id
      // Reload frames to get updated list
      await loadFrames(projectId);
      return data;
    } catch (error) {
      console.error('Error creating frame:', error);
      return null;
    }
  }

  async function dragAndDropFrame(frameId, newPosition) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/dragAndDropFrame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId,
          frame_number: newPosition
        })
      });
      if (!response.ok) throw new Error('Failed to move frame');
      // Reload frames
      const projectId = getProjectIdFromFrames();
      if (projectId) await loadFrames(projectId);
      return true;
    } catch (error) {
      console.error('Error moving frame:', error);
      return false;
    }
  }

  async function redoStartTime(frameId, startTime) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/redoStartTime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId,
          start_time: startTime
        })
      });
      if (!response.ok) throw new Error('Failed to update start time');
      // Update local frame
      const frame = frames.find(f => f.frame_id === frameId);
      if (frame) frame.start_time = startTime;
      return true;
    } catch (error) {
      console.error('Error updating start time:', error);
      return false;
    }
  }

  async function redoEndTime(frameId, endTime) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/redoEndTime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId,
          end_time: endTime
        })
      });
      if (!response.ok) throw new Error('Failed to update end time');
      // Update local frame
      const frame = frames.find(f => f.frame_id === frameId);
      if (frame) frame.end_time = endTime;
      return true;
    } catch (error) {
      console.error('Error updating end time:', error);
      return false;
    }
  }

  async function redoDescription(frameId, description) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/redoDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId,
          description: description
        })
      });
      if (!response.ok) throw new Error('Failed to update description');
      // Update local frame
      const frame = frames.find(f => f.frame_id === frameId);
      if (frame) frame.description = description;
      return true;
    } catch (error) {
      console.error('Error updating description:', error);
      return false;
    }
  }

  async function deleteFrame(frameId) {
    try {
      const response = await fetch(`${API_BASE}/api/frame/deleteFrame`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId
        })
      });
      if (!response.ok) throw new Error('Failed to delete frame');
      // Remove from local frames
      const index = frames.findIndex(f => f.frame_id === frameId);
      if (index !== -1) frames.splice(index, 1);
      return true;
    } catch (error) {
      console.error('Error deleting frame:', error);
      return false;
    }
  }

  async function uploadImage(frameId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('frame_id', frameId);
      formData.append('picture', imageFile);

      const response = await fetch(`${API_BASE}/api/frame/uploadImage`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      // Update local frame pic_path if needed
      const frame = frames.find(f => f.frame_id === frameId);
      if (frame && data.pic_path) frame.pic_path = data.pic_path;
      return data;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async function deleteImage(frameId) {
    try {
      const response = await fetch(`${API_BASE}/api/graphic/deleteImage`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: frameId
        })
      });
      if (!response.ok) throw new Error('Failed to delete image');
      // Update local frame
      const frame = frames.find(f => f.frame_id === frameId);
      if (frame) frame.pic_path = null;
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Helper function to get project ID from frames
  function getProjectIdFromFrames() {
    return window.currentProjectId || 1;
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
    loadFrames,
    loadPages,
    newFrame,
    dragAndDropFrame,
    redoStartTime,
    redoEndTime,
    redoDescription,
    deleteFrame,
    uploadImage,
    deleteImage,
    getSnapshot,
    setSnapshot,
    _suppressUndo: false
  };
})();

