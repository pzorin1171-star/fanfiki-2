const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const FANFICS_FILE = path.join(__dirname, 'ff.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Маршрут для пинга (чтобы Render не отключал сервер)
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Сервер работает',
        timestamp: new Date().toISOString()
    });
});

// Инициализация файла с фанфиками
async function initializeFanficsFile() {
    try {
        await fs.access(FANFICS_FILE);
        console.log('Файл ff.json найден');
    } catch (error) {
        // Файл не существует, создаем с начальными данными
        const initialData = [
            {
                id: 1,
                title: "Первая любовь в Хогвартсе",
                author: "Мария Волшебникова",
                genre: "фэнтези",
                ageCategory: "12+",
                tags: ["Хороший фанфик", "Романтика", "Приключения"],
                chapters: [
                    {
                        id: 1,
                        title: "Глава 1: Новый ученик",
                        content: "Хогвартс встретил меня дождливым сентябрьским утром. Я, как и все первокурсники, с трепетом смотрела на величественный замок, который стал бы моим домом на ближайшие семь лет.\n\nБольшой зал был наполнен шёпотом и ожиданием. Свечи парили под потолком, создавая волшебную атмосферу. Я чувствовала, как сердце бьется чаще, когда профессор Макгонагалл начала зачитывать список новых учеников.\n\n— Поттер, Гарри! — раздался голос, и зал взорвался аплодисментами."
                    },
                    {
                        id: 2,
                        title: "Глава 2: Тайная комната",
                        content: "Прошло уже два месяца с начала учебного года. Я начала привыкать к ритму жизни в Хогвартсе, но чувство волшебства не покидало меня ни на минуту.\n\nОднажды после уроков зельеварения, возвращаясь в гриффиндорскую гостиную, я случайно свернула не в тот коридор. Стены здесь были украшены старинными гобеленами, изображавшими сцены из истории Хогвартса.\n\nВнезапно я заметила небольшую дверь, почти невидимую среди каменной кладки. Любопытство взяло верх, и я осторожно нажала на железную ручку."
                    }
                ],
                status: "approved",
                createdAt: "2023-10-15T08:30:00.000Z",
                likes: 15,
                views: 120
            },
            {
                id: 2,
                title: "Тайны ночного города",
                author: "Алекс Тёмный",
                genre: "детектив",
                ageCategory: "16+",
                tags: ["Драма", "Детектив", "18+"],
                chapters: [
                    {
                        id: 1,
                        title: "Пролог: Дождь и тайна",
                        content: "Дождь стучал по асфальту, отражая неоновые огни ночного города. Я стоял под козырьком старого здания, курил и наблюдал за тем, как по улице проезжали редкие машины.\n\nЭтот район никогда не спал. Здесь всегда что-то происходило — сделки в тени, обмен информацией, встречи, о которых никто не должен был знать. Я был частью этого мира, детективом, который знал город лучше, чем свои пять пальцев.\n\nВнезапно мой телефон завибрировал. Сообщение было коротким: «Угол 5-й и Мейн. Срочно. Будет кровь.»"
                    }
                ],
                status: "approved",
                createdAt: "2023-10-20T14:45:00.000Z",
                likes: 8,
                views: 85
            }
        ];
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(initialData, null, 2));
        console.log('Файл ff.json создан с начальными данными');
    }
}

// Telegram Bot
let bot = null;
let moderatorChatId = null;

