// keep-alive.js - Скрипт для поддержания сервера активным
const https = require('https');
const http = require('http');

const SITE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const PING_INTERVAL = 14 * 60 * 1000; // Каждые 14 минут (меньше 15)

console.log(`🔄 Начинаю keep-alive для: ${SITE_URL}`);

function pingServer() {
    const url = new URL(SITE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/ping',
        method: 'GET',
        timeout: 10000
    };
    
    const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log(`✅ Ping успешен (${new Date().toLocaleTimeString()}): ${response.status}`);
            } catch (e) {
                console.log(`✅ Ping успешен (${new Date().toLocaleTimeString()})`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error(`❌ Ошибка ping: ${error.message}`);
    });
    
    req.on('timeout', () => {
        console.error('⚠️ Ping timeout');
        req.destroy();
    });
    
    req.end();
}

// Первый пинг сразу
pingServer();

// Затем каждые 14 минут
setInterval(pingServer, PING_INTERVAL);

// Также используем uptimerobot.com бесплатно
console.log('📋 Рекомендации для 24/7 работы:');
console.log('1. Зарегистрируйся на uptimerobot.com');
console.log('2. Добавь монитор для твоего сайта');
console.log('3. Установи интервал 5 минут');
console.log('4. Будет работать бесплатно!');

// Чтобы процесс не завершался
process.stdin.resume();
