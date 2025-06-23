import { Bot, Context, SessionFlavor, session, Keyboard } from 'grammy';
import * as dotenv from "dotenv";
dotenv.config();

// Основные переменные и типы
import { InlineKeyboard } from "grammy";
import { gigaChatService } from './services/gigachat';
import { collegeSiteService } from './services/college-site';

// Определяем тип для сессии
interface SessionData {
    isAdmin: boolean;
    state?: string;
    tempComplaint?: {
        userId: number;
        text?: string;
        files?: string[];
        date: Date;
        status: "new" | "reviewed" | "closed";
    };
}

// Создаем тип контекста с сессией
type MyContext = Context & SessionFlavor<SessionData>;

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
}

type FAQ = {
    question: string;
    answer: string;
};

type Complaint = {
    userId: number;
    text: string;
    files?: string[];
    date: Date;
    status: "new" | "reviewed" | "closed";
};

// Пример базы FAQ (можно заменить на БД)
const faqs: FAQ[] = [
    { question: "Как подать документы?", answer: "Документы подаются через сайт колледжа или лично в приемной комиссии." },
    { question: "Где узнать расписание?", answer: "Расписание доступно на сайте колледжа в разделе 'Студенту'." },
    // ... другие вопросы
];

// Пример базы жалоб (можно заменить на БД)
let complaints: Complaint[] = [
    { userId: 662135656, text: "Чарон сын шлюхи", date: new Date(), status: "new" },
];

// Список администраторов (ID пользователей Telegram)
const ADMINS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [];

// Главное меню
function mainMenu(isAdmin = false) {
    const kb = new Keyboard()
        .text("🎓 О колледже")
        .text("📚 Поступление")
        .row()
        .text("👨‍🎓 Студентам")
        .text("📞 Контакты")
        .row()
        .text("🔍 Поиск ответа")
        .row()
        .text("❓ Частые вопросы")
        .text("✉️ Жалоба/Предложение")
        .row()
        .text("👨‍🏫 Связь с куратором");
    if (isAdmin) kb.row().text("🛠️ Админ-панель");
    return kb.resized();
}

// Админ-меню
function adminMenu() {
    return new Keyboard()
        .text("📊 Статистика")
        .text("📝 Жалобы")
        .row()
        .text("📢 Рассылка")
        .text("⬅️ Выход")
        .resized();
}

// Создаем инстанс бота с типизацией
const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN);

// Добавляем middleware для работы с сессиями
bot.use(session({
    initial: (): SessionData => ({
        isAdmin: false
    })
}));

// Проверка на админа при каждом сообщении
bot.use(async (ctx, next) => {
    if (ctx.from?.id) {
        ctx.session.isAdmin = ADMINS.includes(ctx.from.id);
    }
    await next();
});

// Функция для создания клавиатуры админ-панели
function getAdminKeyboard(): Keyboard {
    return adminMenu();
}

// Функция для создания основного меню пользователя
function getUserKeyboard(): Keyboard {
    return mainMenu(false);
}

// Обработка команды /start
bot.command('start', async (ctx) => {
    if (ctx.session.isAdmin) {
        await ctx.reply(
            'Добро пожаловать в админ-панель! Выберите действие:',
            { reply_markup: getAdminKeyboard() }
        );
    } else {
        await ctx.reply(
            'Привет! Я - официальный бот Колледжа предпринимательства №11. ' +
            'Выберите интересующий вас раздел или задайте вопрос:',
            { reply_markup: getUserKeyboard() }
        );
    }
});

// Обработка команды /help
bot.command('help', async (ctx) => {
    if (ctx.session.isAdmin) {
        await ctx.reply(
            'Команды админ-панели:\n' +
            '/start - открыть админ-панель\n' +
            '/stats - показать статистику\n' +
            '/broadcast - начать рассылку\n' +
            '/complaints - просмотр жалоб'
        );
    } else {
        await ctx.reply(
            'Я могу помочь вам узнать информацию о Колледже предпринимательства №11.\n\n' +
            'Используйте кнопки меню для навигации или нажмите "🔍 Поиск ответа" ' +
            'чтобы задать свой вопрос.',
            { reply_markup: getUserKeyboard() }
        );
    }
});

