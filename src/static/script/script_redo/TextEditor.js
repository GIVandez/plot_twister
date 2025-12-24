class TextEditor {
	constructor() {
		this.textContent = document.getElementById('textContent');
		this.undoBtn = document.getElementById('undoBtn');
		this.redoBtn = document.getElementById('redoBtn');
		this.italicBtn = document.getElementById('italicBtn');
		this.boldBtn = document.getElementById('boldBtn');
		this.normalBtn = document.getElementById('normalBtn');
		this.leftAlignBtn = document.getElementById('leftAlignBtn');
		this.centerAlignBtn = document.getElementById('centerAlignBtn');
		this.rightAlignBtn = document.getElementById('rightAlignBtn');
		this.saveBtn = document.getElementById('saveBtn');
		this.themeToggleBtn = document.getElementById('themeToggleBtn');
		this.pageThemeToggleBtn = document.getElementById('pageThemeToggleBtn');

		this.undoStack = [];
		this.redoStack = [];
		// Determine page number and id from query params if present
		const params = new URLSearchParams(window.location.search);
		this.currentPage = Number(params.get('pageNum')) || 1;
		this.exitBtn = document.getElementById('exitBtn');
		this.currentPageId = params.get('pageId') ? Number(params.get('pageId')) : null;
		// project id passed so exit can return to the correct project's script
		this.projectId = params.get('project') || '1';

		// Page storage (simulated in-memory for now)
		this.dirty = false;
		this.pages = {};

		this.init();
	}

	init() {
		// Prevent browser back button from navigating away without warning
		history.pushState(null, null, location.href);
		window.addEventListener('popstate', (e) => {
			if (this.dirty) {
				const leave = confirm('Текст изменён и не сохранён. Данные будут потеряны. Всё равно уйти?');
				if (!leave) {
					history.pushState(null, null, location.href);
				}
			}
		});

		this.loadTheme();
		this.loadPageTheme();
		this.setupEventListeners();
		this.loadPage(this.currentPage);
	}

	setupEventListeners() {
		// Format buttons
		this.boldBtn.addEventListener('click', () => this.applyFormat('bold'));
		this.italicBtn.addEventListener('click', () => this.applyFormat('italic'));
		this.normalBtn.addEventListener('click', () => this.removeFormat());

		// Alignment buttons
		this.leftAlignBtn.addEventListener('click', () => this.applyAlignment('left'));
		this.centerAlignBtn.addEventListener('click', () => this.applyAlignment('center'));
		this.rightAlignBtn.addEventListener('click', () => this.applyAlignment('right'));

		// Undo / Redo
		this.undoBtn.addEventListener('click', () => this.undo());
		this.redoBtn.addEventListener('click', () => this.redo());

		// Save button -> persist to server via API
		this.saveBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			await this.savePage();
		});

		// Theme toggle button
		this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

		// Page theme toggle button
		this.pageThemeToggleBtn.addEventListener('click', () => this.togglePageTheme());

		// Exit button: ask to save if dirty, then navigate back to pages list
		if (this.exitBtn) {
			this.exitBtn.addEventListener('click', async (e) => {
				e.preventDefault();
				const target = '/static/script/script.html?project=' + encodeURIComponent(this.projectId || '1');
				if (!this.dirty) {
					window.location.href = target;
					return;
				}
				const save = confirm('Текст изменён. Сохранить перед выходом?');
				if (save) {
					const ok = await this.savePage();
					if (ok) window.location.href = target;
					else {
						const exitAnyway = confirm('Сохранение не удалось. Выйти без сохранения?');
						if (exitAnyway) window.location.href = target;
					}
				} else {
					window.location.href = target;
				}
			});
		}

		// Content area - track changes for undo/redo
		this.textContent.addEventListener('beforeinput', () => {
			this.saveState();
			this.dirty = true;
		});

		// Warn user about unsaved changes when trying to leave the page
		window.addEventListener('beforeunload', (e) => {
			if (this.dirty) {
				e.preventDefault();
				e.returnValue = 'Текст изменён и не сохранён. Данные будут потеряны при выходе.';
				return e.returnValue;
			}
		});

		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === 'b' || e.key === 'B') {
					e.preventDefault();
					this.applyFormat('bold');
				} else if (e.key === 'i' || e.key === 'I') {
					e.preventDefault();
					this.applyFormat('italic');
				} else if (e.key === 'z' || e.key === 'Z') {
					if (e.shiftKey) {
						e.preventDefault();
						this.redo();
					} else {
						e.preventDefault();
						this.undo();
					}
				}
			}
		});

		// Intercept Enter key in the editable area to insert <br> instead of creating new block elements
		this.textContent.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				// save state for undo before changing content
				this.saveState();
				this.insertLineBreakAtCaret();
				this.dirty = true;
				this.updateButtonStates();
			}
		});

		// Update button states on selection change
		this.textContent.addEventListener('mouseup', () => this.updateButtonStates());
		this.textContent.addEventListener('keyup', () => this.updateButtonStates());
	}

	applyFormat(format) {
		this.textContent.focus();
		if (format === 'bold') {
			document.execCommand('bold', false, null);
		} else if (format === 'italic') {
			document.execCommand('italic', false, null);
		}
		this.updateButtonStates();
	}

	removeFormat() {
		this.textContent.focus();
		document.execCommand('removeFormat', false, null);
		this.updateButtonStates();
	}

	// Insert a line break (<br>) at the current caret position without creating new block elements
	insertLineBreakAtCaret() {
		const sel = window.getSelection();
		if (!sel || !sel.rangeCount) return;
		const range = sel.getRangeAt(0);
		// save current selection contents to undo stack first
		range.deleteContents();
		// Insert an invisible zwsp after a <br> so we can place the caret reliably
		const zw = document.createTextNode('\u200B');
		const br = document.createElement('br');
		range.insertNode(zw);
		range.insertNode(br);
		// Move caret after the zwsp
		range.setStartAfter(zw);
		range.collapse(true);
		sel.removeAllRanges();
		sel.addRange(range);
	}

	applyAlignment(alignment) {
		// Use CSS text-align on the single editable container to avoid
		// splitting content into separate block elements.
		this.textContent.focus();
		if (alignment === 'left') {
			this.textContent.style.textAlign = 'left';
		} else if (alignment === 'center') {
			this.textContent.style.textAlign = 'center';
		} else if (alignment === 'right') {
			this.textContent.style.textAlign = 'right';
		}
		this.updateButtonStates();
	}

	updateButtonStates() {
		// Update format button states
		this.boldBtn.classList.toggle('active', document.queryCommandState('bold'));
		this.italicBtn.classList.toggle('active', document.queryCommandState('italic'));

		// Update alignment button states
		// Prefer checking the container's computed text-align to avoid
		// relying on document.execCommand states which may reflect block-level changes.
		const comp = window.getComputedStyle(this.textContent).textAlign;
		this.leftAlignBtn.classList.toggle('active', comp === 'left' || comp === 'start');
		this.centerAlignBtn.classList.toggle('active', comp === 'center');
		this.rightAlignBtn.classList.toggle('active', comp === 'right' || comp === 'end');
	}

	saveState() {
		// Save current state to undo stack
		this.undoStack.push(this.textContent.innerHTML);
		this.redoStack = []; // Clear redo stack when new edit is made

		// Limit undo stack to 50 states
		if (this.undoStack.length > 50) {
			this.undoStack.shift();
		}
	}

	undo() {
		if (this.undoStack.length === 0) return;

		// Save current state to redo stack
		this.redoStack.push(this.textContent.innerHTML);

		// Restore previous state
		this.textContent.innerHTML = this.undoStack.pop();
		this.textContent.focus();
		this.updateButtonStates();
	}

	redo() {
		if (this.redoStack.length === 0) return;

		// Save current state to undo stack
		this.undoStack.push(this.textContent.innerHTML);

		// Restore next state
		this.textContent.innerHTML = this.redoStack.pop();
		this.textContent.focus();
		this.updateButtonStates();
	}

	async savePage(options = { notify: true }) {
		const notify = options && options.notify !== false;
		// Save current page content to memory
		this.pages[this.currentPage] = this.textContent.innerHTML;
		console.log(`Page ${this.currentPage} saved to memory`);

		// If pageId is known, persist to server
		if (this.currentPageId) {
			try {
				const resp = await fetch('/api/page/redoPage', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ page_id: Number(this.currentPageId), text: this.textContent.innerHTML })
				});
				if (!resp.ok) throw new Error('Failed to save page');
				console.log('Page saved to server');
				this.dirty = false;
				if (notify) try { alert('Страница успешно сохранена.'); } catch(e) {}
				return true;
			} catch (e) {
				console.error('Error saving page to server', e);
				if (notify) alert('Ошибка при сохранении страницы на сервер');
				return false;
			}
		} else {
			// No server persistence available; consider as saved locally
			this.dirty = false;
			if (notify) try { alert('Страница сохранена локально.'); } catch(e) {}
			return true;
		}
	}

	async loadPage(pageNum) {
		// Save current page before switching
		// Automatic save on page switch should not notify the user
		this.savePage({ notify: false });

		this.currentPage = pageNum;

		// Load page content from server if pageId present
		if (this.currentPageId) {
			try {
				const resp = await fetch(`/api/page/${this.currentPageId}/loadPage`);
				if (resp.ok) {
					const data = await resp.json();
					this.textContent.innerHTML = data.text || '';
				} else {
					console.warn('loadPage API returned', resp.status);
					this.textContent.innerHTML = '';
				}
			} catch (e) {
				console.error('Error loading page from API', e);
				this.textContent.innerHTML = '';
			}
		} else {
			// fallback to local storage
			if (this.pages[pageNum]) {
				this.textContent.innerHTML = this.pages[pageNum];
			} else {
				this.textContent.innerHTML = '';
			}
		}

		// Clear undo/redo for new page
		this.undoStack = [];
		this.redoStack = [];

		this.textContent.focus();
		this.updateButtonStates();
		this.dirty = false;
	}

	saveToFile() {
		// Save current page content before exporting
		// Save without notifying the user (export flow)
		this.savePage({ notify: false });

		// Get text content (plain text, stripping HTML tags)
		const plainText = this.getPlainText();

		// Create a Blob with the text content
		const blob = new Blob([plainText], { type: 'text/plain' });

		// Create a temporary download link
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `page_${this.currentPage}.txt`;

		// Trigger download
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Clean up
		URL.revokeObjectURL(url);

		console.log(`Page ${this.currentPage} saved as page_${this.currentPage}.txt`);
	}

	getPlainText() {
		// Create a temporary div to extract plain text
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = this.textContent.innerHTML;

		// Extract text and preserve line breaks
		let text = '';
		tempDiv.childNodes.forEach((node) => {
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.textContent;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				text += node.textContent + '\n';
			}
		});

		return text.trim();
	}

	loadTheme() {
		const savedTheme = localStorage.getItem('textEditorTheme') || 'dark';
		document.body.classList.toggle('light-theme', savedTheme === 'light');
		this.updateThemeBulbIcon();
	}

	loadPageTheme() {
		const savedPageTheme = localStorage.getItem('textEditorPageTheme') || 'dark';
		this.textContent.classList.toggle('page-light', savedPageTheme === 'light');
		this.textContent.classList.toggle('page-dark', savedPageTheme === 'dark');
		this.updatePageThemeIcon();
	}

	toggleTheme() {
		const isLight = document.body.classList.contains('light-theme');
		document.body.classList.toggle('light-theme', !isLight);
		const newTheme = isLight ? 'dark' : 'light';
		localStorage.setItem('textEditorTheme', newTheme);
		this.updateThemeBulbIcon();
	}

	togglePageTheme() {
		const isLight = this.textContent.classList.contains('page-light');
		this.textContent.classList.toggle('page-light', !isLight);
		this.textContent.classList.toggle('page-dark', isLight);
		const newPageTheme = isLight ? 'dark' : 'light';
		localStorage.setItem('textEditorPageTheme', newPageTheme);
		this.updatePageThemeIcon();
	}

	updateThemeIcon() {
		const isLight = document.body.classList.contains('light-theme');
		this.themeToggleBtn.innerHTML = isLight ? '🌙' : '☀';
		this.themeToggleBtn.title = isLight ? 'Темная тема' : 'Светлая тема';
	}

	updatePageThemeIcon() {
		const isLight = this.textContent.classList.contains('page-light');
		const svg = document.getElementById('pageThemeToggleSvg');
		if (isLight) {
			// Show dark page icon for light page theme
			svg.innerHTML = '<path fill="#5a5858" d="M32.415 9.586l-9-9a2.001 2.001 0 0 0-2.829 2.829l-3.859 3.859l9 9l3.859-3.859a2 2 0 0 0 2.829-2.829z"></path><path fill="#333333" d="M22 0H7a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V11h-9c-1 0-2-1-2-2V0z"></path><path fill="#e1e3e5" d="M22 0h-2v9a4 4 0 0 0 4 4h9v-2h-9c-1 0-2-1-2-2V0zm-5 8a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h8a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h8a1 1 0 0 1 1 1zm12 4a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1z"></path>';
		} else {
			// Show light page icon for dark page theme
			svg.innerHTML = '<path fill="#ededed" d="M32.415 9.586l-9-9a2.001 2.001 0 0 0-2.829 2.829l-3.859 3.859l9 9l3.859-3.859a2 2 0 0 0 2.829-2.829z"></path><path fill="#fafafa" d="M22 0H7a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V11h-9c-1 0-2-1-2-2V0z"></path><path fill="#666666" d="M22 0h-2v9a4 4 0 0 0 4 4h9v-2h-9c-1 0-2-1-2-2V0zm-5 8a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h8a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h8a1 1 0 0 1 1 1zm12 4a1 1 0 0 1-1 1H8a1 1 0 0 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1zm0 4a1 1 0 0 1-1 1H8a1 1 0 1 1 0-2h20a1 1 0 0 1 1 1z"></path>';
		}
		this.pageThemeToggleBtn.title = isLight ? 'Темная страница' : 'Светлая страница';
	}

	updateThemeBulbIcon() {
		const isLight = document.body.classList.contains('light-theme');
		const svg = document.getElementById('themeToggleSvg');
		if (isLight) {
			// Show off bulb for light theme
			svg.innerHTML = '<circle cx="12" cy="9" r="7" fill="#2A4157" fill-opacity="0.24"></circle> <path d="M11 14V9.75C11 9.05964 10.4404 8.5 9.75 8.5V8.5C9.05964 8.5 8.5 9.05964 8.5 9.75V9.75C8.5 10.4404 9.05964 11 9.75 11H14.25C14.9404 11 15.5 10.4404 15.5 9.75V9.75C15.5 9.05964 14.9404 8.5 14.25 8.5V8.5C13.5596 8.5 13 9.05964 13 9.75V14" stroke="#222222" stroke-linecap="round"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M15 16.5637C15 16.4535 14.885 16.3806 14.784 16.4245C13.9307 16.7947 12.9893 17 12 17C11.0107 17 10.0693 16.7947 9.21605 16.4245C9.11496 16.3806 9 16.4535 9 16.5637V18.5C9 19.8807 10.1193 21 11.5 21H12.5C13.8807 21 15 19.8807 15 18.5V16.5637Z" fill="#222222"></path>';
		} else {
			// Show lit bulb for dark theme
			svg.innerHTML = '<circle cx="12" cy="9" r="7" fill="#FFD700" fill-opacity="0.6"></circle> <path d="M11 14V9.75C11 9.05964 10.4404 8.5 9.75 8.5V8.5C9.05964 8.5 8.5 9.05964 8.5 9.75V9.75C8.5 10.4404 9.05964 11 9.75 11H14.25C14.9404 11 15.5 10.4404 15.5 9.75V9.75C15.5 9.05964 14.9404 8.5 14.25 8.5V8.5C13.5596 8.5 13 9.05964 13 9.75V14" stroke="#FFFFFF" stroke-linecap="round"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M15 16.5637C15 16.4535 14.885 16.3806 14.784 16.4245C13.9307 16.7947 12.9893 17 12 17C11.0107 17 10.0693 16.7947 9.21605 16.4245C9.11496 16.3806 9 16.4535 9 16.5637V18.5C9 19.8807 10.1193 21 11.5 21H12.5C13.8807 21 15 19.8807 15 18.5V16.5637Z" fill="#afb0b1"></path>';
		}
		this.themeToggleBtn.title = isLight ? 'Темная тема' : 'Светлая тема';
	}
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	new TextEditor();
});