// Инициализация бота
function initializeTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN не установлен. Бот будет работать в демо-режиме.');
        console.log('Для включения реального бота установите переменную окружения TELEGRAM_BOT_TOKEN');
        
        // Демо-режим бота
        return {
            sendMessage: (chatId, text, options) => {
                console.log(`🤖 [ДЕМО-БОТ] Отправлено сообщение в чат ${chatId}: ${text}`);
                if (options?.reply_markup) {
                    console.log(`🤖 [ДЕМО-БОТ] Клавиатура: ${JSON.stringify(options.reply_markup)}`);
                }
                return Promise.resolve();
            },
            editMessageText: (text, options) => {
                console.log(`🤖 [ДЕМО-БОТ] Редактировано сообщение: ${text}`);
                return Promise.resolve();
            },
            answerCallbackQuery: () => Promise.resolve()
        };
    }
    
    try {
        const realBot = new TelegramBot(token, { polling: true });
        console.log('🤖 Telegram бот успешно запущен');
        
        // Команда /start
        realBot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            moderatorChatId = chatId;
            
            realBot.sendMessage(chatId, 
                `👋 Привет, модератор! Я бот для модерации фанфиков.\n\n` +
                `Используйте команды:\n` +
                `/moderate - показать фанфики на модерации\n` +
                `/help - помощь\n\n` +
                `Новые фанфики будут приходить автоматически.`
            );
        });
        
        // Команда /moderate
        realBot.onText(/\/moderate/, async (msg) => {
            const chatId = msg.chat.id;
            await sendPendingFanfics(chatId);
        });
        
        // Команда /help
        realBot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            realBot.sendMessage(chatId,
                `📚 Команды бота:\n\n` +
                `/start - начать работу\n` +
                `/moderate - просмотреть фанфики на модерации\n` +
                `/help - помощь\n\n` +
                `Для модерации используйте кнопки под каждым фанфиком.`
            );
        });
        
        // Обработка callback-запросов
        realBot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;
            
            // Разбираем callback данные
            if (data.startsWith('approve_')) {
                const fanficId = parseInt(data.split('_')[1]);
                await moderateFanfic(fanficId, 'approve', chatId, messageId);
            } 
            else if (data.startsWith('reject_')) {
                const fanficId = parseInt(data.split('_')[1]);
                await moderateFanfic(fanficId, 'reject', chatId, messageId);
            }
            else if (data.startsWith('view_')) {
                const [, fanficId, chapterIndex] = data.split('_');
                await sendFanficChapter(parseInt(fanficId), parseInt(chapterIndex), chatId);
            }
            else if (data.startsWith('tags_')) {
                const fanficId = parseInt(data.split('_')[1]);
                await sendFanficTags(fanficId, chatId);
            }
            
            realBot.answerCallbackQuery(callbackQuery.id);
        });
        
        return realBot;
    } catch (error) {
        console.error('Ошибка при запуске Telegram бота:', error.message);
        return null;
    }
}

// Отправить фанфики на модерацию
async function sendPendingFanfics(chatId) {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        const pendingFanfics = fanfics.filter(f => f.status === 'pending');
        
        if (pendingFanfics.length === 0) {
            bot.sendMessage(chatId, '✅ Нет фанфиков на модерации.');
            return;
        }
        
        for (const fanfic of pendingFanfics) {
            const message = `
📚 ФАНФИК НА МОДЕРАЦИЮ (#${fanfic.id})

📖 Название: ${fanfic.title}
✍️ Автор: ${fanfic.author}
🏷️ Жанр: ${fanfic.genre}
👤 Возрастная категория: ${fanfic.ageCategory}
🏷️ Метки: ${fanfic.tags?.join(', ') || 'Нет меток'}
📅 Дата: ${new Date(fanfic.createdAt).toLocaleDateString('ru-RU')}
📊 Количество глав: ${fanfic.chapters?.length || 0}
            `;
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Одобрить', callback_data: `approve_${fanfic.id}` },
                        { text: '❌ Отклонить', callback_data: `reject_${fanfic.id}` }
                    ],
                    [
                        { text: '📖 Глава 1', callback_data: `view_${fanfic.id}_0` },
                        { text: '🏷️ Метки', callback_data: `tags_${fanfic.id}` }
                    ]
                ]
            };
            
            if (fanfic.chapters && fanfic.chapters.length > 1) {
                keyboard.inline_keyboard[1].push({ text: '📖 Глава 2', callback_data: `view_${fanfic.id}_1` });
            }
            
            await bot.sendMessage(chatId, message, { reply_markup: keyboard });
        }
    } catch (error) {
        console.error('Ошибка при отправке фанфиков на модерацию:', error);
    }
}

// Модерация фанфика
async function moderateFanfic(fanficId, action, chatId, messageId) {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        const fanficIndex = fanfics.findIndex(f => f.id == fanficId);
        
        if (fanficIndex === -1) {
            await bot.sendMessage(chatId, '❌ Фанфик не найден.');
            return;
        }
        
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        fanfics[fanficIndex].status = newStatus;
        fanfics[fanficIndex].moderatedBy = `Telegram User ${chatId}`;
        fanfics[fanficIndex].moderatedAt = new Date().toISOString();
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        const fanfic = fanfics[fanficIndex];
        const actionText = action === 'approve' ? 'одобрен' : 'отклонен';
        const emoji = action === 'approve' ? '✅' : '❌';
        
        // Обновляем сообщение
        await bot.editMessageText(
            `${emoji} Фанфик "${fanfic.title}" ${actionText}`,
            { chat_id: chatId, message_id: messageId }
        );
        
        // Отправляем подтверждение
        await bot.sendMessage(chatId, 
            `${emoji} Фанфик "${fanfic.title}" успешно ${actionText}!\n\n` +
            `📖 Название: ${fanfic.title}\n` +
            `✍️ Автор: ${fanfic.author}\n` +
            `📅 Дата модерации: ${new Date().toLocaleDateString('ru-RU')}`
        );
        
    } catch (error) {
        console.error('Ошибка при модерации фанфика:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при модерации фанфика.');
    }
}