// Обработка кнопок пользовательского меню
bot.hears('🎓 О колледже', async (ctx) => {
    if (ctx.session.isAdmin) return;
    await ctx.reply(
        'Колледж предпринимательства №11 - одно из ведущих учебных заведений Москвы. ' +
        'Мы готовим специалистов в области IT, экономики, предпринимательства и других направлений.\n\n' +
        'Выберите интересующий вас раздел или задайте вопрос:',
        { reply_markup: getUserKeyboard() }
    );
});

bot.hears('📚 Поступление', async (ctx) => {
    if (ctx.session.isAdmin) return;
    await ctx.reply(
        'Информация о поступлении:\n\n' +
        '• Приём документов начинается 20 июня\n' +
        '• Необходимые документы: паспорт, аттестат, 4 фото 3x4\n' +
        '• Подробности на сайте: kp11.mskobr.ru\n\n' +
        'Для получения подробной информации нажмите "🔍 Поиск ответа" и задайте вопрос',
        { reply_markup: getUserKeyboard() }
    );
});

bot.hears('👨‍🎓 Студентам', async (ctx) => {
    if (ctx.session.isAdmin) return;
    await ctx.reply(
        'Информация для студентов:\n\n' +
        '• Расписание занятий\n' +
        '• Учебные материалы\n' +
        '• Практика и стажировки\n' +
        '• Внеучебная деятельность\n\n' +
        'Для получения подробной информации нажмите "🔍 Поиск ответа" и задайте вопрос',
        { reply_markup: getUserKeyboard() }
    );
});

bot.hears('📞 Контакты', async (ctx) => {
    if (ctx.session.isAdmin) return;
    await ctx.reply(
        'Контактная информация:\n\n' +
        '📍 Адрес: [адрес колледжа]\n' +
        '📱 Телефон: [телефон]\n' +
        '📧 Email: [email]\n' +
        '🌐 Сайт: kp11.mskobr.ru\n\n' +
        'Для получения подробной информации нажмите "🔍 Поиск ответа" и задайте вопрос',
        { reply_markup: getUserKeyboard() }
    );
});

bot.hears('🔍 Поиск ответа', async (ctx) => {
    if (ctx.session.isAdmin) return;
    ctx.session.state = 'search';
    await ctx.reply(
        'Режим поиска ответа активирован. Задайте ваш вопрос, и я постараюсь на него ответить.\n' +
        'Для возврата в главное меню нажмите любую кнопку меню.',
        { reply_markup: getUserKeyboard() }
    );
});

// Админ-команды
bot.command('admin', async (ctx) => {
    if (ctx.session.isAdmin) {
        await ctx.reply('Админ-панель:', { reply_markup: getAdminKeyboard() });
    }
});

// Главное меню
bot.hears(["Меню", "Главное меню", "⬅️ Выйти в меню"], async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: mainMenu(ctx.session.isAdmin) });
});

// Частые вопросы
bot.hears("❓ Частые вопросы", async (ctx) => {
    const kb = new Keyboard();
    faqs.slice(0, 5).forEach(faq => kb.text(faq.question));
    kb.row().text("⬅️ Выйти в меню");
    await ctx.reply("Выберите вопрос:", { reply_markup: kb.resized() });
});

// Ответ на FAQ
bot.hears(faqs.map(f => f.question), async (ctx) => {
    const faq = faqs.find(f => f.question === ctx.message?.text);
    if (faq) {
        await ctx.reply(`Ответ: ${faq.answer}`, { reply_markup: mainMenu(ctx.session.isAdmin) });
    }
});

