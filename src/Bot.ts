import { Bot, session, Keyboard } from 'grammy';
import * as dotenv from "dotenv";
dotenv.config();

// Основные переменные и типы
import { processUserMessage } from './services/flowise-ai';
import { faqs, complaints, ADMINS, professionStories, userNames, userEmails, finishedComplaints, reviewedComplaints } from './constants';
import { SessionData, FAQ, Complaint, MyContext } from './types';

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
}

// Главное меню
function mainMenu(isAdmin = false, userId?: number) {
    const kb = new Keyboard()
        .text("📚 Организация образовательного процесса")
        .text("🌱 Воспитательный процесс")
        .row()
        .text("❓ Ответы на часто задаваемые вопросы")
        .text("✉️ Жалоба/Предложение")
        .row()
        .text("🧭 Профориентация")
        .text("🔍 Поиск ответа");
    // Кнопка личного кабинета только если есть и ФИО, и email
    if (userId && userNames[userId] && userEmails[userId]) {
        kb.row().text("👤 Личный кабинет");
    }
    if (isAdmin) {
        kb.row().text("🛠️ Админ-панель");
    }
    return kb.resized();
}

// Подменю для блока 1
function eduProcessMenu() {
    return new Keyboard()
        .text("🗓️ Расписание")
        .row()
        .text("📖 Содержание программ")
        .row()
        .text("🎓 Дополнительное образование")
        .row()
        .text("⬅️ Назад")
        .resized();
}

// Подменю для блока 2
function upbringingMenu() {
    return new Keyboard()
        .text("🧠 Психологическая консультация")
        .row()
        .text("🤝 Внеурочная деятельность «Быть вместе»")
        .row()
        .text("🕊️ Служба примирения")
        .row()
        .text("⬅️ Назад")
        .resized();
}

// Подменю для блока 5
function profOrientationMenu() {
    return new Keyboard()
        .text("🗣️ Хочу рассказать о своей профессии")
        .row()
        .text("⬅️ Назад")
        .resized();
}

