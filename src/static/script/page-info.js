// script-pages.js — управление отображением страниц сценария
class ScriptPagesManager {
    constructor() {
        this.isVisible = false;
        this.init();
    }

    init() {
        // Изначально скрываем страницу
        this.hidePage();
        
        // Добавляем обработчик закрытия
        const closePageBtn = document.getElementById('closePageBtn');
        if (closePageBtn) {
            closePageBtn.addEventListener('click', () => this.hidePage());
        }
    }

    // Показать страницу по номеру
    showPage(pageNumber, frameIndex) {
        // Сначала скрываем информацию о кадре
        hideFrameInfo();
        
        // Находим страницу по номеру
        const store = window.storyboardStore;
        const pageText = store ? store.getPageText(pageNumber) : null;
        
        if (pageText) {
            this.loadPageContent(pageText);
            this.showPageSection();
        } else {
            this.showNotFoundPage(pageNumber, frameIndex);
        }
    }

    showPageSection() {
        const pageDisplay = document.getElementById('pageDisplay');
        if (pageDisplay) {
            // Сначала устанавливаем display: flex и opacity: 0
            pageDisplay.style.display = 'flex';
            pageDisplay.style.opacity = '0';
            pageDisplay.classList.add('active');
            
            // Анимация появления привязанной страницы через небольшой таймаут
            // чтобы браузер успел применить display: flex перед анимацией
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    pageDisplay.style.opacity = '1';
                });
            });
            
            this.isVisible = true;
        }
    }

    hidePage() {
        const pageDisplay = document.getElementById('pageDisplay');
        if (pageDisplay) {
            // Анимация исчезновения перед скрытием
            pageDisplay.style.opacity = '0';
            setTimeout(() => {
                if (pageDisplay.style.opacity === '0') {
                    pageDisplay.classList.remove('active');
                    pageDisplay.style.display = 'none';
                }
            }, 300); // Время должно совпадать с transition duration
            this.isVisible = false;
        }
    }

    loadPageContent(pageText) {
        const pageContent = document.getElementById('pageContent');
        
        if (pageText) {
            // Убираем ведущие пробелы/переводы строк и загружаем текст страницы
            pageContent.textContent = String(pageText).replace(/^[\r\n\s]+/, '');
            
            // Прокручиваем к началу страницы
            pageContent.scrollTop = 0;
        }
    }

    showNotFoundPage(pageNumber, frameIndex) {
        const pageContent = document.getElementById('pageContent');
        
        const store = window.storyboardStore;
        const available = store ? store.getPageNumbers().join(', ') : '';
        pageContent.textContent = `Страница с номером ${pageNumber} не найдена.\n\nДоступные страницы: ${available}`;
        this.showPageSection();
    }
}

// Создаем глобальный экземпляр менеджера страниц
window.scriptPagesManager = new ScriptPagesManager();

// Функция для открытия страницы из кнопки кадра
window.openScriptPage = function(pageNumber, frameIndex) {
    if (window.scriptPagesManager) {
        window.scriptPagesManager.showPage(pageNumber, frameIndex);
    }
};

// Функция для скрытия страницы
window.hideScriptPage = function() {
    if (window.scriptPagesManager) {
        window.scriptPagesManager.hidePage();
    }
};

// Глобальная функция для скрытия страницы (для использования в frames-click.js)
function hideScriptPage() {
    if (window.scriptPagesManager) {
        window.scriptPagesManager.hidePage();
    }
}