// Жалоба/предложение
bot.hears("✉️ Жалоба/Предложение", async (ctx) => {
    ctx.session.state = "awaiting_complaint";
    ctx.session.tempComplaint = { userId: ctx.from?.id ?? 0, date: new Date(), status: "new" };
    await ctx.reply("Пожалуйста, опишите вашу жалобу или предложение. Вы можете прикрепить файл после текста.");
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx, next) => {
    // Обработка жалобы
    if (ctx.session.state === "awaiting_complaint") {
        if (!ctx.session.tempComplaint) {
            ctx.session.tempComplaint = { 
                userId: ctx.from?.id ?? 0, 
                date: new Date(), 
                status: "new" 
            };
        }
        ctx.session.tempComplaint.text = ctx.message.text;
        ctx.session.state = "awaiting_complaint_file";
        await ctx.reply("Если хотите, прикрепите файл (фото/документ) или нажмите 'Готово'.", {
            reply_markup: new Keyboard().text("Готово").row().text("⬅️ Выйти в меню").resized()
        });
        return;
    }

    // Обработка рассылки для админа
    if (ctx.session.isAdmin && ctx.session.state === 'awaiting_broadcast') {
        if (ctx.message.text === '⬅️ Отмена') {
            ctx.session.state = undefined;
            await ctx.reply('Рассылка отменена', { reply_markup: getAdminKeyboard() });
            return;
        }

        // Здесь должна быть логика рассылки
        await ctx.reply(
            `Сообщение будет разослано всем пользователям:\n\n${ctx.message.text}`,
            { reply_markup: getAdminKeyboard() }
        );
        ctx.session.state = undefined;
        return;
    }

    // Если это админ в админ-панели, не отправляем запрос в GigaChat
    if (ctx.session.isAdmin && ctx.session.state) {
        return;
    }

    // Обрабатываем сообщения только в режиме поиска
    if (ctx.session.state === 'search') {
        try {
            // Отправляем "печатает..." статус
            await ctx.replyWithChatAction('typing');

            // Получаем ответ от GigaChat
            const response = await gigaChatService.processUserMessage(ctx.message.text);
            
            // Отправляем ответ пользователю
            await ctx.reply(response, { 
                parse_mode: 'HTML',
                reply_markup: getUserKeyboard()
            });
        } catch (error) {
            console.error('Error processing message:', error);
            await ctx.reply(
                'Извините, произошла ошибка при обработке вашего запроса. ' +
                'Пожалуйста, попробуйте позже или обратитесь на официальный сайт колледжа: kp11.mskobr.ru',
                { reply_markup: getUserKeyboard() }
            );
        }
        return;
    }

    // Для всех остальных сообщений предлагаем быстрые ответы или поиск
    const quickResponses: { [key: string]: string } = {
        'расписание': 'Расписание занятий доступно на сайте колледжа в разделе "Студентам".',
        'поступление': 'Информацию о поступлении можно найти в разделе "Поступление" на сайте колледжа.',
        'контакты': 'Вы можете связаться с колледжем по телефону или email. Используйте кнопку "📞 Контакты" для получения контактной информации.',
        'документы': 'Список необходимых документов можно найти в разделе "Поступление" на сайте колледжа.',
        'график': 'График работы приемной комиссии:\nПонедельник - пятница: с 09:00 до 20:00\nСуббота: с 10:00 до 18:00',
        'телефон': 'Контактный телефон приемной комиссии:\n+7 (499) 150-45-04',
        'адрес': 'Адрес приемной комиссии:\nм. Войковская, Ленинградское шоссе д.13А',
        'приемная комиссия': 'Приемная комиссия КП №11:\n\n📍 Адрес: м. Войковская, Ленинградское шоссе д.13А\n📱 Телефон: +7 (499) 150-45-04\n\n⏰ График работы:\nПн-Пт: 09:00 - 20:00\nСб: 10:00 - 18:00'
    };

    // Проверяем, есть ли быстрый ответ на вопрос
    const messageLower = ctx.message.text.toLowerCase();
    let hasQuickResponse = false;

    for (const [keyword, response] of Object.entries(quickResponses)) {
        if (messageLower.includes(keyword)) {
            await ctx.reply(response, { reply_markup: getUserKeyboard() });
            hasQuickResponse = true;
            break;
        }
    }

    // Если нет быстрого ответа, предлагаем использовать поиск
    if (!hasQuickResponse) {
        await ctx.reply(
            'Для получения подробного ответа на ваш вопрос, пожалуйста:\n' +
            '1. Нажмите кнопку "🔍 Поиск ответа"\n' +
            '2. Задайте свой вопрос повторно\n\n' +
            'Или воспользуйтесь кнопками меню для быстрой навигации.',
            { reply_markup: getUserKeyboard() }
        );
    }
});