// Меню личного кабинета
function parentCabinetMenu() {
    return new Keyboard()
        .text("✏️ Изменить email")
        .text("✏️ Изменить ФИО")
        .row()
        .text("📄 Мои обращения")
        .row()
        .text("⬅️ Выйти в меню").resized();
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

// Клавиатура админ-панели
function adminPanelMenu() {
    return new Keyboard()
        .text("📋 Жалобы")
        .row()
        .text("❓ FAQ")
        .row()
        .text("📊 Статистика")
        .row()
        .text("📬 Истории о профессии")
        .row()
        .text("⬅️ Выйти в меню пользователя")
        .resized();
}

// Обработка команды /start
bot.command('start', async (ctx) => {
    // Всегда показываем обычное главное меню, даже для админа
    await ctx.reply(
        'Привет! Я - официальный бот Колледжа предпринимательства №11. ' +
        'Выберите интересующий вас раздел или задайте вопрос:',
        { reply_markup: mainMenu(ctx.session.isAdmin, ctx.from?.id) }
    );
});


// Обработка главного меню
bot.hears("📚 Организация образовательного процесса", async (ctx) => {
    ctx.session.state = 'edu_process';
    await ctx.reply("Выберите интересующий раздел:", { reply_markup: eduProcessMenu() });
});

bot.hears("🌱 Воспитательный процесс", async (ctx) => {
    ctx.session.state = 'upbringing';
    await ctx.reply("Выберите интересующий раздел:", { reply_markup: upbringingMenu() });
});

bot.hears("🧭 Профориентация", async (ctx) => {
    ctx.session.state = 'prof_orientation';
    await ctx.reply("Выберите интересующий раздел:", { reply_markup: profOrientationMenu() });
});

// --- Обработка кнопок личного кабинета (размещаю выше bot.on('message:text')) ---
bot.hears("✏️ Изменить email", async (ctx) => {
    ctx.session.state = "change_email";
    await ctx.reply("Пожалуйста, введите новый email:", { reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized() });
});

bot.hears("✏️ Изменить ФИО", async (ctx) => {
    ctx.session.state = "change_name";
    await ctx.reply("Пожалуйста, введите новые ФИО:", { reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized() });
});

bot.hears("📄 Мои обращения", async (ctx) => {
    if (!ctx.from?.id) return;
    const userId = ctx.from.id;
    let message = 'Ваши жалобы/предложения:\n\n';
    const myComplaints = [
        ...complaints.filter(c => c.userId === userId),
        ...reviewedComplaints.filter(c => c.userId === userId),
        ...finishedComplaints.filter(c => c.userId === userId)
    ];
    if (myComplaints.length === 0) message += 'Жалоб/предложений нет.';
    myComplaints.forEach(complaint => {
        let statusDisplay: string;
        if (complaint.status === 'closed') statusDisplay = 'завершена';
        else if (complaint.status === 'reviewed') statusDisplay = 'рассмотрена';
        else statusDisplay = 'новая';
        message += `• ${complaint.text}\nСтатус: ${statusDisplay}\nДата: ${complaint.date.toLocaleString()}\n\n`;
    });
    message += '\nВаши рассказы о профессии:\n\n';
    const myStories = professionStories.filter(s => s.userId === userId);
    if (myStories.length === 0) message += 'Рассказов нет.';
    myStories.forEach(story => {
        message += `• ${story.text}\nСтатус: ${story.status}\nДата: ${story.date.toLocaleString()}\n\n`;
    });
    // Если сообщение слишком длинное, разбиваем на части
    const chunkSize = 3500;
    for (let i = 0; i < message.length; i += chunkSize) {
        await ctx.reply(message.slice(i, i + chunkSize), { reply_markup: parentCabinetMenu() });
    }
    ctx.session.state = "parent_cabinet";
});

// --- Обработка кнопки личного кабинета (размещаю ниже всех меню, но выше catch-all) ---
bot.hears("👤 Личный кабинет", async (ctx) => {
    ctx.session.state = "parent_cabinet";
    await ctx.reply("Личный кабинет:", { reply_markup: parentCabinetMenu() });
});


// Обработка '❓ Ответы на часто задаваемые вопросы'
bot.hears("❓ Ответы на часто задаваемые вопросы", async (ctx) => {
    ctx.session.state = undefined;
    const kb = new Keyboard();
    faqs.forEach(faq => kb.text(faq.question));
    kb.row().text("⬅️ Выйти в меню");
    await ctx.reply("Выберите вопрос:", { reply_markup: kb.resized() });
});

// Ответ на FAQ
bot.hears(faqs.map(f => f.question), async (ctx) => {
    const faq = faqs.find(f => f.question === ctx.message?.text);
    if (faq) {
        // После ответа снова показываем клавиатуру с вопросами
        const kb = new Keyboard();
        faqs.forEach(faq => kb.text(faq.question));
        kb.row().text("⬅️ Выйти в меню");
        await ctx.reply(`Вопрос: ${faq.question}\nОтвет: ${faq.answer}`, { reply_markup: kb.resized() });
    }
});

// Обработка подменю и возврата
bot.hears("⬅️ Назад", async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});

// Примеры обработки подблоков (можно расширить)
bot.hears(["🗓️ Расписание", "📖 Содержание программ", "🎓 Дополнительное образование"], async (ctx) => {
    await ctx.reply(`Информация по разделу: ${ctx.message?.text ?? ""}`, { reply_markup: eduProcessMenu() });
});

bot.hears("🧠 Психологическая консультация", async (ctx) => {
    const text = `
<b>Психологическая консультация</b>

<b>Какие признаки проблем с эмоциональным состоянием у ребёнка?</b>
- Резкая смена настроения в худшую сторону
- Постоянная апатия и отсутствие интереса к любимым занятиям
- Вспышки гнева и ярости
- Повышенная тревожность, частые кошмары
- Появление необоснованных страхов (темнота, животные и др.)
- Жестокость к младшим членам семьи и животным
- Агрессия к окружающим, равнодушие
- Страх перед обычными ситуациями
- Проблемы с аппетитом (снижение или повышение)
- Скрежетание зубами по ночам, разговоры или хождение во сне

<b>Когда обращаться к специалисту:</b>
- При регулярном проявлении тревожных симптомов
- Если изменения в поведении сохраняются длительное время
- Когда проблемы начинают влиять на учёбу и социальную жизнь ребёнка
- При появлении суицидальных мыслей или поведения

<b>Почему важно не откладывать консультацию и куда обращаться:</b>
1. Своевременная диагностика позволяет эффективно скорректировать состояние
2. Раннее вмешательство помогает предотвратить развитие серьёзных проблем
3. Специалист может дать рекомендации по коррекции образа жизни

Помочь разобраться в ситуации могут:
• Педагоги-психологи колледжа
• Специалисты ГБУ ГППЦ ДОНМ (https://www.gppc.ru)
• Единая справочная ГППЦ: 8-(495)-730-21-93
    `;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: upbringingMenu() });
});