// Отправить главу фанфика
async function sendFanficChapter(fanficId, chapterIndex, chatId) {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        const fanfic = fanfics.find(f => f.id == fanficId);
        
        if (!fanfic || !fanfic.chapters || !fanfic.chapters[chapterIndex]) {
            await bot.sendMessage(chatId, '❌ Глава не найдена.');
            return;
        }
        
        const chapter = fanfic.chapters[chapterIndex];
        const chapterText = chapter.content.length > 4000 
            ? chapter.content.substring(0, 4000) + '\n\n... (текст сокращен)' 
            : chapter.content;
        
        const message = `
📖 ${fanfic.title}
📝 ${chapter.title}

${chapterText}

━━━━━━━━━━━━━━
Глава ${chapterIndex + 1} из ${fanfic.chapters.length}
        `;
        
        await bot.sendMessage(chatId, message);
    } catch (error) {
        console.error('Ошибка при отправке главы:', error);
    }
}

// Отправить метки фанфика
async function sendFanficTags(fanficId, chatId) {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        const fanfic = fanfics.find(f => f.id == fanficId);
        
        if (!fanfic) {
            await bot.sendMessage(chatId, '❌ Фанфик не найден.');
            return;
        }
        
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
        
        const tagsText = (fanfic.tags || []).map(tag => {
            const emoji = emojiMap[tag] || '🏷️';
            return `${emoji} ${tag}`;
        }).join('\n');
        
        const message = `
🏷️ МЕТКИ ФАНФИКА

📖 ${fanfic.title}
✍️ ${fanfic.author}

${tagsText}

📅 Дата создания: ${new Date(fanfic.createdAt).toLocaleDateString('ru-RU')}
        `;
        
        await bot.sendMessage(chatId, message);
    } catch (error) {
        console.error('Ошибка при отправке меток:', error);
    }
}

// Отправить новый фанфик в Telegram
async function sendNewFanficToTelegram(fanfic) {
    if (!bot) {
        console.log('⚠️ Бот не инициализирован');
        console.log('Фанфик сохранен, но не отправлен в Telegram');
        return;
    }
    
    try {
        const message = `
📚 НОВЫЙ ФАНФИК НА МОДЕРАЦИЮ (#${fanfic.id})

📖 Название: ${fanfic.title}
✍️ Автор: ${fanfic.author}
🏷️ Жанр: ${fanfic.genre}
👤 Возрастная категория: ${fanfic.ageCategory}
🏷️ Метки: ${fanfic.tags?.join(', ') || 'Нет меток'}
📅 Дата: ${new Date(fanfic.createdAt).toLocaleDateString('ru-RU')}
📊 Количество глав: ${fanfic.chapters?.length || 0}
        `;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Одобрить', callback_data: `approve_${fanfic.id}` },
                    { text: '❌ Отклонить', callback_data: `reject_${fanfic.id}` }
                ],
                [
                    { text: '📖 Глава 1', callback_data: `view_${fanfic.id}_0` },
                    { text: '🏷️ Метки', callback_data: `tags_${fanfic.id}` }
                ]
            ]
        };
        
        if (fanfic.chapters && fanfic.chapters.length > 1) {
            keyboard.inline_keyboard[1].push({ text: '📖 Глава 2', callback_data: `view_${fanfic.id}_1` });
        }
        
        // Если модератор не запустил бота, отправляем в консоль
        if (!moderatorChatId) {
            console.log('🤖 [ДЕМО] Новый фанфик ожидает модерации:');
            console.log(message);
            console.log('🤖 [ДЕМО] Для одобрения используйте PUT /api/fanfics/' + fanfic.id + '/status');
            return;
        }
        
        await bot.sendMessage(moderatorChatId, message, { reply_markup: keyboard });
        console.log(`✅ Фанфик "${fanfic.title}" отправлен в Telegram`);
    } catch (error) {
        console.error('Ошибка при отправке в Telegram:', error);
    }
}

