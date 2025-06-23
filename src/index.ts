import * as dotenv from 'dotenv';
import { startBot } from './Bot';

// Загружаем переменные окружения
dotenv.config();

// Отключаем проверку SSL сертификатов для работы с сертификатами Сбера
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Запускаем бота
startBot().catch((error) => {
    console.error('Failed to start the application:', error);
    process.exit(1);
}); 