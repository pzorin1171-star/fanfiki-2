document.addEventListener('DOMContentLoaded', function() {
    // Элементы страниц
    const mainPage = document.getElementById('mainPage');
    const createPage = document.getElementById('createPage');
    const viewPage = document.getElementById('viewPage');
    
    // Кнопки навигации
    const createBtn = document.getElementById('createBtn');
    const backBtn = document.getElementById('backBtn');
    const backFromViewBtn = document.getElementById('backFromViewBtn');
    
    // Элементы создания фанфика
    const titleInput = document.getElementById('title');
    const authorInput = document.getElementById('author');
    const genreSelect = document.getElementById('genre');
    const ageCategorySelect = document.getElementById('ageCategory');
    const contentTextarea = document.getElementById('content');
    const chapterTitle = document.getElementById('chapterTitle');
    const chaptersList = document.getElementById('chaptersList');
    const addChapterBtn = document.getElementById('addChapterBtn');
    const submitBtn = document.getElementById('submitBtn');
    const submitStatus = document.getElementById('submitStatus');
    
    // Элементы просмотра фанфика
    const viewTitle = document.getElementById('viewTitle');
    const viewAuthor = document.getElementById('viewAuthor');
    const viewGenre = document.getElementById('viewGenre');
    const viewAge = document.getElementById('viewAge');
    const viewTags = document.getElementById('viewTags');
    const viewContent = document.getElementById('viewContent');
    const chapterSelect = document.getElementById('chapterSelect');
    const prevChapterBtn = document.getElementById('prevChapterBtn');
    const nextChapterBtn = document.getElementById('nextChapterBtn');
    
    // Модальное окно
    const botModal = document.getElementById('botModal');
    const modalMessage = document.getElementById('modalMessage');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    // Данные текущего фанфика
    let currentFanfic = null;
    let fanfics = [];
    let chapters = [{
        id: 1,
        title: 'Глава 1',
        content: ''
    }];
    let currentChapterIndex = 0;
    
    // Загружаем фанфики при загрузке страницы
    loadFanfics();
    
    // Навигация
    createBtn.addEventListener('click', () => {
        mainPage.classList.add('hidden');
        createPage.classList.remove('hidden');
        resetForm();
    });
    
    backBtn.addEventListener('click', () => {
        createPage.classList.add('hidden');
        mainPage.classList.remove('hidden');
        loadFanfics();
    });
    
    backFromViewBtn.addEventListener('click', () => {
        viewPage.classList.add('hidden');
        mainPage.classList.remove('hidden');
        loadFanfics();
    });
    
    closeModalBtn.addEventListener('click', () => {
        botModal.classList.add('hidden');
    });
    
    // Управление главами
    addChapterBtn.addEventListener('click', () => {
        const newChapterId = chapters.length + 1;
        chapters.push({
            id: newChapterId,
            title: `Глава ${newChapterId}`,
            content: ''
        });
        
        // Сохраняем текущий контент
        chapters[currentChapterIndex].content = contentTextarea.value;
        
        // Переключаемся на новую главу
        currentChapterIndex = chapters.length - 1;
        updateChapterUI();
    });
    
    // Обновление списка глав
    function updateChapterUI() {
        // Обновляем заголовок
        chapterTitle.textContent = chapters[currentChapterIndex].title;
        
        // Обновляем содержимое
        contentTextarea.value = chapters[currentChapterIndex].content;
        
        // Обновляем список глав
        chaptersList.innerHTML = '';
        chapters.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.textContent = chapter.title;
            li.dataset.index = index;
            
            if (index === currentChapterIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => {
                // Сохраняем текущий контент
                chapters[currentChapterIndex].content = contentTextarea.value;
                
                // Переключаемся на выбранную главу
                currentChapterIndex = index;
                updateChapterUI();
            });
            
            chaptersList.appendChild(li);
        });
    }
    
    // Отправка фанфика
    submitBtn.addEventListener('click', async () => {
        // Проверяем заполненность полей
        if (!titleInput.value.trim()) {
            showStatus('Пожалуйста, введите название произведения', 'error');
            return;
        }
        
        if (!authorInput.value.trim()) {
            showStatus('Пожалуйста, введите имя автора', 'error');
            return;
        }
        
        // Сохраняем текущий контент
        chapters[currentChapterIndex].content = contentTextarea.value;
        
        // Проверяем, что есть хотя бы одна глава с контентом
        const hasContent = chapters.some(chapter => chapter.content.trim().length > 0);
        if (!hasContent) {
            showStatus('Добавьте содержание хотя бы в одной главе', 'error');
            return;
        }
        
        // Собираем выбранные метки
        const selectedTags = [];
        document.querySelectorAll('input[name="tags"]:checked').forEach(checkbox => {
            selectedTags.push(checkbox.value);
        });
        
        // Формируем данные фанфика
        const fanficData = {
            id: Date.now(),
            title: titleInput.value.trim(),
            author: authorInput.value.trim(),
            genre: genreSelect.value,
            ageCategory: ageCategorySelect.value,
            tags: selectedTags,
            chapters: chapters,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Показываем модальное окно
        modalMessage.textContent = 'Ваш фанфик отправляется на проверку модератору...';
        botModal.classList.remove('hidden');
        
        try {
            // Отправляем на сервер
            const response = await fetch('/api/fanfics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fanficData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showStatus('Фанфик успешно отправлен на модерацию!', 'success');
                resetForm();
                
                // Закрываем модальное окно через 3 секунды
                setTimeout(() => {
                    botModal.classList.add('hidden');
                    createPage.classList.add('hidden');
                    mainPage.classList.remove('hidden');
                    loadFanfics();
                }, 3000);
            } else {
                throw new Error(result.error || 'Ошибка при сохранении фанфика');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            modalMessage.textContent = 'Ошибка при отправке фанфика. Попробуйте еще раз.';
            showStatus('Ошибка при отправке фанфика', 'error');
        }
    });
    
    // Загрузка фанфиков
    async function loadFanfics() {
        try {
            const response = await fetch('/api/fanfics?status=approved');
            if (response.ok) {
                fanfics = await response.json();
                displayFanfics(fanfics);
            }
        } catch (error) {
            console.error('Ошибка при загрузке фанфиков:', error);
        }
    }
    
    // Отображение фанфиков
    function displayFanfics(fanficsToDisplay) {
        const container = document.getElementById('fanficsContainer');
        container.innerHTML = '';
        
        if (fanficsToDisplay.length === 0) {
            container.innerHTML = '<p class="no-fanfics">Пока нет опубликованных фанфиков. Будьте первым!</p>';
            return;
        }
        
        fanficsToDisplay.forEach(fanfic => {
            const card = document.createElement('div');
            card.className = 'fanfic-card';
            card.dataset.id = fanfic.id;
            
            // Получаем первую главу для отображения отрывка
            const firstChapterContent = fanfic.chapters[0]?.content || '';
            const excerpt = firstChapterContent.length > 150 
                ? firstChapterContent.substring(0, 150) + '...' 
                : firstChapterContent;
            
            card.innerHTML = `
                <h3>${fanfic.title}</h3>
                <div class="author">Автор: ${fanfic.author}</div>
                <div class="meta">
                    <span class="meta-tag">${fanfic.genre}</span>
                    <span class="meta-tag">${fanfic.ageCategory}</span>
                    ${fanfic.tags.map(tag => `<span class="meta-tag">${tag}</span>`).join('')}
                </div>
                <div class="excerpt">${excerpt}</div>
            `;
            
            card.addEventListener('click', () => {
                openFanfic(fanfic);
            });
            
            container.appendChild(card);
        });
    }
    
    // Открытие фанфика для чтения
    function openFanfic(fanfic) {
        currentFanfic = fanfic;
        
        // Устанавливаем данные
        viewTitle.textContent = fanfic.title;
        viewAuthor.textContent = fanfic.author;
        viewGenre.textContent = fanfic.genre;
        viewAge.textContent = fanfic.ageCategory;
        
        // Отображаем метки
        viewTags.innerHTML = fanfic.tags.map(tag => {
            const emojiMap = {
                'Хороший фанфик': '👍',
                '18+': '🔞',
                'Драма': '🎭',
                'Юмор': '😂',
                'Приключения': '🗺️'
            };
            const emoji = emojiMap[tag] || '🏷️';
            return `<span class="meta-tag">${emoji} ${tag}</span>`;
        }).join(' ');
        
        // Обновляем список глав
        chapterSelect.innerHTML = '';
        fanfic.chapters.forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = chapter.title;
            chapterSelect.appendChild(option);
        });
        
        // Показываем первую главу
        showChapter(0);
        
        // Переключаем страницы
        mainPage.classList.add('hidden');
        viewPage.classList.remove('hidden');
    }
    
    // Показать главу
    function showChapter(index) {
        if (!currentFanfic || !currentFanfic.chapters[index]) return;
        
        chapterSelect.value = index;
        viewContent.textContent = currentFanfic.chapters[index].content;
    }
    
    // Навигация по главам
    prevChapterBtn.addEventListener('click', () => {
        const currentIndex = parseInt(chapterSelect.value);
        if (currentIndex > 0) {
            showChapter(currentIndex - 1);
        }
    });
    
    nextChapterBtn.addEventListener('click', () => {
        const currentIndex = parseInt(chapterSelect.value);
        if (currentIndex < currentFanfic.chapters.length - 1) {
            showChapter(currentIndex + 1);
        }
    });
    
    chapterSelect.addEventListener('change', () => {
        showChapter(parseInt(chapterSelect.value));
    });
    
    // Вспомогательные функции
    function showStatus(message, type) {
        submitStatus.textContent = message;
        submitStatus.className = `status-message ${type}`;
        submitStatus.classList.remove('hidden');
        
        // Скрываем сообщение через 5 секунд
        setTimeout(() => {
            submitStatus.classList.add('hidden');
        }, 5000);
    }
    
    function resetForm() {
        titleInput.value = '';
        authorInput.value = '';
        genreSelect.value = 'романтика';
        ageCategorySelect.value = '0+';
        contentTextarea.value = '';
        
        // Сбрасываем метки
        document.querySelectorAll('input[name="tags"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Сбрасываем главы
        chapters = [{
            id: 1,
            title: 'Глава 1',
            content: ''
        }];
        currentChapterIndex = 0;
        updateChapterUI();
        
        // Скрываем статус
        submitStatus.classList.add('hidden');
    }
    
    // Инициализация
    updateChapterUI();
});
// ===== ПРОСТОЙ ПИНГ ДЛЯ RENDER =====
setInterval(async () => {
    try {
        await fetch('/ping');
        console.log('🔄 Ping отправлен');
    } catch (error) {
        console.warn('⚠️ Ping не удался');
    }
}, 5 * 60 * 1000);

// Первый ping сразу
fetch('/ping').catch(() => {});
