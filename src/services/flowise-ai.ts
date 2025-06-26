// Проверка доступности Flowise API
function isFlowiseAvailable(): boolean {
    return !!(process.env.FLOWISE_API_URL && process.env.FLOWISE_API_KEY);
}

async function query(data: { question: string }): Promise<any> {
    console.log('🚀 Отправка запроса к Flowise AI...');
    
    // Проверяем доступность API
    if (!isFlowiseAvailable()) {
        throw new Error('Flowise API не настроен. Проверьте переменные окружения FLOWISE_API_URL и FLOWISE_API_KEY');
    }
    
    try {
        const response = await fetch(
            process.env.FLOWISE_API_URL!,
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLOWISE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify(data)
            }
        );
        
        if (!response.ok) {
            console.error('❌ Ошибка HTTP:', response.status, response.statusText);
            
            // Пытаемся получить детали ошибки
            let errorDetails = '';
            try {
                const errorResponse = await response.text();
                errorDetails = errorResponse;
                console.error('📄 Детали ошибки:', errorDetails);
            } catch (e) {
                console.error('❌ Не удалось получить детали ошибки');
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const result: any = await response.json();
        console.log('✅ Ответ получен от AI');
        
        return result;
    } catch (error) {
        console.error('💥 Ошибка при запросе к Flowise AI:', error);
        throw error;
    }
}

export async function processUserMessage(userMessage: string): Promise<string> {
    console.log('👤 Запрос пользователя:', userMessage);
    
    try {
        // Проверяем доступность Flowise
        if (!isFlowiseAvailable()) {
            return 'Извините, сервис AI временно недоступен. Пожалуйста, используйте раздел "Ответы на часто задаваемые вопросы" или обратитесь к администратору.';
        }
        
        const response = await query({ "question": userMessage });
        
        // Берем текст из поля 'text' в JSON ответе
        let aiResponse = '';
        if (response.text) {
            aiResponse = response.text;
        } else if (response.response) {
            aiResponse = response.response;
        } else {
            console.warn('⚠️ Неизвестная структура ответа:', response);
            return 'Извините, получен неожиданный формат ответа от AI. Попробуйте переформулировать вопрос.';
        }
        
        // Проверяем, что ответ не пустой и содержит осмысленную информацию
        const trimmedResponse = aiResponse.trim();
        if (!trimmedResponse || trimmedResponse === '' || trimmedResponse === '\n') {
            console.warn('⚠️ Получен пустой ответ от AI');
            return 'Извините, не удалось получить ответ на ваш вопрос. Попробуйте переформулировать вопрос или используйте раздел "Ответы на часто задаваемые вопросы".';
        }
        
        // Убираем лишние символы новой строки в начале и конце, но сохраняем Markdown форматирование
        const cleanResponse = trimmedResponse.replace(/^\n+|\n+$/g, '');
        if (!cleanResponse) {
            return 'Извините, не удалось получить осмысленный ответ на ваш вопрос. Попробуйте переформулировать вопрос.';
        }
        
        console.log('✅ AI ответ обработан успешно');
        
        return cleanResponse;
    } catch (error) {
        console.error('❌ Ошибка в FlowiseAI processing:', error);
        
        // Возвращаем более информативное сообщение об ошибке
        if (error instanceof Error) {
            if (error.message.includes('HTTP error! status: 500')) {
                return 'Извините, сервис AI временно недоступен. Пожалуйста, попробуйте позже или используйте раздел "Ответы на часто задаваемые вопросы".';
            } else if (error.message.includes('не настроен')) {
                return 'Извините, сервис AI не настроен. Обратитесь к администратору.';
            } else if (error.message.includes('fetch')) {
                return 'Извините, не удалось подключиться к сервису AI. Проверьте подключение к интернету и попробуйте позже.';
            }
        }
        
        return 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже или используйте раздел "Ответы на часто задаваемые вопросы".';
    }
}
