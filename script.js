document.addEventListener('DOMContentLoaded', function() {
    // Элементы страниц
    const mainPage = document.getElementById('mainPage');
    const createPage = document.getElementById('createPage');
    const viewPage = document.getElementById('viewPage');
    
    // Кнопки навигации
    const createBtn = document.getElementById('createBtn');
    const createFirstBtn = document.getElementById('createFirstBtn');
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
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    
    // Счетчики символов
    const titleCount = document.getElementById('titleCount');
    const authorCount = document.getElementById('authorCount');
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    const contentLimit = document.getElementById('contentLimit');
    const chaptersCount = document.getElementById('chaptersCount');
    
    // Элементы просмотра фанфика
    const viewTitle = document.getElementById('viewTitle');
    const viewAuthor = document.getElementById('viewAuthor');
    const viewGenre = document.getElementById('viewGenre');
    const viewAge = document.getElementById('viewAge');
    const viewTags = document.getElementById('viewTags');
    const viewDate = document.getElementById('viewDate');
    const viewContent = document.getElementById('viewContent');
    const chapterSelect = document.getElementById('chapterSelect');
    const chapterTotal = document.getElementById('chapterTotal');
    const prevChapterBtn = document.getElementById('prevChapterBtn');
    const nextChapterBtn = document.getElementById('nextChapterBtn');
    
    // Кнопки лайков и шаринга
    const likeBtn = document.getElementById('likeBtn');
    const likeCount = document.getElementById('likeCount');
    const shareBtn = document.getElementById('shareBtn');
    
    // Модальные окна
    const botModal = document.getElementById('botModal');
    const successModal = document.getElementById('successModal');
    const modalMessage = document.getElementById('modalMessage');
    const progressFill = document.getElementById('progressFill');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const viewDraftBtn = document.getElementById('viewDraftBtn');
    const createAnotherBtn = document.getElementById('createAnotherBtn');
    
    // Данные
    let currentFanfic = null;
    let fanfics = [];
    let chapters = [{
        id: 1,
        title: 'Глава 1',
        content: ''
    }];
    let currentChapterIndex = 0;
    let currentViewChapterIndex = 0;
    
    // Инициализация
    init();
    
    // Функция инициализации
    async function init() {
        await loadFanfics();
        await loadStats();
        setupEventListeners();
        updateChapterUI();
        setupCharacterCounters();
        
        // Автопинг для Render
        startAutoPing();
    }
    
    // Настройка счетчиков символов
    function setupCharacterCounters() {
        titleInput.addEventListener('input', function() {
            const length = this.value.length;
            titleCount.textContent = `${length}/100`;
            titleCount.style.color = length > 100 ? '#ef4444' : '#64748b';
        });
        
        authorInput.addEventListener('input', function() {
            const length = this.value.length;
            authorCount.textContent = `${length}/50`;
            authorCount.style.color = length > 50 ? '#ef4444' : '#64748b';
        });
        
        contentTextarea.addEventListener('input', function() {
            const content = this.value;
            const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
            const chars = content.length;
            
            wordCount.textContent = `${words} слов`;
            charCount.textContent = `${chars} символов`;
            contentLimit.textContent = `${chars}/10000`;
            contentLimit.style.color = chars > 10000 ? '#ef4444' : '#64748b';
            
            // Обновляем превью главы
            if (chapters[currentChapterIndex]) {
                chapters[currentChapterIndex].content = content;
                updateChapterPreview();
            }
        });
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Навигация
        createBtn.addEventListener('click', () => showPage('create'));
        createFirstBtn.addEventListener('click', () => showPage('create'));
        backBtn.addEventListener('click', () => showPage('main'));
        backFromViewBtn.addEventListener('click', () => showPage('main'));
        
        // Управление главами
        addChapterBtn.addEventListener('click', addNewChapter);
        saveDraftBtn.addEventListener('click', saveDraft);
        submitBtn.addEventListener('click', submitFanfic);
        
        // Просмотр фанфика
        prevChapterBtn.addEventListener('click', showPrevChapter);
        nextChapterBtn.addEventListener('click', showNextChapter);
        chapterSelect.addEventListener('change', (e) => {
            showChapter(parseInt(e.target.value));
        });
        
        // Лайки и шаринг
        likeBtn.addEventListener('click', addLike);
        shareBtn.addEventListener('click', shareFanfic);
        
        // Модальные окна
        closeModalBtn.addEventListener('click', () => {
            botModal.classList.add('hidden');
        });
        
        viewDraftBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
            showPage('main');
        });
        
        createAnotherBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
            resetForm();
            showPage('create');
        });
        
        // Ночной режим
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', toggleDarkMode);
        }
        
        // Шаринг в соцсетях
        document.querySelectorAll('.btn-share').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.target.closest('.btn-share').dataset.platform;
                shareToSocial(platform);
            });
        });
    }
    
    // Показать страницу
    function showPage(pageName) {
        mainPage.classList.remove('active');
        createPage.classList.remove('active');
        viewPage.classList.remove('active');
        
        switch(pageName) {
            case 'main':
                mainPage.classList.add('active');
                loadFanfics();
                break;
            case 'create':
                createPage.classList.add('active');
                break;
            case 'view':
                viewPage.classList.add('active');
                break;
        }
    }
    
    // Загрузить статистику
    async function loadStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalFanfics').textContent = stats.approved;
                document.getElementById('totalAuthors').textContent = stats.uniqueAuthors;
            }
        } catch (error) {
            console.error('Ошибка при загрузке статистики:', error);
        }
    }
    
    // Загрузить фанфики
    async function loadFanfics() {
        try {
            const response = await fetch('/api/fanfics?status=approved');
            if (response.ok) {
                fanfics = await response.json();
                displayFanfics(fanfics);
                
                // Показываем/скрываем пустое состояние
                const emptyState = document.getElementById('emptyState');
                if (fanfics.length === 0) {
                    emptyState.classList.remove('hidden');
                } else {
                    emptyState.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке фанфиков:', error);
        }
    }
    
    // Отобразить фанфики
    function displayFanfics(fanficsToDisplay) {
        const container = document.getElementById('fanficsContainer');
        container.innerHTML = '';
        
        fanficsToDisplay.forEach(fanfic => {
            const card = document.createElement('div');
            card.className = 'fanfic-card';
            card.dataset.id = fanfic.id;
            
            // Получаем первую главу для отрывка
            const firstChapterContent = fanfic.chapters[0]?.content || '';
            const excerpt = firstChapterContent.length > 150 
                ? firstChapterContent.substring(0, 150) + '...' 
                : firstChapterContent || 'Нет содержания';
            
            // Форматируем дату
            const date = new Date(fanfic.createdAt).toLocaleDateString('ru-RU');
            
            // Эмодзи для жанра
            const genreEmoji = {
                'романтика': '💕',
                'фэнтези': '🧙',
                'драма': '🎭',
                'приключения': '🗺️',
                'юмор': '😂',
                'детектив': '🔍',
                'ужасы': '👻',
                'фанфик': '📚',
                'фантастика': '🚀'
            }[fanfic.genre] || '📖';
            
            card.innerHTML = `
                <div class="fanfic-header">
                    <div>
                        <h3 class="fanfic-title">${fanfic.title}</h3>
                        <div class="fanfic-author">
                            <i class="fas fa-user-circle"></i> ${fanfic.author}
                        </div>
                    </div>
                    <span class="fanfic-date">${date}</span>
                </div>
                <div class="fanfic-excerpt">${excerpt}</div>
                <div class="fanfic-footer">
                    <div class="fanfic-stats">
                        <span class="stat"><i class="fas fa-heart"></i> ${fanfic.likes || 0}</span>
                        <span class="stat"><i class="fas fa-eye"></i> ${fanfic.views || 0}</span>
                        <span class="stat"><i class="fas fa-book-open"></i> ${fanfic.chapters?.length || 1}</span>
                    </div>
                    <div class="fanfic-meta">
                        <span class="meta-badge">${genreEmoji} ${fanfic.genre}</span>
                        <span class="meta-badge age-badge">${fanfic.ageCategory}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                openFanfic(fanfic);
            });
            
            container.appendChild(card);
        });
    }
    
    // Открыть фанфик для чтения
    async function openFanfic(fanfic) {
        try {
            const response = await fetch(`/api/fanfics/${fanfic.id}`);
            if (response.ok) {
                currentFanfic = await response.json();
                updateFanficView();
                showPage('view');
            }
        } catch (error) {
            console.error('Ошибка при загрузке фанфика:', error);
            alert('Не удалось загрузить фанфик');
        }
    }
    
    // Обновить вид просмотра фанфика
    function updateFanficView() {
        if (!currentFanfic) return;
        
        viewTitle.textContent = currentFanfic.title;
        viewAuthor.textContent = currentFanfic.author;
        viewGenre.textContent = currentFanfic.genre;
        viewAge.textContent = currentFanfic.ageCategory;
        viewDate.textContent = new Date(currentFanfic.createdAt).toLocaleDateString('ru-RU');
        likeCount.textContent = currentFanfic.likes || 0;
        
        // Метки
        const emojiMap = {
            'Хороший фанфик': '👍',
            '18+': '🔞',
            'Драма': '🎭',
            'Юмор': '😂',
            'Приключения': '🗺️',
            'Романтика': '💕',
            'Детектив': '🔍',
            'Фэнтези': '🧙',
            'Ужасы': '👻',
            'Фантастика': '🚀',
            'АУ': '✨',
            'Омегаверс': '🐺',
            'Флафф': '💖'
        };
        
        viewTags.innerHTML = '';
        (currentFanfic.tags || []).forEach(tag => {
            const emoji = emojiMap[tag] || '🏷️';
            const badge = document.createElement('span');
            badge.className = 'meta-badge';
            badge.textContent = `${emoji} ${tag}`;
            viewTags.appendChild(badge);
        });
        
        // Главы
        chapterSelect.innerHTML = '';
        (currentFanfic.chapters || []).forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = chapter.title;
            chapterSelect.appendChild(option);
        });
        
        chapterTotal.textContent = `из ${currentFanfic.chapters?.length || 1}`;
        
        // Показать первую главу
        showChapter(0);
    }
    
    // Показать главу
    function showChapter(index) {
        if (!currentFanfic || !currentFanfic.chapters || !currentFanfic.chapters[index]) return;
        
        currentViewChapterIndex = index;
        chapterSelect.value = index;
        
        const chapter = currentFanfic.chapters[index];
        
        // Обновляем навигацию
        prevChapterBtn.disabled = index === 0;
        nextChapterBtn.disabled = index === currentFanfic.chapters.length - 1;
        
        // Показываем содержание с форматированием
        let content = chapter.content;
        
        // Простое форматирование (замена переносов строк на параграфы)
        content = content.split('\n\n').map(paragraph => {
            if (paragraph.trim()) {
                return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
            }
            return '';
        }).join('');
        
        viewContent.innerHTML = `
            <div class="chapter-header">
                <h3>${chapter.title}</h3>
            </div>
            <div class="chapter-content">${content}</div>
        `;
    }
    
    // Навигация по главам
    function showPrevChapter() {
        if (currentViewChapterIndex > 0) {
            showChapter(currentViewChapterIndex - 1);
        }
    }
    
    function showNextChapter() {
        if (currentFanfic && currentFanfic.chapters && 
            currentViewChapterIndex < currentFanfic.chapters.length - 1) {
            showChapter(currentViewChapterIndex + 1);
        }
    }
    
    // Добавить новую главу
    function addNewChapter() {
        const newChapterId = chapters.length + 1;
        
        // Сохраняем текущий контент
        if (chapters[currentChapterIndex]) {
            chapters[currentChapterIndex].content = contentTextarea.value;
        }
        
        chapters.push({
            id: newChapterId,
            title: `Глава ${newChapterId}`,
            content: ''
        });
        
        currentChapterIndex = chapters.length - 1;
        updateChapterUI();
        
        // Фокус на текстовое поле
        contentTextarea.focus();
    }
    
    // Обновить UI глав
    function updateChapterUI() {
        if (!chapters[currentChapterIndex]) return;
        
        chapterTitle.textContent = chapters[currentChapterIndex].title;
        contentTextarea.value = chapters[currentChapterIndex].content;
        chaptersCount.textContent = chapters.length;
        
        // Обновляем счетчики
        const words = chapters[currentChapterIndex].content.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = chapters[currentChapterIndex].content.length;
        wordCount.textContent = `${words} слов`;
        charCount.textContent = `${chars} символов`;
        contentLimit.textContent = `${chars}/10000`;
        
        // Обновляем список глав
        chaptersList.innerHTML = '';
        chapters.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.className = 'chapter-item';
            if (index === currentChapterIndex) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <span class="chapter-number">${chapter.title}</span>
                <span class="chapter-preview">${chapter.content.substring(0, 20) || 'Начните писать...'}</span>
            `;
            
            li.dataset.index = index;
            li.addEventListener('click', () => {
                // Сохраняем текущий контент
                chapters[currentChapterIndex].content = contentTextarea.value;
                
                currentChapterIndex = index;
                updateChapterUI();
            });
            
            chaptersList.appendChild(li);
        });
    }
    
    // Обновить превью главы
    function updateChapterPreview() {
        const chapterItem = chaptersList.querySelector(`.chapter-item[data-index="${currentChapterIndex}"]`);
        if (chapterItem) {
            const preview = chapterItem.querySelector('.chapter-preview');
            if (preview) {
                preview.textContent = chapters[currentChapterIndex].content.substring(0, 20) || 'Начните писать...';
            }
        }
    }
    
    // Сохранить черновик
    function saveDraft() {
        // Сохраняем текущий контент
        if (chapters[currentChapterIndex]) {
            chapters[currentChapterIndex].content = contentTextarea.value;
        }
        
        const draft = {
            title: titleInput.value,
            author: authorInput.value,
            genre: genreSelect.value,
            ageCategory: ageCategorySelect.value,
            tags: getSelectedTags(),
            chapters: chapters,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('fanficDraft', JSON.stringify(draft));
        
        // Показываем уведомление
        showStatus('Черновик сохранен', 'success');
        
        console.log('Черновик сохранен:', draft);
    }
    
    // Получить выбранные метки
    function getSelectedTags() {
        const selectedTags = [];
        document.querySelectorAll('.tag-checkbox input:checked').forEach(checkbox => {
            selectedTags.push(checkbox.value);
        });
        return selectedTags;
    }
    
    // Отправить фанфик
    async function submitFanfic() {
        // Проверяем заполненность полей
        if (!titleInput.value.trim()) {
            showStatus('Пожалуйста, введите название произведения', 'error');
            titleInput.focus();
            return;
        }
        
        if (!authorInput.value.trim()) {
            showStatus('Пожалуйста, введите имя автора', 'error');
            authorInput.focus();
            return;
        }
        
        // Сохраняем текущий контент
        if (chapters[currentChapterIndex]) {
            chapters[currentChapterIndex].content = contentTextarea.value;
        }
        
        // Проверяем, что есть хотя бы одна глава с контентом
        const hasContent = chapters.some(chapter => chapter.content.trim().length > 0);
        if (!hasContent) {
            showStatus('Добавьте содержание хотя бы в одной главе', 'error');
            contentTextarea.focus();
            return;
        }
        
        // Формируем данные фанфика
        const fanficData = {
            title: titleInput.value.trim(),
            author: authorInput.value.trim(),
            genre: genreSelect.value,
            ageCategory: ageCategorySelect.value,
            tags: getSelectedTags(),
            chapters: chapters.filter(chapter => chapter.content.trim().length > 0)
        };
        
        // Показываем модальное окно отправки
        modalMessage.textContent = 'Ваш фанфик отправляется на модерацию...';
        progressFill.style.width = '0%';
        botModal.classList.remove('hidden');
        
        // Анимация прогресса
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            progressFill.style.width = `${progress}%`;
            
            if (progress >= 90) {
                clearInterval(progressInterval);
            }
        }, 50);
        
        try {
            // Отправляем на сервер
            const response = await fetch('/api/fanfics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fanficData)
            });
            
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            
            const result = await response.json();
            
            if (response.ok) {
                // Успешная отправка
                setTimeout(() => {
                    botModal.classList.add('hidden');
                    successModal.classList.remove('hidden');
                    
                    // Очищаем черновик
                    localStorage.removeItem('fanficDraft');
                }, 500);
            } else {
                throw new Error(result.error || 'Ошибка при сохранении фанфика');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            modalMessage.textContent = 'Ошибка при отправке фанфика. Попробуйте еще раз.';
            progressFill.style.backgroundColor = '#ef4444';
        }
    }
    
    // Добавить лайк
    async function addLike() {
        if (!currentFanfic) return;
        
        try {
            const response = await fetch(`/api/fanfics/${currentFanfic.id}/like`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                likeCount.textContent = result.likes;
                currentFanfic.likes = result.likes;
                
                // Визуальная обратная связь
                likeBtn.innerHTML = '<i class="fas fa-heart"></i> ' + result.likes;
                likeBtn.style.backgroundColor = '#fecaca';
                
                setTimeout(() => {
                    likeBtn.style.backgroundColor = '';
                }, 300);
            }
        } catch (error) {
            console.error('Ошибка при добавлении лайка:', error);
        }
    }
    
    // Поделиться фанфиком
    function shareFanfic() {
        if (!currentFanfic) return;
        
        const url = window.location.href.split('#')[0];
        const title = `Фанфик: ${currentFanfic.title}`;
        const text = `Читайте "${currentFanfic.title}" от ${currentFanfic.author} на FanFic Portal`;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            });
        } else {
            // Копируем ссылку в буфер обмена
            navigator.clipboard.writeText(url)
                .then(() => alert('Ссылка скопирована в буфер обмена!'))
                .catch(err => console.error('Ошибка копирования:', err));
        }
    }
    
    // Поделиться в соцсетях
    function shareToSocial(platform) {
        if (!currentFanfic) return;
        
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(currentFanfic.title);
        const author = encodeURIComponent(currentFanfic.author);
        
        let shareUrl = '';
        
        switch(platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=Читаю "${title}" от ${author}&url=${url}`;
                break;
            case 'vk':
                shareUrl = `https://vk.com/share.php?url=${url}&title=${title}&description=Фанфик от ${author}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${url}&text=Читаю "${title}" от ${author}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }
    
    // Переключить ночной режим
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#darkModeBtn i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('darkMode', 'true');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('darkMode', 'false');
        }
    }
    
    // Сбросить форму
    function resetForm() {
        titleInput.value = '';
        authorInput.value = '';
        genreSelect.value = 'романтика';
        ageCategorySelect.value = '0+';
        
        // Сбрасываем метки
        document.querySelectorAll('.tag-checkbox input').forEach(checkbox => {
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
        showStatus('', '');
    }
    
    // Показать статус
    function showStatus(message, type) {
        submitStatus.textContent = message;
        submitStatus.className = `status-message ${type}`;
        submitStatus.classList.remove('hidden');
        
        if (message) {
            setTimeout(() => {
                submitStatus.classList.add('hidden');
            }, 5000);
        }
    }
    
    // Автопинг для Render
    function startAutoPing() {
        // Пинг каждые 5 минут
        setInterval(() => {
            fetch('/ping')
                .then(() => console.log('🔄 Ping отправлен'))
                .catch(() => console.warn('⚠️ Ping не удался'));
        }, 5 * 60 * 1000);
        
        // Первый пинг сразу
        fetch('/ping').catch(() => {});
    }
});
