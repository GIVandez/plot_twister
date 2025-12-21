// frames-blocks.js — взаимодействие с кнопками Shot Size и Page Connect

// Функция для выбора плана кадра
function selectShotSize(frameIndex) {
    const store = window.storyboardStore;
    if (!store) return;
    const frame = store.getFrameByIndex(frameIndex);
    
    if (frame) {
        const shotSizes = [
            "Extreme Close Up", 
            "Close Up", 
            "Medium Close Up", 
            "Medium Shot", 
            "Medium Full Shot", 
            "Full Shot", 
            "Long Shot", 
            "Extreme Long Shot"
        ];
        
        const currentSize = frame.shotSize || "Medium Shot";
        const newShotSize = prompt(`Выберите план кадра для "${frame.image}":`, currentSize);
        
        if (newShotSize && newShotSize.trim() !== "") {
            store.setFrameValuesByIndex(frameIndex, { shotSize: newShotSize });
            
            // Обновляем отображение
            if (window.renderFrames) {
                window.renderFrames();
            }
        }
    }
}

// Функция для привязки к странице
function connectToPage(frameIndex) {
    const store = window.storyboardStore;
    if (!store) return;
    const frame = store.getFrameByIndex(frameIndex);
    
    if (frame) {
        if (frame.connectedPage) {
            // Если уже привязана - открываем страницу
            if (window.openScriptPage) {
                window.openScriptPage(frame.connectedPage, frameIndex);
            } else {
                alert(`Кадр привязан к странице ${frame.connectedPage}, но система отображения страниц не инициализирована`);
            }
        } else {
            // Если не привязана - открываем модальное окно выбора страницы
            if (window.openPageSelectorModal) {
                window.openPageSelectorModal(frameIndex);
            } else {
                // Fallback на prompt если модальное окно не инициализировано
                const availablePages = store.getPageNumbers().join(', ');
                const pageNumber = prompt(`Привязать кадр "${frame.image}" к странице сценария.\nДоступные страницы: ${availablePages}\nВведите номер страницы:`);
                
                if (pageNumber && !isNaN(pageNumber)) {
                    const pageNum = parseInt(pageNumber);
                    const pageExists = !!store.getPageText(pageNum);
                    
                    if (pageExists) {
                        store.setFrameValuesByIndex(frameIndex, { connectedPage: pageNum });
                        
                        if (window.renderFrames) {
                            window.renderFrames();
                        }
                        
                        setTimeout(() => {
                            if (window.openScriptPage) {
                                window.openScriptPage(pageNum, frameIndex);
                            }
                        }, 100);
                    } else {
                        alert(`Страницы с номером ${pageNumber} не существует`);
                    }
                }
            }
        }
    }
}

// Добавляем функции в глобальную область видимости
window.selectShotSize = selectShotSize;
window.connectToPage = connectToPage;