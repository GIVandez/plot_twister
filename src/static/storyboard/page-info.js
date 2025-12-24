// script-pages.js — управление отображением страниц сценария
class ScriptPagesManager {
    constructor() {
        this.isVisible = false;
        this.currentFrameIndex = null;
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
        
        // Добавляем обработчики для кнопок связи
        const pageLinkBtn = document.getElementById('pageLinkBtn');
        const pageUnlinkBtn = document.getElementById('pageUnlinkBtn');
        
        if (pageLinkBtn) {
            pageLinkBtn.addEventListener('click', () => this.linkFrameToPage());
        }
        
        if (pageUnlinkBtn) {
            pageUnlinkBtn.addEventListener('click', () => this.unlinkFrameFromPage());
        }
    }

    // Показать страницу по ID
    showPage(pageId, frameIndex) {
        this.currentFrameIndex = frameIndex;
        
        // Сначала скрываем информацию о кадре (если функция доступна)
        if (typeof window.hideFrameInfo === 'function') window.hideFrameInfo();
        
        // Находим страницу по ID
        const store = window.storyboardStore;
        const pageText = store ? store.getPageTextById(pageId) : null;
        
        if (pageText) {
            this.loadPageContent(pageText);
            this.showPageSection();
        } else {
            this.showNotFoundPage(pageId, frameIndex);
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
            
            // Убедимся, что кнопки активны
            const pageLinkBtn = document.getElementById('pageLinkBtn');
            const pageUnlinkBtn = document.getElementById('pageUnlinkBtn');
            if (pageLinkBtn) pageLinkBtn.disabled = false;
            if (pageUnlinkBtn) pageUnlinkBtn.disabled = false;
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
            // Убираем ведущие пробелы/переводы строк и загружаем текст страницы с поддержкой HTML
            pageContent.innerHTML = String(pageText).replace(/^[\r\n\s]+/, '');
            
            // Прокручиваем к началу страницы
            pageContent.scrollTop = 0;
        }
    }

    showNotFoundPage(pageId, frameIndex) {
        const pageContent = document.getElementById('pageContent');
        
        const store = window.storyboardStore;
        const available = store ? store.getPageNumbers().join(', ') : '';
        pageContent.innerHTML = `Страница с ID ${pageId} не найдена.\n\nДоступные страницы: ${available}`;
        this.showPageSection();
    }
    
    // Связать кадр с текущей страницей
    linkFrameToPage() {
        if (this.currentFrameIndex === null) return;
        
        const store = window.storyboardStore;
        if (!store) return;
        
        const frame = store.getFrameByIndex(this.currentFrameIndex);
        if (!frame) return;
        
        // Получаем номер текущей страницы из текста или где-то
        // Предполагаем, что текущая страница - та, что открыта
        // Но поскольку showPage получает pageNumber, нужно сохранить его.
        
        // В showPage pageNumber передается, но не сохраняется.
        // Нужно добавить свойство currentPageNumber.
        
        // Для простоты, поскольку модальное окно открывается для выбора, но пользователь говорит "предлагается выбор новой страницы"
        
        // Открываем модальное окно выбора страницы
        if (window.openPageSelectorModal) {
            window.openPageSelectorModal(this.currentFrameIndex);
        }
    }
    
    // Отвязать кадр от страницы
    async unlinkFrameFromPage() {
        if (this.currentFrameIndex === null) return;
        
        const store = window.storyboardStore;
        if (!store) return;
        
        const frame = store.getFrameByIndex(this.currentFrameIndex);
        if (!frame) return;
        
        // Отправляем запрос на сервер для отключения
        const success = await store.disconnectFrame(frame.id);
        if (success) {
            // `disconnectFrame` уже обновил локальные данные; просто перерисуем UI
            if (window.renderFrames) {
                window.renderFrames();
            }
            // Закрываем открытую страницу (pageDisplay) после отвязки
            try { this.hidePage(); } catch (e) { /* ignore */ }
            alert('Связь кадра со страницей удалена.');
        } else {
            alert('Ошибка при удалении связи.');
        }
    }
}

// Создаем глобальный экземпляр менеджера страниц
window.scriptPagesManager = new ScriptPagesManager();

// Функция для открытия страницы из кнопки кадра
window.openScriptPage = function(pageId, frameIndex) {
    if (window.scriptPagesManager) {
        window.scriptPagesManager.showPage(pageId, frameIndex);
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