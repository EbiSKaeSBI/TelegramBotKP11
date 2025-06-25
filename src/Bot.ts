import { Bot, session, Keyboard, InputFile } from 'grammy';
import * as dotenv from "dotenv";
dotenv.config();

// Основные переменные и типы
import { processUserMessage } from './services/flowise-ai';
import { faqs, complaints, ADMINS, professionStories, userNames, userEmails, finishedComplaints, reviewedComplaints } from './constants';
import { SessionData, FAQ, Complaint, MyContext } from './types';
import { sessionMiddleware, adminCheckMiddleware, errorHandler } from './middleware';
import * as complaintService from './services/complaints';
import * as userService from './services/users';

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
    await ctx.reply("Главное меню:", { reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id) });
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

// Просмотр жалоб (теперь по userId)
bot.hears("📋 Жалобы", async (ctx) => {
    if (!ctx.session.isAdmin || ctx.session.state !== "admin_panel") return;
    const usersWithComplaints = await complaintService.getAllComplaintUsers();
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
    const userComplaints = await complaintService.getUserComplaints(userId);
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
    const userComplaints = await complaintService.getUserComplaints(userId);
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
    const userComplaints = await complaintService.getUserComplaints(userId);
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
    const userComplaints = await complaintService.getUserComplaints(userId);
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
    const usersWithComplaints = await complaintService.getAllComplaintUsers();
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

// Жалоба/предложение с лимитом на одну активную жалобу
bot.hears("✉️ Жалоба/Предложение", async (ctx) => {
    if (!ctx.from?.id) return;
    const userId = ctx.from.id;
    // Регистрируем пользователя, если его нет
    await userService.upsertUser(userId);
    const activeComplaints = await complaintService.getActiveComplaints(userId);
    if (activeComplaints.length > 0) {
        await ctx.reply("Ваша жалоба ещё не рассмотрена. Вы сможете отправить новую, когда администратор закроет предыдущую.", {
            reply_markup: await mainMenu(ctx.session.isAdmin, ctx.from?.id)
        });
        return;
    }
    const user = await userService.getUser(userId);
    if (!user?.name) {
        ctx.session.state = "awaiting_name_for_complaint";
        await ctx.reply("Пожалуйста, укажите, как к вам обращаться (ФИО):", {
            reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized()
        });
        return;
    }
    if (!user?.email) {
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

// AI-поиск: обработка текстового сообщения в режиме поиска
bot.on("message:text", async (ctx, next) => {
    if (ctx.session.state === 'search') {
        await ctx.reply('Подождите, сейчас отвечу...');
        const answer = await processUserMessage(ctx.message.text);
        await ctx.reply(answer, { reply_markup: new Keyboard().text("⬅️ Выйти в меню").resized() });
        ctx.session.state = undefined;
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

    await next();
});

// Обработчик кнопки '⬅️ Назад в админ-панель' — возврат в админ-панель
bot.hears("⬅️ Назад в админ-панель", async (ctx) => {
    if (!ctx.session.isAdmin) return;
    ctx.session.state = "admin_panel";
    await ctx.reply("Админ-панель:", { reply_markup: adminPanelMenu() });
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