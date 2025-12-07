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

// Инициализация файла с фанфиками
async function initializeFanficsFile() {
    try {
        await fs.access(FANFICS_FILE);
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
                createdAt: "2023-10-15T08:30:00.000Z"
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
                createdAt: "2023-10-20T14:45:00.000Z"
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
        return null;
    }
    
    try {
        const bot = new TelegramBot(token, { polling: true });
        console.log('🤖 Telegram бот успешно запущен');
        
        // Команда /start
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            moderatorChatId = chatId;
            
            bot.sendMessage(chatId, 
                `👋 Привет, модератор! Я бот для модерации фанфиков.\n\n` +
                `Используйте команды:\n` +
                `/moderate - показать фанфики на модерации\n` +
                `/help - помощь\n\n` +
                `Новые фанфики будут приходить автоматически.`
            );
        });
        
        // Команда /moderate
        bot.onText(/\/moderate/, async (msg) => {
            const chatId = msg.chat.id;
            await sendPendingFanfics(chatId);
        });
        
        // Обработка callback-запросов
        bot.on('callback_query', async (callbackQuery) => {
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
            
            bot.answerCallbackQuery(callbackQuery.id);
        });
        
        return bot;
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
🏷️ Метки: ${fanfic.tags.join(', ')}
📅 Дата: ${new Date(fanfic.createdAt).toLocaleDateString('ru-RU')}
📊 Количество глав: ${fanfic.chapters.length}
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
            
            if (fanfic.chapters.length > 1) {
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
        
        if (!fanfic || !fanfic.chapters[chapterIndex]) {
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
            'Романтика': '❤️',
            'Детектив': '🕵️',
            'Фэнтези': '🐉'
        };
        
        const tagsText = fanfic.tags.map(tag => {
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
    if (!bot || !moderatorChatId) {
        console.log('⚠️ Бот не инициализирован или модератор не запустил бота командой /start');
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
🏷️ Метки: ${fanfic.tags.join(', ')}
📅 Дата: ${new Date(fanfic.createdAt).toLocaleDateString('ru-RU')}
📊 Количество глав: ${fanfic.chapters.length}
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
        
        if (fanfic.chapters.length > 1) {
            keyboard.inline_keyboard[1].push({ text: '📖 Глава 2', callback_data: `view_${fanfic.id}_1` });
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
        
        res.json(filteredFanfics);
    } catch (error) {
        console.error('Ошибка при чтении файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить новый фанфик
app.post('/api/fanfics', async (req, res) => {
    try {
        const newFanfic = req.body;
        
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        fanfics.push(newFanfic);
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        // Отправляем в Telegram
        await sendNewFanficToTelegram(newFanfic);
        
        res.status(201).json({ 
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
        
        const data = await fs.readFile(FANFICS_FILE, 'utf8');
        const fanfics = JSON.parse(data);
        
        const fanficIndex = fanfics.findIndex(f => f.id == id);
        
        if (fanficIndex === -1) {
            return res.status(404).json({ error: 'Фанфик не найден' });
        }
        
        fanfics[fanficIndex].status = status;
        fanfics[fanficIndex].moderatedAt = new Date().toISOString();
        
        await fs.writeFile(FANFICS_FILE, JSON.stringify(fanfics, null, 2));
        
        res.json({ message: 'Статус обновлен' });
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
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
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📖 Фанфики загружены из ${FANFICS_FILE}`);
});
