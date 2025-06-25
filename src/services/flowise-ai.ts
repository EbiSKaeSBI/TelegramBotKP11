async function query(data: { question: string }): Promise<any> {
    const response = await fetch(
        "https://flowise.bibizyana.ru/api/v1/prediction/a7f3789d-252f-44e9-a8a8-f8b8bf3d65c4",
        {
            headers: {
                Authorization: "Bearer J2sUyOSihhc0ju0wpadGlBh1UPvh35YgJfxmCPZcYCA",
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

export async function processUserMessage(userMessage: string): Promise<string> {
    try {
        const response = await query({ "question": userMessage });
        return response.response;
    } catch (error) {
        console.error('Error in FlowiseAI processing:', error);
        return 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.';
    }
}
