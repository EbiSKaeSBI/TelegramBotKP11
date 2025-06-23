import axios from 'axios';
import * as cheerio from 'cheerio';
import rateLimit from 'axios-rate-limit';

const http = rateLimit(axios.create(), { maxRequests: 2, perMilliseconds: 1000 });

export class CollegeSiteService {
    private baseUrl = 'https://kp11.mskobr.ru';
    private siteContent: { page: string; content: string }[] = [];
    private lastUpdate: Date | null = null;
    private updateInterval = 30 * 60 * 1000; // 30 минут

    private readonly importantPages = [
        // Основные разделы
        { path: '/', title: 'Главная', selector: '.main-content' },
        // О нас
        { path: '/o-nas', title: 'О колледже', selector: '.content-block' },
        { path: '/info_edu/managers', title: 'Руководство', selector: '.content-block' },
        { path: '/o-nas/pedagogicheskii-sostav', title: 'Педагогический состав', selector: '.content-block' },
        { path: '/o-nas/kontakty-podrazdelenij', title: 'Контакты подразделений', selector: '.content-block' },
        { path: '/o-nas/novosti', title: 'Новости', selector: '.content-block' },
        { path: '/o-nas/organy-upravleniya', title: 'Органы управления', selector: '.content-block' },
        { path: '/o-nas/organy-upravleniya/upravlyayushchij-sovet', title: 'Управляющий совет', selector: '.content-block' },
        { path: '/o-nas/organy-upravleniya/nablyudatelnyj-sovet', title: 'Наблюдательный совет', selector: '.content-block' },
        { path: '/o-nas/organy-upravleniya/pedagogicheskij-sovet', title: 'Педагогический совет', selector: '.content-block' },
        { path: '/o-nas/organy-upravleniya/obshchee-sobranie', title: 'Общее собрание', selector: '.content-block' },
        { path: '/o-nas/reviews/', title: 'Отзывы', selector: '.content-block' },
        { path: '/o-nas/nashi-dostizheniya', title: 'Наши достижения', selector: '.content-block' },
        { path: '/o-nas/nashi-dostizheniya/uchashchiesya', title: 'Достижения учащихся', selector: '.content-block' },
        { path: '/o-nas/nashi-dostizheniya/pedagogi', title: 'Достижения педогогов', selector: '.content-block' },
        { path: '/o-nas/nashi-dostizheniya/pobedy-organizacii', title: 'Победы организации', selector: '.content-block' },
        { path: '/o-nas/paid_services', title: 'Платные образовательные услуги', selector: '.content-block' },
        { path: '/o-nas/sotrudnichestvo-s-vuzami', title: 'Сотрудничество с вузами', selector: '.content-block' },
        { path: '/o-nas/results', title: 'Результативность обучения', selector: '.content-block' },
        { path: '/o-nas/sluzhby-oo', title: 'Службы образовательной организации', selector: '.content-block' },
        { path: '/o-nas/sluzhby-oo/uchebnaya-chast', title: 'Учебная часть', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn', title: 'Общественная жизнь', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/sport-club', title: 'Спортивный клуб', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/volunteer-dvizhenie', title: 'Волонтерское движение', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/gto-1698082354', title: 'ГТО', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/muzey-istoriya-ogranki-almazov-v-kolledje-predprinimatelstva-', title: 'Музей "История огранки алмазов в Колледже предпринимательства №11"', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/bessmertnyiy-polk-kp-11', title: 'Бессмертный полк КП №11', selector: '.content-block' },
        { path: '/o-nas/obshchestvennaya-zhizn/turisticheskiy-klub', title: 'Туристический клуб', selector: '.content-block' },
        { path: '/o-nas/photo-i-video', title: 'Фото и видео', selector: '.content-block' },
        { path: '/o-nas/photo-i-video/photo', title: 'Фотогалерея', selector: '.content-block' },
        { path: '/o-nas/smi-o-nas', title: 'СМИ о нас', selector: '.content-block' },

        // Поступление в колледж
        { path: '/postuplenie-v-kolledzh', title: 'Поступление в колледж', selector: '.content-block' },
        { path: '/postuplenie-v-kolledzh/priemnaya-komissiya', title: 'Приемная комиссия', selector: '.content-block' },
        { path: '/postuplenie-v-kolledzh/specialnosti-professii', title: 'Специальности/профессии', selector: '.content-block' },
        { path: '/postuplenie-v-kolledzh/vstupitelnye-ispytaniya', title: 'Вступительные испытания', selector: '.content-block' },
        { path: '/postuplenie-v-kolledzh/dni-otkrytyh-dverej', title: 'Дни открытых дверей', selector: '.content-block' },

        // Контакты и информация
        { path: '/contacts', title: 'Контакты', selector: '.content-block' },
        { path: '/feedback', title: 'Обратная связь', selector: '.content-block' },
        { path: '/anticorruption', title: 'Противодействие коррупции', selector: '.content-block' },
        { path: '/security', title: 'Безопасность', selector: '.content-block' }
    ];