// Получение файла к жалобе
bot.on(["message:photo", "message:document"], async (ctx, next) => {
    if (ctx.session.state === "awaiting_complaint_file") {
        const fileId = ctx.message.photo
            ? ctx.message.photo[ctx.message.photo.length - 1].file_id
            : ctx.message.document?.file_id;
        if (fileId) {
            ctx.session.tempComplaint = {
                ...ctx.session.tempComplaint,
                files: [...(ctx.session.tempComplaint?.files ?? []), fileId]
            };
            await ctx.reply("Файл получен. Можете отправить еще или нажмите 'Готово'.", {
                reply_markup: new Keyboard().text("Готово").row().text("⬅️ Выйти в меню").resized()
            });
        }
        return;
    }
    await next();
});

// Завершение жалобы
bot.hears("Готово", async (ctx) => {
    if (ctx.session.state === "awaiting_complaint_file" && ctx.session.tempComplaint?.text) {
        complaints.push(ctx.session.tempComplaint as Complaint);
        // Уведомление админу
        for (const adminId of ADMINS) {
            await bot.api.sendMessage(adminId, `Новая жалоба/предложение:\n${ctx.session.tempComplaint.text}`);
            if (ctx.session.tempComplaint.files) {
                for (const fileId of ctx.session.tempComplaint.files) {
                    await bot.api.sendDocument(adminId, fileId);
                }
            }
        }
        await ctx.reply("Спасибо! Ваша жалоба/предложение отправлена администрации.", { reply_markup: getUserKeyboard() });
        ctx.session.state = undefined;
        ctx.session.tempComplaint = undefined;
    }
});

// Связь с куратором
bot.hears("👨‍🏫 Связь с куратором", async (ctx) => {
    // Здесь можно реализовать переадресацию или вывод контактов
    await ctx.reply("Для связи с куратором напишите на почту curator@college.edu или обратитесь через сайт колледжа.", { reply_markup: getUserKeyboard() });
});

// Обработка кнопок админ-панели
bot.hears('📊 Статистика', async (ctx) => {
    if (!ctx.session.isAdmin) return;
    
    // Здесь можно добавить реальную статистику
    await ctx.reply(
        '📊 Статистика бота:\n\n' +
        '👥 Всего пользователей: XXX\n' +
        '💬 Сообщений за сегодня: XXX\n' +
        '❓ Вопросов в обработке: XXX\n' +
        '✅ Успешных ответов: XXX',
        { reply_markup: getAdminKeyboard() }
    );
});

bot.hears('📝 Жалобы', async (ctx) => {
    if (!ctx.session.isAdmin) return;
    
    let message = '📝 Последние жалобы:\n\n';
    complaints.forEach(complaint => {
        message += `#${complaint.userId}: ${complaint.text}\n`;
        message += `Статус: ${complaint.status}\nДата: ${complaint.date.toLocaleString()}\n\n`;
    });

    await ctx.reply(message, { reply_markup: getAdminKeyboard() });
});

bot.hears('📢 Рассылка', async (ctx) => {
    if (!ctx.session.isAdmin) return;
    
    ctx.session.state = 'awaiting_broadcast';
    await ctx.reply(
        'Введите текст для рассылки всем пользователям:',
        { reply_markup: new Keyboard().text('⬅️ Отмена').resized() }
    );
});

bot.hears('⬅️ Выход', async (ctx) => {
    if (!ctx.session.isAdmin) return;
    
    ctx.session.state = undefined;
    await ctx.reply(
        'Вы вышли из админ-панели. Теперь бот будет отвечать на ваши вопросы как обычный пользователь.',
        { reply_markup: getUserKeyboard() }
    );
});

// Обработка ошибок
bot.catch((err) => {
    console.error('Error in bot:', err);
});

// Запуск бота
export async function startBot() {
    try {
        await gigaChatService.initialize();
        console.log('Bot starting...');
        await bot.start();
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}
