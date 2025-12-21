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

    // Показать страницу по номеру из connectedPage
    showPage(pageNumber) {
        // Находим страницу по номеру
        const store = window.storyboardStore;
        const pageText = store ? store.getPageText(pageNumber) : null;
        
        if (pageText) {
            this.loadPageContent(pageText);
            this.showPageSection();
        } else {
            // Если страница не найдена, показываем сообщение
            this.showNotFoundPage(pageNumber);
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
            // Убираем ведущие пробелы/переводы строк и загружаем текст страницы
            pageContent.textContent = String(pageText).replace(/^[\r\n\s]+/, '');
            
            // Прокручиваем к началу страницы
            document.getElementById('pageDisplay').scrollTop = 0;
        }
    }

    showNotFoundPage(pageNumber) {
        const pageContent = document.getElementById('pageContent');
        const store = window.storyboardStore;
        const available = store ? store.getPageNumbers().join(', ') : '';
        pageContent.textContent = `Страница с номером ${pageNumber} не найдена.\n\nДоступные страницы: ${available}`;
        this.showPageSection();
    }
}

// Создаем глобальный экземпляр менеджера страниц
window.pagesManager = new PagesManager();

// Функция для открытия страницы из кнопки кадра
window.openConnectedPage = function(pageNumber) {
    if (window.pagesManager) {
        window.pagesManager.showPage(pageNumber);
    }
};