    async initialize() {
        if (!this.lastUpdate || Date.now() - this.lastUpdate.getTime() > this.updateInterval) {
            await this.updateSiteContent();
        }
        return this.siteContent;
    }

    private cleanText(text: string): string {
        return text
            .replace(/\\s+/g, ' ')
            .replace(/\\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/\t+/g, ' ')
            .replace(/\r+/g, ' ')
            .replace(/\s+/g, ' ')  // Повторно убираем множественные пробелы
            .replace(/\s+([.,!?])/g, '$1')  // Убираем пробелы перед знаками препинания
            .replace(/([.,!?])\s+/g, '$1 ')  // Добавляем один пробел после знаков препинания
            .trim();
    }

    private async updateSiteContent() {
        this.siteContent = [];

        for (const page of this.importantPages) {
            try {
                const url = `${this.baseUrl}${page.path}`;
                const response = await http.get(url);
                const $ = cheerio.load(response.data);

                // Удаляем ненужные элементы
                $('script').remove();
                $('style').remove();
                $('.header').remove();
                $('.footer').remove();
                $('.sidebar').remove();
                $('.navigation').remove();
                $('.breadcrumbs').remove();
                $('.social-links').remove();
                $('iframe').remove();
                $('img').remove();
                $('.banner').remove();
                $('.advertisement').remove();
                $('.cookie-notice').remove();
                $('noscript').remove();
                $('meta').remove();
                $('link').remove();

                // Собираем текст из основного контента
                let mainContent = '';

                // Пытаемся найти контент по селектору
                const contentBlock = $(page.selector);
                if (contentBlock.length > 0) {
                    // Собираем текст из всех параграфов и списков
                    contentBlock.find('p, li, h1, h2, h3, h4, h5, h6, table td, table th').each((_, el) => {
                        const text = $(el).text().trim();
                        if (text) {
                            mainContent += text + ' ';
                        }
                    });
                } else {
                    // Если не нашли по селектору, берем весь контент body
                    mainContent = $('body').text();
                }

                // Извлекаем заголовки
                const headers = $('h1, h2, h3')
                    .map((_, el) => $(el).text().trim())
                    .get()
                    .filter(text => text.length > 0)
                    .join(' | ');

                // Извлекаем важные данные из таблиц
                const tableData = $('table').map((_, table) => {
                    const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
                    const rows = $(table).find('tr').map((_, tr) => {
                        return $(tr).find('td').map((_, td) => $(td).text().trim()).get();
                    }).get();
                    return { headers, rows };
                }).get();

                if (mainContent) {
                    // Очищаем текст
                    mainContent = this.cleanText(mainContent);

                    // Ограничиваем размер контента, но сохраняем важную информацию
                    const maxLength = 3000;
                    if (mainContent.length > maxLength) {
                        mainContent = mainContent.slice(0, maxLength) + '...';
                    }

                    let content = '';
                    if (headers) {
                        content += `Заголовки: ${headers}\n\n`;
                    }

                    content += `Содержание: ${mainContent}\n\n`;

                    // Добавляем данные из таблиц, если они есть
                    if (tableData.length > 0) {
                        content += 'Данные из таблиц:\n';
                        tableData.forEach(table => {
                            if (table.headers.length > 0) {
                                content += `Заголовки таблицы: ${table.headers.join(' | ')}\n`;
                            }
                            if (table.rows.length > 0) {
                                content += `Данные: ${table.rows.join(' | ')}\n`;
                            }
                        });
                    }

                    this.siteContent.push({
                        page: page.title,
                        content: content
                    });
                }

                // Добавляем небольшую задержку между запросами
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Error fetching ${page.path}:`, error);
            }
        }

        this.lastUpdate = new Date();
    }

    getContextForPrompt(userQuestion: string): string {
        // Находим наиболее релевантные разделы для вопроса
        const relevantPages = this.findRelevantPages(userQuestion);
        
        // Добавляем информацию о приемной комиссии
        const admissionOfficeInfo = `
Важная информация о приемной комиссии КП №11:

📍 Адрес приемной комиссии:
м. Войковская, Ленинградское шоссе д.13А

📱 Контактный телефон:
+7 (499) 150-45-04

⏰ График работы приемной комиссии:
Понедельник - пятница: с 09:00 до 20:00
Суббота: с 10:00 до 18:00
`;
        
        // Формируем системный промпт для GigaChat
        const systemPrompt = `Ты - официальный ассистент Колледжа предпринимательства №11 (КП №11).
Твоя задача - предоставлять точную информацию о колледже на основе данных с официального сайта kp11.mskobr.ru.

${admissionOfficeInfo}

Важные правила:
1. Используй ТОЛЬКО информацию из предоставленного контекста
2. Если в контексте нет информации для ответа, скажи об этом и предложи:
   - Посетить официальный сайт колледжа: kp11.mskobr.ru
   - Позвонить в приемную комиссию: +7 (499) 150-45-04
   - Обратиться к администрации колледжа
3. Отвечай кратко, четко и по существу
4. Не придумывай информацию, которой нет в контексте
5. Если информация может быть устаревшей, обязательно предложи проверить актуальные данные на сайте
6. При ответе на вопросы о поступлении, всегда указывай текущий год
7. Если спрашивают про конкретные даты или цифры, рекомендуй проверить актуальную информацию на сайте

Релевантная информация с сайта колледжа:
${relevantPages.map(page => `=== ${page.page} ===\n${page.content}`).join('\n\n')}

Вопрос: ${userQuestion}

Ответь на вопрос, используя ТОЛЬКО предоставленную выше информацию.`;

        return systemPrompt;
    }

    private findRelevantPages(question: string): Array<{ page: string; content: string }> {
        const questionLower = question.toLowerCase();
        
        // Определяем тип для категорий
        type CategoryKey = 'поступление' | 'образование' | 'студенты' | 'контакты' | 'о колледже' | 'сведения' | 'приемная комиссия';
        
        // Ключевые слова для каждой категории
        const keywords: Record<CategoryKey, string[]> = {
            'поступление': [
                'поступить', 'поступление', 'абитуриент', 'документы', 'прием', 'специальность',
                'приемная комиссия', 'вступительные', 'экзамены', 'зачисление', 'проходной балл'
            ],
            'образование': [
                'учеба', 'обучение', 'программа', 'специальность', 'направление', 'дистанционное',
                'очное', 'заочное', 'практика', 'стажировка', 'диплом', 'квалификация'
            ],
            'студенты': [
                'студент', 'расписание', 'занятия', 'экзамен', 'сессия', 'общежитие',
                'стипендия', 'библиотека', 'спорт', 'мероприятия', 'практика'
            ],
            'контакты': [
                'контакт', 'телефон', 'адрес', 'почта', 'связь', 'email', 'написать',
                'обратиться', 'приемная', 'задать вопрос', 'график работы', 'часы работы'
            ],
            'о колледже': [
                'колледж', 'история', 'преподаватель', 'педагог', 'достижения', 'награды',
                'руководство', 'директор', 'структура', 'подразделения'
            ],
            'сведения': [
                'лицензия', 'аккредитация', 'документы', 'устав', 'положение', 'стандарт',
                'материальная база', 'финансы', 'отчет', 'вакансии', 'международный'
            ],
            'приемная комиссия': [
                'приемная комиссия', 'график работы', 'часы работы', 'режим работы',
                'телефон приемной', 'адрес приемной', 'как добраться', 'где находится',
                'войковская', 'ленинградское шоссе'
            ]
        };

        // Находим релевантные страницы
        const relevantCategories = new Set<CategoryKey>();
        let maxKeywordMatches = 0;

        // Проверяем каждую категорию ключевых слов и считаем совпадения
        for (const [category, words] of Object.entries(keywords) as [CategoryKey, string[]][]) {
            const matches = words.filter(word => questionLower.includes(word)).length;
            if (matches > 0) {
                relevantCategories.add(category);
                maxKeywordMatches = Math.max(maxKeywordMatches, matches);
            }
        }

        // Если нашли релевантные категории, выбираем соответствующие страницы
        if (relevantCategories.size > 0) {
            const relevantPages = this.siteContent.filter(page => {
                // Проверяем соответствие категории
                return Array.from(relevantCategories).some(category => {
                    const pageLower = page.page.toLowerCase();
                    return pageLower.includes(category) ||
                        // Проверяем ключевые слова категории в заголовке страницы
                        keywords[category].some((word: string) => pageLower.includes(word));
                });
            });

            // Добавляем главную страницу, если нашли мало страниц
            if (relevantPages.length < 2) {
                const mainPage = this.siteContent.find(page => page.page === 'Главная');
                if (mainPage) relevantPages.push(mainPage);
            }

            return relevantPages;
        }

        // Если не нашли релевантных страниц, возвращаем главную и общую информацию
        return this.siteContent.filter(page =>
            page.page === 'Главная' ||
            page.page === 'О колледже' ||
            page.page === 'Сведения об образовательной организации'
        );
    }
}

export const collegeSiteService = new CollegeSiteService(); 