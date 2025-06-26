import { Bot, session, Keyboard, InputFile } from 'grammy';
import * as dotenv from "dotenv";
dotenv.config();

// Основные переменные и типы
import { processUserMessage } from './services/flowise-ai';
import { sessionMiddleware, adminCheckMiddleware, errorHandler } from './middleware';
import { SessionData, FAQ, Complaint, MyContext } from './types';
import * as complaintService from './services/complaints';
import * as userService from './services/users';
import * as professionStoriesService from './services/professionStories';
import * as faqService from './services/faq';

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
}

// Главное меню (делаю асинхронной)
async function mainMenu(isAdmin = false, userId?: number) {
    const kb = new Keyboard()
        .text("📚 Организация образовательного процесса")
        .text("🌱 Воспитательный процесс")
        .row()
        .text("❓ Ответы на часто задаваемые вопросы")
        .text("✉️ Жалоба/Предложение")
        .row()
        .text("🧭 Профориентация")
        .text("🔍 Поиск ответа");
    if (userId) {
        const user = await userService.getUser(userId);
        if (user) {
            kb.row().text("👤 Личный кабинет");
        }
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

// Используем middleware
bot.use(sessionMiddleware);
bot.use(adminCheckMiddleware);
errorHandler(bot);

// Клавиатура админ-панели
function adminPanelMenu() {
    return new Keyboard()
        .text("📋 Жалобы")
        .row()
        .text("❓ FAQ")
        .row()
        .text("📬 Истории о профессии")
        .row()
        .text("⬅️ Выйти в меню пользователя")
        .resized();
}

// Обработка команды /start
bot.command('start', async (ctx) => {
    // Всегда показываем обычное главное меню, даже для админа
    await ctx.replyWithPhoto(
        new InputFile('./src/assets/owl_hi.png'),
        {
            caption: 'Привет! Я - официальный бот Колледжа предпринимательства №11. ' +
            'Выберите интересующий вас раздел или задайте вопрос:',
            reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id)
        }
    )
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

// Обработка рассказа о профессии
bot.hears("🗣️ Хочу рассказать о своей профессии", async (ctx) => {
    if (!ctx.from?.id) return;
    const user = await userService.getUser(ctx.from.id);
    if (!user?.name) {
        ctx.session.state = "awaiting_name_for_profession";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    if (!user?.email) {
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

// Примеры обработки подблоков (можно расширить)
bot.hears("🗓️ Расписание", async (ctx) => {
    const text = `
<b>Расписание учебных занятий и каникул</b>

Актуальное расписание занятий, а также график каникул для студентов колледжа вы всегда можете найти на официальном сайте колледжа по ссылке:
https://kp11.mskobr.ru/uchashimsya/raspisanie-kanikuly

На странице представлены:
• Расписание учебных занятий для всех курсов и групп
• График учебных периодов и каникул на текущий учебный год
• Важные объявления по изменениям в расписании

Пожалуйста, регулярно проверяйте расписание на сайте, чтобы быть в курсе возможных изменений!
    `;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: eduProcessMenu() });
});

bot.hears("📖 Содержание программ", async (ctx) => {
    const text = `
<b>Содержание образовательных программ</b>

Подробную информацию о реализуемых образовательных программах, учебных планах, аннотациях и рабочих программах дисциплин вы можете найти на официальном сайте колледжа по ссылке:
https://kp11.mskobr.ru/info_edu/education

На странице представлены:
• Перечень образовательных программ, реализуемых в колледже
• Учебные планы по специальностям
• Аннотации к программам и рабочие программы дисциплин
• Информация о методических материалах

Пожалуйста, ознакомьтесь с актуальной информацией на сайте для получения полного представления о содержании образовательных программ.
    `;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: eduProcessMenu() });
});

bot.hears("🎓 Дополнительное образование", async (ctx) => {
    const text = `
<b>🎓 Дополнительное образование</b>

Колледж предлагает широкий спектр дополнительных образовательных программ, направленных на развитие профессиональных и личностных компетенций студентов. 

На официальном сайте колледжа вы можете ознакомиться с перечнем программ дополнительного образования, узнать о содержании курсов, условиях поступления и расписании занятий:
https://kp11.mskobr.ru/info_edu/education

В разделе представлены:
• Программы профессионального обучения и повышения квалификации
• Краткосрочные курсы и мастер-классы
• Возможности для получения новых знаний и навыков по востребованным направлениям

Рекомендуем регулярно посещать сайт для получения актуальной информации о новых программах и возможностях дополнительного образования!
    `;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: eduProcessMenu() });
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
    const myComplaints = await complaintService.getUserComplaints(userId);
    if (myComplaints.length === 0) message += 'Жалоб/предложений нет.';
    myComplaints.forEach((complaint: any) => {
        let statusDisplay: string;
        if (complaint.status === 'CLOSED') statusDisplay = 'завершена';
        else if (complaint.status === 'REVIEWED') statusDisplay = 'рассмотрена';
        else statusDisplay = 'новая';
        message += `• ${complaint.text}\nСтатус: ${statusDisplay}\nДата: ${complaint.createdAt.toLocaleString()}\n\n`;
    });
    message += '\nВаши рассказы о профессии:\n\n';
    const myStories = await professionStoriesService.getUserStories(userId);
    if (myStories.length === 0) message += 'Рассказов нет.';
    myStories.forEach((story: any) => {
        message += `• ${story.text}\nСтатус: ${story.status}\nДата: ${story.createdAt.toLocaleString()}\n\n`;
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


// FAQ управление (админка)
bot.hears("❓ FAQ", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel_faq";
    const faqs = await faqService.getAllFaqs();
    let text = "Текущий список FAQ:\n";
    faqs.forEach((faq: any, i: number) => {
        text += `${i + 1}. ${faq.question}\n`;
    });
    text += "\nВыберите действие:";
    const kb = new Keyboard()
        .text("➕ Добавить FAQ")
        .text("➖ Удалить FAQ")
        .row()
        .text("⬅️ Назад в админ-панель").resized();
    await ctx.reply(text, { reply_markup: kb });
});

// Добавление FAQ (поочередно)
bot.hears("➕ Добавить FAQ", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_faq_add_question";
    await ctx.reply("Введите текст вопроса:", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
});

// Удаление FAQ (выбор)
bot.hears("➖ Удалить FAQ", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    const faqs = await faqService.getAllFaqs();
    if (faqs.length === 0) {
        await ctx.reply("FAQ пуст.", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        return;
    }
    let text = "Выберите номер FAQ для удаления:\n";
    faqs.forEach((faq: any, i: number) => {
        text += `${i + 1}. ${faq.question}\n`;
    });
    ctx.session.state = "admin_faq_delete";
    await ctx.reply(text, { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
});

// Обработка добавления/удаления FAQ (поочередно)
bot.on("message:text", async (ctx, next) => {
    // Проверяем кнопку "⬅️ Выйти в меню" для всех состояний
    if (ctx.message.text?.trim() === "⬅️ Выйти в меню") {
        ctx.session.state = undefined;
        await ctx.reply("Главное меню:", { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
        return;
    }
    // Проверяем кнопку "⬅️ Назад в админ-панель" для всех состояний
    if (ctx.message.text?.trim() === "⬅️ Назад в админ-панель") {
        ctx.session.state = "admin_panel";
        await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
        return;
    }
    
    // Добавление FAQ: ввод вопроса
    if (ctx.session.state === "admin_faq_add_question") {
        ctx.session.faqDraft = { question: ctx.message.text.trim() };
        ctx.session.state = "admin_faq_add_answer";
        await ctx.reply("Введите текст ответа:", { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        return;
    }
    // Добавление FAQ: ввод ответа
    if (ctx.session.state === "admin_faq_add_answer") {
        const answer = ctx.message.text.trim();
        const question = ctx.session.faqDraft?.question;
        if (!question || !answer) {
            await ctx.reply("Ошибка: вопрос или ответ не заполнены.");
            ctx.session.state = "admin_panel_faq";
            return;
        }
        await faqService.addFaq(question, answer);
        ctx.session.faqDraft = undefined;
        ctx.session.state = "admin_panel_faq";
        await ctx.reply("FAQ успешно добавлен!", { reply_markup: adminPanelMenu() });
        return;
    }
    // Удаление FAQ: ввод номера
    if (ctx.session.state === "admin_faq_delete") {
        const num = Number(ctx.message.text.trim());
        const faqs = await faqService.getAllFaqs();
        if (isNaN(num) || num < 1 || num > faqs.length) {
            await ctx.reply("Некорректный номер для удаления.");
            return;
        }
        await faqService.deleteFaq(faqs[num - 1].id);
        ctx.session.state = "admin_panel_faq";
        await ctx.reply("FAQ удалён.", { reply_markup: new Keyboard().text("❓ FAQ").resized() });
        return;
    }
    // Сохраняем ФИО для жалобы
    if (ctx.session.state === "awaiting_name_for_complaint") {
        if (!ctx.from?.id) return;
        await userService.upsertUser(ctx.from.id, ctx.message.text.trim());
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
        const user = await userService.getUser(ctx.from.id);
        await userService.upsertUser(ctx.from.id, user?.name ?? undefined, email);
        ctx.session.state = "awaiting_complaint";
        await ctx.reply("Спасибо! Теперь опишите вашу жалобу или предложение. Просто отправьте текст.", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    // Сохраняем ФИО для рассказа о профессии
    if (ctx.session.state === "awaiting_name_for_profession") {
        if (!ctx.from?.id) return;
        await userService.upsertUser(ctx.from.id, ctx.message.text.trim());
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
        const user = await userService.getUser(ctx.from.id);
        await userService.upsertUser(ctx.from.id, user?.name ?? undefined, email);
        ctx.session.state = "awaiting_profession_story";
        await ctx.reply("Спасибо! Теперь расскажите о своей профессии. Просто отправьте текст.", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    // Изменение email в личном кабинете
    if (ctx.session.state === "change_email") {
        if (!ctx.from?.id) return;
        const email = ctx.message.text.trim();
        if (!isValidEmail(email)) {
            await ctx.reply("Пожалуйста, введите корректный email (например, example@mail.ru):", {
                reply_markup: parentCabinetMenu()
            });
            return;
        }
        const user = await userService.getUser(ctx.from.id);
        await userService.upsertUser(ctx.from.id, user?.name ?? undefined, email);
        ctx.session.state = "parent_cabinet";
        await ctx.reply("Ваш email успешно изменён!", { reply_markup: parentCabinetMenu() });
        return;
    }
    // Изменение ФИО в личном кабинете
    if (ctx.session.state === "change_name") {
        if (!ctx.from?.id) return;
        const name = ctx.message.text.trim();
        const user = await userService.getUser(ctx.from.id);
        await userService.upsertUser(ctx.from.id, name, user?.email ?? undefined);
        ctx.session.state = "parent_cabinet";
        await ctx.reply("Ваши ФИО успешно изменены!", { reply_markup: parentCabinetMenu() });
        return;
    }
    // Обработка жалобы/предложения
    if (ctx.session.state === "awaiting_complaint") {
        if (!ctx.from?.id) {
            await ctx.reply('Извините, не удалось определить ваш ID. Пожалуйста, попробуйте позже.');
            return;
        }
        await complaintService.addComplaint(ctx.from.id, ctx.message.text);
        await ctx.reply(`Ваша жалоба/предложение принято. Спасибо!`, { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
        ctx.session.state = undefined;
        return;
    }

    if (ctx.session.state === "awaiting_profession_story") {
        if (!ctx.from?.id) return;
        await professionStoriesService.addStory(ctx.from.id, ctx.message.text);
        await ctx.reply("Спасибо! Ваш рассказ о профессии отправлен на рассмотрение.", {
            reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id)
        });
        ctx.session.state = undefined;
        return;
    }

    // Обработка поиска ответа через AI
    if (ctx.session.state === "search") {
        try {
            // Проверяем, что пользователь ввел не пустое сообщение
            const userMessage = ctx.message.text?.trim();
            
            if (!userMessage || userMessage === '') {
                console.log('⚠️ Пользователь отправил пустое сообщение в режиме поиска');
                await ctx.reply("Пожалуйста, введите ваш вопрос. Сообщение не может быть пустым.", {
                    reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
                });
                return;
            }
            
            // Показываем индикатор загрузки
            await ctx.reply("🔍 Ищу ответ на ваш вопрос...");
            
            // Отправляем запрос к AI
            const aiResponse = await processUserMessage(userMessage);
            
            // Проверяем, что ответ не пустой
            const trimmedResponse = aiResponse?.trim();
            if (!trimmedResponse || trimmedResponse === '') {
                await ctx.reply("Извините, не удалось найти подходящий ответ на ваш вопрос. Попробуйте переформулировать вопрос.", {
                    reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
                });
                return;
            }
            
            // Отправляем ответ от AI
            await sendMessageWithMarkdown(ctx, trimmedResponse, new Keyboard().text("⬅️ Выйти в меню").resized());
            
            // Остаёмся в режиме поиска для возможности задать ещё вопрос
            return;
        } catch (error) {
            console.error('Ошибка при обработке запроса к AI:', error);
            await ctx.reply("Извините, произошла ошибка при поиске ответа. Попробуйте позже.", {
                reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
            });
            return;
        }
    }

    await next();
});

// Обработчик кнопки '⬅️ Назад в админ-панель' — возврат в админ-панель
bot.hears("⬅️ Назад в админ-панель", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel";
    await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
});

// Обработчик кнопки '⬅️ Выйти в меню пользователя' — возврат в главное меню
bot.hears("⬅️ Выйти в меню пользователя", async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});

// Жалоба/предложение с лимитом на одну активную жалобу
bot.hears("📬 Истории о профессии", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    const stories = await professionStoriesService.getAllStories();
    let message = '📬 Истории о профессии:\n\n';
    if (stories.length === 0) message += 'Историй пока нет.';
    for (const story of stories) {
        const user = await userService.getUser(story.telegramId);
        const name = user?.name ? ` (${user.name})` : '';
        const email = user?.email ? `, email: ${user.email}` : '';
        message += `#${story.telegramId}${name}${email}: ${story.text}\nСтатус: ${story.status}\nДата: ${story.createdAt.toLocaleString()}\n\n`;
    }
    // Если сообщение слишком длинное, разбиваем на части (Telegram лимит ~4096 символов)
    const chunkSize = 3500;
    for (let i = 0; i < message.length; i += chunkSize) {
        await ctx.reply(message.slice(i, i + chunkSize), { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
    }
    ctx.session.state = "admin_panel_profession_stories";
});

// Жалоба/предложение с лимитом на одну активную жалобу
bot.hears("✉️ Жалоба/Предложение", async (ctx) => {
    if (!ctx.from?.id) return;
    const userId = ctx.from.id;
    // Не создаём нового пользователя, только ищем
    const user = await userService.getUser(userId);
    if (!user) {
        ctx.session.state = "awaiting_name_for_complaint";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    const activeComplaints = await complaintService.getActiveComplaints(userId);
    if (activeComplaints.length > 0) {
        await ctx.reply("Ваша жалоба ещё не рассмотрена. Вы сможете отправить новую, когда администратор закроет предыдущую.", {
            reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id)
        });
        return;
    }
    if (!user.name) {
        ctx.session.state = "awaiting_name_for_complaint";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    if (!user.email) {
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
    await ctx.reply("Главное меню:", { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});

// Кнопка '🔍 Поиск ответа' — активирует режим поиска
bot.hears("🔍 Поиск ответа", async (ctx) => {
    ctx.session.state = 'search';
    await ctx.reply('Введите ваш вопрос, и я постараюсь найти ответ!', {
        reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
    });
});

// --- Блок '❓ Ответы на часто задаваемые вопросы' с пагинацией ---
bot.hears("❓ Ответы на часто задаваемые вопросы", async (ctx) => {
    ctx.session.state = "faq_page_0";
    const faqs = await faqService.getAllFaqs();
    const page = 0;
    const pageSize = 4;
    const totalPages = Math.ceil(faqs.length / pageSize);
    const faqsPage = faqs.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    for (let i = 0; i < faqsPage.length; i += 2) {
        if (faqsPage[i + 1]) {
            kb.text(faqsPage[i].question).text(faqsPage[i + 1].question).row();
        } else {
            kb.text(faqsPage[i].question).row();
        }
    }
    let navRow = [];
    if (totalPages > 1 && page > 0) navRow.push("Назад");
    if (totalPages > 1 && page + 1 < totalPages) navRow.push("Далее");
    navRow.push("⬅️ Выйти в меню");
    kb.row(...navRow);
    await ctx.reply("Выберите вопрос:", { reply_markup: kb.resized() });
});

// Пагинация FAQ: Далее
bot.hears("Далее", async (ctx) => {
    if (!ctx.session.state?.startsWith("faq_page_")) return;
    const faqs = await faqService.getAllFaqs();
    let page = Number(ctx.session.state.replace("faq_page_", ""));
    const pageSize = 4;
    const totalPages = Math.ceil(faqs.length / pageSize);
    if (page + 1 >= totalPages) return;
    page++;
    const faqsPage = faqs.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    for (let i = 0; i < faqsPage.length; i += 2) {
        if (faqsPage[i + 1]) {
            kb.text(faqsPage[i].question).text(faqsPage[i + 1].question).row();
        } else {
            kb.text(faqsPage[i].question).row();
        }
    }
    let navRow = [];
    if (totalPages > 1 && page > 0) navRow.push("Назад");
    if (totalPages > 1 && page + 1 < totalPages) navRow.push("Далее");
    navRow.push("⬅️ Выйти в меню");
    kb.row(...navRow);
    await ctx.reply("Выберите вопрос:", { reply_markup: kb.resized() });
    ctx.session.state = `faq_page_${page}`;
});

// Пагинация FAQ: Назад
bot.hears("Назад", async (ctx) => {
    if (!ctx.session.state?.startsWith("faq_page_")) return;
    const faqs = await faqService.getAllFaqs();
    let page = Number(ctx.session.state.replace("faq_page_", ""));
    if (page === 0) return;
    page--;
    const pageSize = 4;
    const totalPages = Math.ceil(faqs.length / pageSize);
    const faqsPage = faqs.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    for (let i = 0; i < faqsPage.length; i += 2) {
        if (faqsPage[i + 1]) {
            kb.text(faqsPage[i].question).text(faqsPage[i + 1].question).row();
        } else {
            kb.text(faqsPage[i].question).row();
        }
    }
    let navRow = [];
    if (totalPages > 1 && page > 0) navRow.push("Назад");
    if (totalPages > 1 && page + 1 < totalPages) navRow.push("Далее");
    navRow.push("⬅️ Выйти в меню");
    kb.row(...navRow);
    await ctx.reply("Выберите вопрос:", { reply_markup: kb.resized() });
    ctx.session.state = `faq_page_${page}`;
});

// Ответ на FAQ (по тексту вопроса)
bot.on("message:text", async (ctx, next) => {
    if (ctx.session.state?.startsWith("faq_page_")) {
        const faqs = await faqService.getAllFaqs();
        const faq = faqs.find((f: any) => f.question === ctx.message.text);
        if (faq) {
            // После ответа снова показываем клавиатуру с вопросами (текущая страница)
            let page = Number(ctx.session.state.replace("faq_page_", ""));
            const pageSize = 4;
            const totalPages = Math.ceil(faqs.length / pageSize);
            const faqsPage = faqs.slice(page * pageSize, (page + 1) * pageSize);
            const kb = new Keyboard();
            for (let i = 0; i < faqsPage.length; i += 2) {
                if (faqsPage[i + 1]) {
                    kb.text(faqsPage[i].question).text(faqsPage[i + 1].question).row();
                } else {
                    kb.text(faqsPage[i].question).row();
                }
            }
            let navRow = [];
            if (totalPages > 1 && page > 0) navRow.push("Назад");
            if (totalPages > 1 && page + 1 < totalPages) navRow.push("Далее");
            navRow.push("⬅️ Выйти в меню");
            kb.row(...navRow);
            
            // Форматируем ответ FAQ с HTML
            const faqText = `<b>Вопрос:</b> ${faq.question}\n\n<b>Ответ:</b> ${faq.answer}`;
            
            try {
                await ctx.reply(faqText, {
                    parse_mode: 'HTML',
                    reply_markup: kb.resized()
                });
            } catch (error) {
                console.warn('⚠️ Ошибка при отправке FAQ с HTML, отправляем как обычный текст:', error);
                await ctx.reply(`Вопрос: ${faq.question}\n\nОтвет: ${faq.answer}`, {
                    reply_markup: kb.resized()
                });
            }
            return;
        }
    }
    await next();
});

// Обработчик для кнопки '🛠️ Админ-панель'
bot.hears("🛠️ Админ-панель", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel";
    await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
});

// 1. Обработчик для кнопки '📋 Жалобы'
bot.hears("📋 Жалобы", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel") return;
    const usersWithComplaints = await complaintService.getAllComplaintUsersWithActive();
    if (usersWithComplaints.length === 0) {
        await ctx.reply('Жалоб нет.', { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        return;
    }
    const kb = new Keyboard();
    for (const { telegramId } of usersWithComplaints) {
        const user = await userService.getUser(telegramId);
        const name = user?.name ? ` (${user.name})` : '';
        const email = user?.email ? `, email: ${user.email}` : '';
        kb.text(`Пользователь #${telegramId}${name}${email}`).row();
    }
    kb.text("⬅️ Назад в админ-панель").resized();
    await ctx.reply('Выберите пользователя для просмотра жалоб:', { reply_markup: kb });
    ctx.session.state = "admin_panel_complaints_users";
});

// При выборе пользователя — показываем список его жалоб (кнопки) с пагинацией
bot.hears(/^Пользователь #(\d+)/, async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel_complaints_users") return;
    const userId = Number(ctx.match[1]);
    const userComplaints = (await complaintService.getUserComplaints(userId)).filter((c: any) => c.status === 'NEW' || c.status === 'REVIEWED');
    if (userComplaints.length === 0) {
        await ctx.reply('Жалоб у пользователя нет.', { reply_markup: new Keyboard().text("⬅️ Назад к пользователям").resized() });
        return;
    }
    const page = 0;
    const pageSize = 4;
    const totalPages = Math.ceil(userComplaints.length / pageSize);
    const complaintsPage = userComplaints.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    complaintsPage.forEach((complaint: any, idx: number) => {
        const shortText = complaint.text.length > 20 ? complaint.text.slice(0, 20) + '...' : complaint.text;
        kb.text(`Жалоба #${complaint.id} (${shortText})`).row();
    });
    if (totalPages > 1) {
        kb.text("Далее");
    }
    kb.text("⬅️ Назад к пользователям").resized();
    await ctx.reply(`Выберите жалобу для просмотра (стр. ${page + 1} из ${totalPages}):`, { reply_markup: kb });
    ctx.session.state = `admin_panel_complaints_list_${userId}_page_${page}`;
});

// Пагинация: Далее
bot.hears("Далее", async (ctx) => {
    if (!ctx.session.isAdmin || !ctx.session.state?.startsWith("admin_panel_complaints_list_")) return;
    const match = ctx.session.state.match(/^admin_panel_complaints_list_(\d+)_page_(\d+)$/);
    if (!match) return;
    const userId = Number(match[1]);
    let page = Number(match[2]);
    const userComplaints = (await complaintService.getUserComplaints(userId)).filter((c: any) => c.status === 'NEW' || c.status === 'REVIEWED');
    const pageSize = 4;
    const totalPages = Math.ceil(userComplaints.length / pageSize);
    if (page + 1 >= totalPages) return;
    page++;
    const complaintsPage = userComplaints.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    complaintsPage.forEach((complaint: any, idx: number) => {
        const shortText = complaint.text.length > 20 ? complaint.text.slice(0, 20) + '...' : complaint.text;
        kb.text(`Жалоба #${complaint.id} (${shortText})`).row();
    });
    if (page > 0) kb.text("Назад");
    if (page + 1 < totalPages) kb.text("Далее");
    kb.text("⬅️ Назад к пользователям").resized();
    await ctx.reply(`Выберите жалобу для просмотра (стр. ${page + 1} из ${totalPages}):`, { reply_markup: kb });
    ctx.session.state = `admin_panel_complaints_list_${userId}_page_${page}`;
});

// Пагинация: Назад
bot.hears("Назад", async (ctx) => {
    if (!ctx.session.isAdmin || !ctx.session.state?.startsWith("admin_panel_complaints_list_")) return;
    const match = ctx.session.state.match(/^admin_panel_complaints_list_(\d+)_page_(\d+)$/);
    if (!match) return;
    const userId = Number(match[1]);
    let page = Number(match[2]);
    if (page === 0) return;
    page--;
    const userComplaints = (await complaintService.getUserComplaints(userId)).filter((c: any) => c.status === 'NEW' || c.status === 'REVIEWED');
    const pageSize = 4;
    const totalPages = Math.ceil(userComplaints.length / pageSize);
    const complaintsPage = userComplaints.slice(page * pageSize, (page + 1) * pageSize);
    const kb = new Keyboard();
    complaintsPage.forEach((complaint: any, idx: number) => {
        const shortText = complaint.text.length > 20 ? complaint.text.slice(0, 20) + '...' : complaint.text;
        kb.text(`Жалоба #${complaint.id} (${shortText})`).row();
    });
    if (page > 0) kb.text("Назад");
    if (page + 1 < totalPages) kb.text("Далее");
    kb.text("⬅️ Назад к пользователям").resized();
    await ctx.reply(`Выберите жалобу для просмотра (стр. ${page + 1} из ${totalPages}):`, { reply_markup: kb });
    ctx.session.state = `admin_panel_complaints_list_${userId}_page_${page}`;
});

// При выборе жалобы — показываем детали и действия
bot.hears(/^Жалоба #(\d+) /, async (ctx) => {
    if (!ctx.session.isAdmin || !ctx.session.state?.startsWith("admin_panel_complaints_list_")) return;
    const complaintId = Number(ctx.match[1]);
    const complaint = await complaintService.getComplaintById(complaintId);
    if (!complaint) {
        await ctx.reply('Жалоба не найдена.', { reply_markup: new Keyboard().text("⬅️ Назад к жалобам пользователя").resized() });
        return;
    }
    if (complaint.status === 'NEW') {
        await complaintService.setComplaintStatus(complaintId, 'REVIEWED');
    }
    const user = await userService.getUser(complaint.telegramId);
    let message = `Жалоба пользователя #${complaint.telegramId}`;
    if (user?.name) message += ` (${user.name})`;
    if (user?.email) message += `, email: ${user.email}`;
    message += `:\n\n${complaint.text}\nСтатус: просмотрено\nДата: ${complaint.createdAt.toLocaleString()}`;
    const kb = new Keyboard()
        .text("Закрыть эту жалобу")
        .row()
        .text("⬅️ Назад к жалобам пользователя").resized();
    await ctx.reply(message, { reply_markup: kb });
    ctx.session.state = `admin_panel_complaint_detail_${complaint.telegramId}_${complaintId}`;
});

// Закрыть одну жалобу
bot.hears("Закрыть эту жалобу", async (ctx) => {
    if (!ctx.session.isAdmin || !ctx.session.state?.startsWith("admin_panel_complaint_detail_")) return;
    const parts = ctx.session.state.replace("admin_panel_complaint_detail_", "").split("_");
    const userId = Number(parts[0]);
    const complaintId = Number(parts[1]);
    const complaint = await complaintService.getComplaintById(complaintId);
    if (!complaint || complaint.status === 'CLOSED') {
        await ctx.reply('Жалоба не найдена или уже закрыта.', { reply_markup: new Keyboard().text("⬅️ Назад к жалобам пользователя").resized() });
        return;
    }
    await complaintService.setComplaintStatus(complaintId, 'CLOSED');
    try {
        await bot.api.sendMessage(userId, 'Ваша жалоба/предложение была закрыта администрацией.');
    } catch {}
    await ctx.reply('Жалоба закрыта и перемещена в завершённые.', { reply_markup: new Keyboard().text("⬅️ Назад к жалобам пользователя").resized() });
    ctx.session.state = `admin_panel_complaints_list_${userId}`;
});

// Назад к списку жалоб пользователя
bot.hears("⬅️ Назад к жалобам пользователя", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    let userId: number | undefined = undefined;
    if (ctx.session.state?.startsWith("admin_panel_complaint_detail_")) {
        const parts = ctx.session.state.replace("admin_panel_complaint_detail_", "").split("_");
        userId = Number(parts[0]);
    } else if (ctx.session.state?.startsWith("admin_panel_complaints_list_")) {
        userId = Number(ctx.session.state.replace("admin_panel_complaints_list_", ""));
    }
    if (!userId) return;
    const userComplaints = (await complaintService.getUserComplaints(userId)).filter((c: any) => c.status === 'NEW' || c.status === 'REVIEWED');
    if (userComplaints.length === 0) {
        await ctx.reply('Жалоб у пользователя нет.', { reply_markup: new Keyboard().text("⬅️ Назад к пользователям").resized() });
        ctx.session.state = "admin_panel_complaints_users";
        return;
    }
    const kb = new Keyboard();
    userComplaints.forEach((complaint: any, idx: number) => {
        const shortText = complaint.text.length > 20 ? complaint.text.slice(0, 20) + '...' : complaint.text;
        kb.text(`Жалоба #${complaint.id} (${shortText})`).row();
    });
    kb.text("⬅️ Назад к пользователям").resized();
    await ctx.reply('Выберите жалобу для просмотра:', { reply_markup: kb });
    ctx.session.state = `admin_panel_complaints_list_${userId}`;
});

// Обработчик кнопки '⬅️ Назад к пользователям' — возврат к списку пользователей с жалобами
bot.hears("⬅️ Назад к пользователям", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    const usersWithComplaints = await complaintService.getAllComplaintUsersWithActive();
    if (usersWithComplaints.length === 0) {
        await ctx.reply('Жалоб нет.', { reply_markup: new Keyboard().text("⬅️ Назад в админ-панель").resized() });
        ctx.session.state = "admin_panel_complaints_users";
        return;
    }
    const kb = new Keyboard();
    for (const { telegramId } of usersWithComplaints) {
        const user = await userService.getUser(telegramId);
        const name = user?.name ? ` (${user.name})` : '';
        const email = user?.email ? `, email: ${user.email}` : '';
        kb.text(`Пользователь #${telegramId}${name}${email}`).row();
    }
    kb.text("⬅️ Назад в админ-панель").resized();
    await ctx.reply('Выберите пользователя для просмотра жалоб:', { reply_markup: kb });
    ctx.session.state = "admin_panel_complaints_users";
});

export const startBot = () => {
    console.log('Bot starting');
    return bot.start();
};

// --- Валидация email ---
function isValidEmail(email: string): boolean {
    // Простой, но строгий паттерн
    return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// Функция для конвертации Markdown в HTML
function markdownToHtml(text: string): string {
    return text
        // Жирный текст: **text** -> <b>text</b>
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        // Курсив: *text* -> <i>text</i>
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        // Код: `text` -> <code>text</code>
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Ссылки: [text](url) -> <a href="url">text</a>
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        // Заголовки: # text -> <b>text</b>
        .replace(/^# (.*$)/gm, '<b>$1</b>')
        // Списки: - item -> • item
        .replace(/^- (.*$)/gm, '• $1')
        // Переносы строк
        .replace(/\n/g, '\n');
}

// Функция для безопасной отправки сообщений с HTML форматированием
async function sendMessageWithMarkdown(ctx: any, text: string, reply_markup?: any) {
    try {
        // Конвертируем Markdown в HTML
        const htmlText = markdownToHtml(text);
        await ctx.reply(htmlText, {
            parse_mode: 'HTML',
            reply_markup
        });
    } catch (error) {
        console.warn('⚠️ Ошибка при отправке с HTML, отправляем как обычный текст:', error);
        await ctx.reply(text, {
            reply_markup
        });
    }
}

// Обработчик кнопки "⬅️ Назад" - возврат в главное меню
bot.hears("⬅️ Назад", async (ctx) => {
    ctx.session.state = undefined;
    await ctx.reply("Главное меню:", { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
});