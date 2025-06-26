import * as dotenv from 'dotenv';
import { startBot } from './Bot';

// Загружаем переменные окружения
dotenv.config();

// Проверяем необходимые переменные окружения
function validateEnvironmentVariables() {
    const requiredVars = [
        'TELEGRAM_BOT_TOKEN',
        'FLOWISE_API_URL',
        'FLOWISE_API_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Отсутствуют необходимые переменные окружения:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('Пожалуйста, проверьте файл .env');
        return false;
    }
    
    console.log('✅ Все необходимые переменные окружения загружены');
    console.log(`🤖 Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✓' : '✗'}`);
    console.log(`🔗 Flowise API URL: ${process.env.FLOWISE_API_URL ? '✓' : '✗'}`);
    console.log(`🔑 Flowise API Key: ${process.env.FLOWISE_API_KEY ? '✓' : '✗'}`);
    
    return true;
}

// Запускаем бота
async function main() {
    console.log('🚀 Запуск Telegram бота...');
    
    if (!validateEnvironmentVariables()) {
        console.error('❌ Не удалось запустить бота из-за отсутствующих переменных окружения');
        process.exit(1);
    }
    
    try {
        await startBot();
        console.log('✅ Бот успешно запущен');
    } catch (error) {
        console.error('❌ Ошибка при запуске бота:', error);
        process.exit(1);
    }
}

main(); 