// Получить все фанфики
app.get('/api/fanfics', async (req, res) => {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        const status = req.query.status;
        const filteredFanfics = status 
            ? fanfics.filter(f => f.status === status)
            : fanfics;
        
        // Увеличиваем счетчик просмотров для каждого фанфика
        if (req.query.incrementViews === 'true') {
            filteredFanfics.forEach(fanfic => {
                fanfic.views = (fanfic.views || 0) + 1;
            });
            
            // Сохраняем обновленные данные
            await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        }
        
        res.json(filteredFanfics);
    } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить фанфик по ID
app.get('/api/fanfics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        const fanfic = fanfics.find(f => f.id == id);
        
        if (!fanfic) {
            return res.status(404).json({ error: 'Фанфик не найден' });
        }
        
        // Увеличиваем счетчик просмотров
        fanfic.views = (fanfic.views || 0) + 1;
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        res.json(fanfic);
    } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить новый фанфик
app.post('/api/fanfics', async (req, res) => {
    try {
        const newFanfic = req.body;
        
        // Валидация данных
        if (!newFanfic.title || !newFanfic.author) {
            return res.status(400).json({ error: 'Необходимо указать название и автора' });
        }
        
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        // Генерируем уникальный ID
        const maxId = fanfics.reduce((max, f) => Math.max(max, f.id || 0), 0);
        newFanfic.id = maxId + 1;
        newFanfic.status = 'pending';
        newFanfic.createdAt = new Date().toISOString();
        newFanfic.likes = 0;
        newFanfic.views = 0;
        
        // Проверяем наличие обязательных полей
        newFanfic.tags = newFanfic.tags || [];
        newFanfic.chapters = newFanfic.chapters || [{ id: 1, title: 'Глава 1', content: '' }];
        
        fanfics.push(newFanfic);
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        // Отправляем в Telegram
        await sendNewFanficToTelegram(newFanfic);
        
        res.status(201).json({ 
            success: true,
            message: 'Фанфик добавлен и отправлен на модерацию', 
            id: newFanfic.id 
        });
    } catch (error) {
        console.error('Ошибка при записи файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить статус фанфика
app.put('/api/fanfics/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Неверный статус' });
        }
        
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        const fanficIndex = fanfics.findIndex(f => f.id == id);
        
        if (fanficIndex === -1) {
            return res.status(404).json({ error: 'Фанфик не найден' });
        }
        
        fanfics[fanficIndex].status = status;
        fanfics[fanficIndex].moderatedAt = new Date().toISOString();
        fanfics[fanficIndex].moderatedBy = req.body.moderatedBy || 'Администратор';
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        res.json({ 
            success: true,
            message: 'Статус обновлен',
            fanfic: fanfics[fanficIndex]
        });
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить лайк
app.post('/api/fanfics/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        const fanficIndex = fanfics.findIndex(f => f.id == id);
        
        if (fanficIndex === -1) {
            return res.status(404).json({ error: 'Фанфик не найден' });
        }
        
        fanfics[fanficIndex].likes = (fanfics[fanficIndex].likes || 0) + 1;
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        res.json({ 
            success: true,
            likes: fanfics[fanficIndex].likes,
            message: 'Лайк добавлен'
        });
    } catch (error) {
        console.error('Ошибка при добавлении лайка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить статистику
app.get('/api/stats', async (req, res) => {
    try {
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        const stats = {
            total: fanfics.length,
            approved: fanfics.filter(f => f.status === 'approved').length,
            pending: fanfics.filter(f => f.status === 'pending').length,
            rejected: fanfics.filter(f => f.status === 'rejected').length,
            totalLikes: fanfics.reduce((sum, f) => sum + (f.likes || 0), 0),
            totalViews: fanfics.reduce((sum, f) => sum + (f.views || 0), 0),
            uniqueAuthors: [...new Set(fanfics.map(f => f.author))].length
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
    await initializeFanficsFile();
    bot = initializeTelegramBot();
    
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Откройте http://localhost:${PORT} в браузере`);
    console.log(`📖 Данные фанфиков загружены из ${FANFICS_FILE}`);
    console.log(`🔄 Ping endpoint доступен по адресу http://localhost:${PORT}/ping`);
    console.log(`📊 API статистики: http://localhost:${PORT}/api/stats`);
    console.log(`📚 API фанфиков: http://localhost:${PORT}/api/fanfics`);
    
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.log('⚠️ Telegram бот работает в демо-режиме');
        console.log('📱 Для реальной модерации установите переменную TELEGRAM_BOT_TOKEN');
    }
});
