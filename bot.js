// Telegram-бот для модерации фанфиков
// Этот файл содержит логику бота, которая может быть развернута отдельно

const fs = require('fs').promises;
const path = require('path');

// Имитация работы Telegram-бота
class FanficModerationBot {
    constructor() {
        this.fanficsFile = path.join(__dirname, 'ff.json');
        this.pendingFanfics = [];
        this.loadFanfics();
    }
    
    async loadFanfics() {
        try {
            const data = await fs.readFile(this.fanficsFile, 'utf8');
            const allFanfics = JSON.parse(data);
            this.pendingFanfics = allFanfics.filter(f => f.status === 'pending');
            console.log(`Загружено ${this.pendingFanfics.length} фанфиков на модерацию`);
        } catch (error) {
            console.error('Ошибка при загрузке фанфиков:', error);
        }
    }
    
    async moderateFanfic(fanficId, action, moderator) {
        try {
            // Читаем все фанфики
            const data = await fs.readFile(this.fanficsFile, 'utf8');
            const fanfics = JSON.parse(data);
            
            // Находим фанфик
            const fanficIndex = fanfics.findIndex(f => f.id == fanficId);
            
            if (fanficIndex === -1) {
                return { success: false, message: 'Фанфик не найден' };
            }
            
            // Обновляем статус
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            fanfics[fanficIndex].status = newStatus;
            
            // Добавляем информацию о модераторе
            fanfics[fanficIndex].moderatedBy = moderator;
            fanfics[fanficIndex].moderatedAt = new Date().toISOString();
            
            // Сохраняем изменения
            await fs.writeFile(this.fanficsFile, JSON.stringify(fanfics, null, 2));
            
            // Обновляем кэш
            await this.loadFanfics();
            
            const fanfic = fanfics[fanficIndex];
            const actionText = action === 'approve' ? 'одобрен' : 'отклонен';
            
            console.log(`Фанфик "${fanfic.title}" ${actionText} модератором ${moderator}`);
            
            // Формируем сообщение для отправки "автору"
            const message = this.createModerationMessage(fanfic, action);
            
            return {
                success: true,
                message: `Фанфик "${fanfic.title}" ${actionText}`,
                notification: message
            };
        } catch (error) {
            console.error('Ошибка при модерации фанфика:', error);
            return { success: false, message: 'Ошибка сервера' };
        }
    }
    
    createModerationMessage(fanfic, action) {
        const statusEmoji = action === 'approve' ? '✅' : '❌';
        const statusText = action === 'approve' ? 'одобрен' : 'отклонен';
        
        return `
${statusEmoji} ВАШ ФАНФИК ПРОШЕЛ МОДЕРАЦИЮ

📖 Название: ${fanfic.title}
📊 Статус: ${statusText}
👮 Модератор: ${fanfic.moderatedBy || 'Система'}
📅 Дата: ${new Date(fanfic.moderatedAt).toLocaleDateString('ru-RU')}

${action === 'approve' 
    ? '🎉 Поздравляем! Ваш фанфик теперь доступен для чтения на сайте.' 
    : '⚠️ К сожалению, ваш фанфик не прошел модерацию. Вы можете исправить замечания и отправить его снова.'}
        `;
    }
    
    // Генерация клавиатуры для Telegram-бота
    generateModerationKeyboard(fanficId) {
        return {
            inline_keyboard: [
                [
                    { text: '👍 Одобрить', callback_data: `approve_${fanficId}` },
                    { text: '👎 Отклонить', callback_data: `reject_${fanficId}` }
                ],
                [
                    { text: '📖 Посмотреть главу 1', callback_data: `view_${fanficId}_1` },
                    { text: '🏷️ Метки', callback_data: `tags_${fanficId}` }
                ]
            ]
        };
    }
    
    // Эмуляция отправки уведомления в Telegram
    async sendNotification(chatId, message, keyboard = null) {
        console.log(`\n[TELEGRAM БОТ -> Чат ${chatId}]:`);
        console.log(message);
        if (keyboard) {
            console.log('Клавиатура:', JSON.stringify(keyboard, null, 2));
        }
        console.log('-'.repeat(50));
        
        // В реальном боте здесь был бы код отправки через Telegram API
        // const bot = new TelegramBot(TELEGRAM_TOKEN);
        // await bot.sendMessage(chatId, message, { reply_markup: keyboard });
        
        return { success: true };
    }
}

// Пример использования бота
async function runDemo() {
    console.log('='.repeat(60));
    console.log('ДЕМОНСТРАЦИЯ РАБОТЫ TELEGRAM БОТА ДЛЯ МОДЕРАЦИИ ФАНФИКОВ');
    console.log('='.repeat(60));
    
    const bot = new FanficModerationBot();
    
    // Ждем загрузки данных
    setTimeout(async () => {
        if (bot.pendingFanfics.length > 0) {
            const fanfic = bot.pendingFanfics[0];
            
            console.log('\n1. Бот получает новый фанфик на модерацию:');
            console.log(`   📖 "${fanfic.title}" от ${fanfic.author}`);
            console.log(`   🆔 ID: ${fanfic.id}`);
            
            // Отправляем уведомление модератору
            const message = `
📚 НОВЫЙ ФАНФИК НА МОДЕРАЦИЮ

📖 Название: ${fanfic.title}
✍️ Автор: ${fanfic.author}
🏷️ Жанр: ${fanfic.genre}
👤 Возрастная категория: ${fanfic.ageCategory}
📊 Количество глав: ${fanfic.chapters.length}

Выберите действие:
            `;
            
            const keyboard = bot.generateModerationKeyboard(fanfic.id);
            await bot.sendNotification('MODERATOR_CHAT_ID', message, keyboard);
            
            console.log('\n2. Модератор нажимает "Одобрить"');
            
            // Имитируем одобрение
            const result = await bot.moderateFanfic(fanfic.id, 'approve', 'Admin');
            console.log(`   Результат: ${result.message}`);
            
            console.log('\n3. Бот отправляет уведомление автору:');
            console.log(result.notification);
            
        } else {
            console.log('Нет фанфиков на модерацию');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Для интеграции с реальным Telegram ботом:');
        console.log('1. Создайте бота через @BotFather');
        console.log('2. Получите токен бота');
        console.log('3. Установите библиотеку: npm install node-telegram-bot-api');
        console.log('4. Замените демо-логику на реальные вызовы API Telegram');
        console.log('='.repeat(60));
    }, 1000);
}

// Запуск демо, если файл запущен напрямую
if (require.main === module) {
    runDemo();
}

module.exports = FanficModerationBot;