bot.hears("🤝 Внеурочная деятельность «Быть вместе»", async (ctx) => {
    await ctx.reply(`Уважаемые родители!

Внеурочная деятельность — важная часть образовательного процесса, способствующая всестороннему развитию вашего ребёнка. Благодаря участию в различных мероприятиях, кружках и клубах, студенты не только расширяют кругозор, но и приобретают ценные навыки общения, ответственности и самостоятельности.

Что даёт внеурочная деятельность вашему ребёнку:
• Возможность раскрыть таланты и найти новые увлечения
• Формирование лидерских и командных качеств
• Участие в социальных, творческих, спортивных и интеллектуальных проектах
• Безопасная и поддерживающая среда для общения со сверстниками
• Развитие инициативы, самостоятельности и уверенности в себе

Мы приглашаем ваших детей принимать активное участие во внеурочной жизни колледжа! Это не только интересно, но и полезно для будущей профессиональной и личной реализации. Подробности о мероприятиях и клубах можно узнать у куратора группы или в студенческом совете.`, { reply_markup: upbringingMenu() });
});

bot.hears("🕊️ Служба примирения", async (ctx) => {
    await ctx.reply(`Уважаемые родители!

В колледже работает служба примирения — команда специалистов и студентов, которая помогает мирно разрешать конфликты и поддерживать атмосферу уважения и безопасности.

Почему это важно для вашего ребёнка:
• Служба помогает решать спорные ситуации между студентами и преподавателями без стресса и давления
• Все обращения рассматриваются конфиденциально и с уважением к участникам
• Ваш ребёнок может получить поддержку, научиться конструктивному общению и разрешению конфликтов
• Проводятся профилактические мероприятия по предотвращению буллинга и агрессии
• Организуются тренинги и мастер-классы по развитию навыков общения

Если у вашего ребёнка возникла сложная ситуация или конфликт, он всегда может обратиться в службу примирения. Мы заботимся о психологическом комфорте и безопасности каждого студента. Контакты службы можно узнать у куратора группы или в студенческом совете.`, { reply_markup: upbringingMenu() });
});

