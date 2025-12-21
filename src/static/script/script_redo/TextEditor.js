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
		this.pageNumber = document.getElementById('pageNumber');
		this.themeToggleBtn = document.getElementById('themeToggleBtn');
		this.pageThemeToggleBtn = document.getElementById('pageThemeToggleBtn');

		this.undoStack = [];
		this.redoStack = [];
		this.currentPage = 1;

		// Page storage (simulated in-memory for now)
		this.pages = {};

		this.init();
	}

	init() {
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

		// Save button
		this.saveBtn.addEventListener('click', () => this.saveToFile());

		// Theme toggle button
		this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

		// Page theme toggle button
		this.pageThemeToggleBtn.addEventListener('click', () => this.togglePageTheme());

		// Content area - track changes for undo/redo
		this.textContent.addEventListener('beforeinput', () => {
			this.saveState();
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

	applyAlignment(alignment) {
		this.textContent.focus();
		if (alignment === 'left') {
			document.execCommand('justifyLeft', false, null);
		} else if (alignment === 'center') {
			document.execCommand('justifyCenter', false, null);
		} else if (alignment === 'right') {
			document.execCommand('justifyRight', false, null);
		}
		this.updateButtonStates();
	}

	updateButtonStates() {
		// Update format button states
		this.boldBtn.classList.toggle('active', document.queryCommandState('bold'));
		this.italicBtn.classList.toggle('active', document.queryCommandState('italic'));

		// Update alignment button states
		const isLeft = document.queryCommandState('justifyLeft');
		const isCenter = document.queryCommandState('justifyCenter');
		const isRight = document.queryCommandState('justifyRight');

		this.leftAlignBtn.classList.toggle('active', isLeft);
		this.centerAlignBtn.classList.toggle('active', isCenter);
		this.rightAlignBtn.classList.toggle('active', isRight);
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

	savePage() {
		// Save current page content to memory (in a real app, send to backend)
		this.pages[this.currentPage] = this.textContent.innerHTML;
		console.log(`Page ${this.currentPage} saved to memory`);
	}

	loadPage(pageNum) {
		// Save current page before switching
		this.savePage();

		this.currentPage = pageNum;
		this.pageNumber.value = pageNum;

		// Load page content
		if (this.pages[pageNum]) {
			this.textContent.innerHTML = this.pages[pageNum];
		} else {
			this.textContent.innerHTML = '';
		}

		// Clear undo/redo for new page
		this.undoStack = [];
		this.redoStack = [];

		this.textContent.focus();
		this.updateButtonStates();
	}

	saveToFile() {
		// Save current page content before exporting
		this.savePage();

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
