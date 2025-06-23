import GigaChat from 'gigachat';
import { collegeSiteService } from './college-site';

export class GigaChatService {
    private client: GigaChat;
    private isInitialized = false;

    constructor() {
        if (!process.env.GIGACHAT_API_KEY) {
            throw new Error('GIGACHAT_API_KEY not found in environment variables');
        }

        this.client = new GigaChat({
            credentials: process.env.GIGACHAT_API_KEY
        });
    }

    async initialize() {
        if (!this.isInitialized) {
            // Инициализируем сервис с информацией о колледже
            await collegeSiteService.initialize();
            this.isInitialized = true;
        }
    }

    async processUserMessage(userMessage: string): Promise<string> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Получаем контекст с информацией о колледже для промпта
            const systemPrompt = collegeSiteService.getContextForPrompt(userMessage);

            const response = await this.client.chat({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                model: 'GigaChat:latest',
                temperature: 0.7,
                max_tokens: 1500
            });

            return response.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';
        } catch (error) {
            console.error('Error in GigaChat processing:', error);
            
            // Если ошибка связана с токеном, пробуем переинициализировать
            if (error instanceof Error && error.message.toLowerCase().includes('token')) {
                this.isInitialized = false;
                return this.processUserMessage(userMessage);
            }
            
            return 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.';
        }
    }
}

export const gigaChatService = new GigaChatService(); 