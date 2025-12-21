function renderFramesLegacy() {
    const container = document.getElementById('framesContainer');
    if (!container) {
        return;
    }
    
    container.innerHTML = '';

    const store = window.storyboardStore;
    const ids = store ? store.getFrameIds() : [];

    ids.forEach((id, index) => {
        const frame = store.getFrameById(id);
        if (!frame) return;
         const frameDiv = document.createElement('div');
        frameDiv.className = 'frame';
        frameDiv.dataset.index = index;

        const imgDiv = document.createElement('div');
        imgDiv.className = 'frame-image';
        imgDiv.textContent = frame.image;

        const descDiv = document.createElement('div');
        descDiv.className = 'frame-description';
        descDiv.innerHTML = formatDescription(frame.description);
        descDiv.style.visibility = 'hidden';

        // Контейнер для времени начала и конца
        const timeContainer = document.createElement('div');
        timeContainer.className = 'frame-time-main-container';
        
        // Контейнер для времени (начало над концом)
        const timeVerticalContainer = document.createElement('div');
        timeVerticalContainer.className = 'frame-time-container';
        
        // Время начала
        const timeStartContainer = document.createElement('div');
        timeStartContainer.className = 'frame-time-container';
        
        const timeStartDiv = document.createElement('div');
        timeStartDiv.className = 'frame-time-start';
        timeStartDiv.textContent = formatTime(frame.start);
        timeStartDiv.addEventListener('click', () => editTime(index, 'start', timeStartDiv));

        const timeStartEdit = document.createElement('input');
        timeStartEdit.className = 'frame-time-edit';
        timeStartEdit.type = 'text';
        timeStartEdit.value = formatTime(frame.start);
        timeStartEdit.style.display = 'none';
        timeStartEdit.addEventListener('blur', () => saveTime(index, 'start', timeStartEdit, timeStartDiv));
        timeStartEdit.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                timeStartEdit.blur();
            }
        });

        timeStartContainer.appendChild(timeStartDiv);
        timeStartContainer.appendChild(timeStartEdit);

        // Время конца
        const timeEndContainer = document.createElement('div');
        timeEndContainer.className = 'frame-time-container';
        
        const timeEndDiv = document.createElement('div');
        timeEndDiv.className = 'frame-time-end';
        timeEndDiv.textContent = formatTime(frame.end);
        timeEndDiv.addEventListener('click', () => editTime(index, 'end', timeEndDiv));

        const timeEndEdit = document.createElement('input');
        timeEndEdit.className = 'frame-time-edit';
        timeEndEdit.type = 'text';
        timeEndEdit.value = formatTime(frame.end);
        timeEndEdit.style.display = 'none';
        timeEndEdit.addEventListener('blur', () => saveTime(index, 'end', timeEndEdit, timeEndDiv));
        timeEndEdit.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                timeEndEdit.blur();
            }
        });

        timeEndContainer.appendChild(timeEndDiv);
        timeEndContainer.appendChild(timeEndEdit);

        // Добавляем время начала и конца в вертикальный контейнер
        timeVerticalContainer.appendChild(timeStartContainer);
        timeVerticalContainer.appendChild(timeEndContainer);

        // Кнопки плана кадра и привязки страницы
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'frame-buttons-container';
        
        // Кнопка выбора плана кадра (shot size)
        const shotSizeButton = document.createElement('button');
        shotSizeButton.className = 'frame-button shot-size';
        shotSizeButton.textContent = 'Shot Size';
        shotSizeButton.title = 'Выбрать план кадра';
        shotSizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            selectShotSize(index);
        });

        // Кнопка привязки страницы (page connect)
        const pageConnectButton = document.createElement('button');
        pageConnectButton.className = 'frame-button page-connect';
        pageConnectButton.textContent = 'Page Connect';
        pageConnectButton.title = 'Привязать к странице';
        pageConnectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            connectToPage(index);
        });

        buttonsContainer.appendChild(shotSizeButton);
        buttonsContainer.appendChild(pageConnectButton);

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'frame-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Удалить кадр';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteFrame(index);
        });

        frameDiv.appendChild(imgDiv);
        frameDiv.appendChild(descDiv);
        frameDiv.appendChild(timeVerticalContainer);
        frameDiv.appendChild(buttonsContainer);
        frameDiv.appendChild(deleteBtn);

        container.appendChild(frameDiv);
        
        // Применяем обрезку текста синхронно и показываем блок
        try {
            applyTruncation(descDiv);
        } catch (e) { /* ignore */ }
        descDiv.style.visibility = '';
    });
}

// NOTE: this file contains a legacy renderer and helper stubs.
// To avoid overwriting primary implementations, it doesn't export global handlers
// (selectShotSize / connectToPage are implemented/assigned in frames-blocks.js).
// If you need to call the legacy renderer for debugging, call renderFramesLegacy().