bot.hears("🗣️ Хочу рассказать о своей профессии", async (ctx) => {
    if (!ctx.from?.id) return;
    if (!userNames[ctx.from.id]) {
        ctx.session.state = "awaiting_name_for_profession";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    if (!userEmails[ctx.from.id]) {
        ctx.session.state = "awaiting_email_for_profession";
        await ctx.reply("Пожалуйста, укажите ваш email:", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    ctx.session.state = "awaiting_profession_story";
    await ctx.reply("Пожалуйста, расскажите о своей профессии. Просто отправьте текст.", {
        reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
    });
});

// Открытие админ-панели
bot.hears("🛠️ Админ-панель", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel";
    await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
});

// Просмотр жалоб
bot.hears("📋 Жалобы", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel") return;
    let message = '📝 Последние жалобы:\n\n';
    if (complaints.length === 0) message += 'Жалоб нет.';
    complaints.forEach((complaint, idx) => {
        const name = userNames[complaint.userId] ? ` (${userNames[complaint.userId]})` : '';
        const email = userEmails[complaint.userId] ? `, email: ${userEmails[complaint.userId]}` : '';
        message += `#${complaint.userId}${name}${email}: ${complaint.text}\nСтатус: ${complaint.status}\nДата: ${complaint.date.toLocaleString()}\n\n`;
    });
    const kb = new Keyboard().text("Завершить").row().text("⬅️ Назад в админ-панель").resized();
    await ctx.reply(message, { reply_markup: kb });
    ctx.session.state = "admin_panel_complaints";
});

// Кнопка Завершить — показать список жалоб для завершения
bot.hears("Завершить", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel_complaints") return;
    if (complaints.length === 0) {
        await ctx.reply('Жалоб для завершения нет.', { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        return;
    }
    // Клавиатура: каждая жалоба — отдельная кнопка (по userId и части текста)
    const kb = new Keyboard();
    complaints.forEach((complaint, idx) => {
        const shortText = complaint.text.length > 20 ? complaint.text.slice(0, 20) + '...' : complaint.text;
        kb.text(`Завершить жалобу #${complaint.userId} (${shortText})`);
        if ((idx + 1) % 2 === 0) kb.row();
    });
    kb.row().text("⬅️ Назад в админ-панель").resized();
    await ctx.reply('Выберите жалобу для завершения:', { reply_markup: kb });
    ctx.session.state = "admin_panel_complaints_finish";
});

// Завершение жалобы по кнопке из списка
bot.hears(/^Завершить жалобу #(\d+) \(.+\)$/, async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel_complaints_finish") return;
    const userId = Number(ctx.match[1]);
    const idx = complaints.findIndex(c => c.userId === userId);
    if (idx === -1) {
        await ctx.reply('Жалоба не найдена.', { reply_markup: adminPanelMenu() });
        return;
    }
    const complaint = complaints[idx];
    complaints.splice(idx, 1);
    reviewedComplaints.push({ ...complaint, status: "reviewed" });
    // Уведомить пользователя
    try {
        await bot.api.sendMessage(userId, 'Ваша жалоба/предложение была рассмотрена администрацией.');
    } catch {}
    await ctx.reply('Жалоба отмечена как рассмотренная и перемещена в соответствующий раздел.', { reply_markup: adminPanelMenu() });
    ctx.session.state = "admin_panel";
});

// FAQ управление
bot.hears("❓ FAQ", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel") return;
    ctx.session.state = "admin_panel_faq";
    let text = "Текущий список FAQ:\n";
    faqs.forEach((faq, i) => {
        text += `${i + 1}. ${faq.question}\n`;
    });
    text += "\nОтправьте новый вопрос и ответ в формате:\nВопрос: ...\nОтвет: ...\n\nИли напишите 'Удалить N' для удаления (N — номер вопроса).";
    await ctx.reply(text, { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
});


bot.hears("📬 Истории о профессии", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    let message = '📬 Истории о профессии:\n\n';
    if (professionStories.length === 0) message += 'Историй пока нет.';
    professionStories.forEach((story, i) => {
        const name = userNames[story.userId] ? ` (${userNames[story.userId]})` : '';
        const email = userEmails[story.userId] ? `, email: ${userEmails[story.userId]}` : '';
        message += `#${story.userId}${name}${email}: ${story.text}\nСтатус: ${story.status}\nДата: ${story.date.toLocaleString()}\n\n`;
    });
    // Если сообщение слишком длинное, разбиваем на части (Telegram лимит ~4096 символов)
    const chunkSize = 3500;
    for (let i = 0; i < message.length; i += chunkSize) {
        await ctx.reply(message.slice(i, i + chunkSize), { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
    }
    ctx.session.state = "admin_panel_profession_stories";
});

// Статистика
bot.hears("📊 Статистика", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel") return;
    await ctx.reply(
        '📊 Статистика бота:\n\n' +
        '👥 Всего пользователей: XXX\n' +
        '💬 Сообщений за сегодня: XXX\n' +
        '❓ Вопросов в обработке: XXX\n' +
        '✅ Успешных ответов: XXX',
        { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() }
    );
    ctx.session.state = "admin_panel_stats";
});

// Возврат в админ-панель из подменю
bot.hears("⬅️ Назад в админ-панель", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel";
    await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
});

// Выход из админ-панели
bot.hears("⬅️ Выйти в меню пользователя", async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});

