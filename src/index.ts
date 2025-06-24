import * as dotenv from 'dotenv';
import { startBot } from './Bot';

// Загружаем переменные окружения
dotenv.config();


// Запускаем бота
startBot().catch((error) => {
    console.error('Failed to start the application:', error);
    process.exit(1);
}); 