// pages-manager.js — управление отображением страниц
class PagesManager {
    constructor() {
        this.isVisible = false;
        this.init();
    }

    init() {
        // Изначально скрываем секцию страниц
        this.hidePage();
    }

    // Показать страницу по ID из connectedPage
    showPage(pageId) {
        // Находим страницу по ID
        const store = window.storyboardStore;
        const pageText = store ? store.getPageTextById(pageId) : null;
        
        if (pageText) {
            this.loadPageContent(pageText);
            this.showPageSection();
        } else {
            // Если страница не найдена, показываем сообщение
            this.showNotFoundPage(pageId);
        }
    }

    showPageSection() {
        const pagesSection = document.getElementById('pagesSection');
        pagesSection.classList.remove('hidden');
        this.isVisible = true;
    }

    hidePage() {
        const pagesSection = document.getElementById('pagesSection');
        pagesSection.classList.add('hidden');
        this.isVisible = false;
    }

    loadPageContent(pageText) {
        const pageContent = document.getElementById('pageContent');
        
        if (pageText) {
            // Убираем ведущие пробелы/переводы строк и загружаем текст страницы с поддержкой HTML
            pageContent.innerHTML = String(pageText).replace(/^[\r\n\s]+/, '');
            
            // Прокручиваем к началу страницы
            document.getElementById('pageDisplay').scrollTop = 0;
        }
    }

    showNotFoundPage(pageId) {
        const pageContent = document.getElementById('pageContent');
        const store = window.storyboardStore;
        const available = store ? store.getPageNumbers().join(', ') : '';
        pageContent.innerHTML = `Страница с ID ${pageId} не найдена.\n\nДоступные страницы: ${available}`;
        this.showPageSection();
    }
}

// Создаем глобальный экземпляр менеджера страниц
window.pagesManager = new PagesManager();

// Функция для открытия страницы из кнопки кадра
window.openConnectedPage = function(pageId) {
    if (window.pagesManager) {
        window.pagesManager.showPage(pageId);
    }
};