// FAQ добавление/удаление (только если в режиме FAQ админ-панели)
bot.on("message:text", async (ctx, next) => {
    if (ctx.session.state === "admin_panel_faq" && ctx.session.isAdmin) {
        const text = ctx.message?.text ?? "";
        if (text.startsWith("Вопрос:") && text.includes("Ответ:")) {
            const q = text.split("Вопрос:")[1].split("Ответ:")[0].trim();
            const a = text.split("Ответ:")[1].trim();
            faqs.push({ question: q, answer: a });
            await ctx.reply("FAQ добавлен.", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        } else if (text.toLowerCase().startsWith("удалить")) {
            const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(num) && num > 0 && num <= faqs.length) {
                faqs.splice(num - 1, 1);
                await ctx.reply("FAQ удалён.", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
            } else {
                await ctx.reply("Некорректный номер.", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
            }
        } else {
            await ctx.reply("Некорректный формат. Попробуйте снова.", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        }
        return;
    }
    await next();
});

// Жалоба/предложение
bot.hears("✉️ Жалоба/Предложение", async (ctx) => {
    if (!ctx.from?.id) return;
    if (!userNames[ctx.from.id]) {
        ctx.session.state = "awaiting_name_for_complaint";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    if (!userEmails[ctx.from.id]) {
        ctx.session.state = "awaiting_email_for_complaint";
        await ctx.reply("Пожалуйста, укажите ваш email:", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    ctx.session.state = "awaiting_complaint";
    await ctx.reply("Пожалуйста, опишите вашу жалобу или предложение. Просто отправьте текст.", {
        reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
    });
});

// Кнопка '⬅️ Выйти в меню' — всегда возвращает в главное меню
bot.hears("⬅️ Выйти в меню", async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});

// Кнопка '🔍 Поиск ответа' — активирует режим поиска
bot.hears("🔍 Поиск ответа", async (ctx) => {
        ctx.session.state = 'search';
    await ctx.reply('Введите ваш вопрос, и я постараюсь найти ответ!', {
        reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
    });
});

// --- Валидация email ---
function isValidEmail(email: string): boolean {
    // Простой, но строгий паттерн
    return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// Обработка текстовых сообщений
bot.on("message:text", async (ctx, next) => {
    // Сохраняем ФИО для жалобы
    if (ctx.session.state === "awaiting_name_for_complaint") {
        if (!ctx.from?.id) return;
        userNames[ctx.from.id] = ctx.message.text.trim();
        ctx.session.state = "awaiting_email_for_complaint";
        await ctx.reply("Спасибо! Теперь укажите ваш email:", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    // Сохраняем email для жалобы
    if (ctx.session.state === "awaiting_email_for_complaint") {
        if (!ctx.from?.id) return;
        const email = ctx.message.text.trim();
        if (!isValidEmail(email)) {
            await ctx.reply("Пожалуйста, введите корректный email (например, example@mail.ru):", {
                reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
            });
            return;
        }
        userEmails[ctx.from.id] = email;
        ctx.session.state = "awaiting_complaint";
        await ctx.reply("Спасибо! Теперь опишите вашу жалобу или предложение. Просто отправьте текст.", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    // Сохраняем ФИО для рассказа о профессии
    if (ctx.session.state === "awaiting_name_for_profession") {
        if (!ctx.from?.id) return;
        userNames[ctx.from.id] = ctx.message.text.trim();
        ctx.session.state = "awaiting_email_for_profession";
        await ctx.reply("Спасибо! Теперь укажите ваш email:", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    // Сохраняем email для рассказа о профессии
    if (ctx.session.state === "awaiting_email_for_profession") {
        if (!ctx.from?.id) return;
        const email = ctx.message.text.trim();
        if (!isValidEmail(email)) {
            await ctx.reply("Пожалуйста, введите корректный email (например, example@mail.ru):", {
                reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
            });
            return;
        }
        userEmails[ctx.from.id] = email;
        ctx.session.state = "awaiting_profession_story";
        await ctx.reply("Спасибо! Теперь расскажите о своей профессии. Просто отправьте текст.", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }

    // Обработка жалобы/предложения (теперь без файлов)
    if (ctx.session.state === "awaiting_complaint") {
        if (!ctx.from?.id) {
            await ctx.reply('Извините, не удалось определить ваш ID. Пожалуйста, попробуйте позже.');
            return;
        }
        const complaint = {
            userId: ctx.from.id,
            text: ctx.message.text,
            date: new Date(),
            status: "new" as const
        };
        complaints.push(complaint);
        // Уведомление админу
        const name = userNames[ctx.from.id] ? ` (${userNames[ctx.from.id]})` : '';
        const email = userEmails[ctx.from.id] ? `, email: ${userEmails[ctx.from.id]}` : '';
        await ctx.reply(`Ваша жалоба/предложение принято. Спасибо!`, { reply_markup: mainMenu(ctx.session.isAdmin, ctx.from?.id) });
    }

    await next();
});

export const startBot = () => {
    console.log('Bot starting');
    return bot.start();
};