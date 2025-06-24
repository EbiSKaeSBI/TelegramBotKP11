import { FAQ, Complaint } from './types';

// Пример базы FAQ (можно заменить на БД)
export const faqs: FAQ[] = [
    { question: "Как подать документы?", answer: "Документы подаются через сайт колледжа или лично в приемной комиссии." },
    { question: "Где узнать расписание?", answer: "Расписание доступно на сайте колледжа в разделе 'Студенту'." },
    // ... другие вопросы
];

// Пример базы жалоб (можно заменить на БД)
export let complaints: Complaint[] = [

];

export let professionStories: Complaint[] = [];

export let finishedComplaints: Complaint[] = [];

export let reviewedComplaints: Complaint[] = [];

// Список администраторов (ID пользователей Telegram)
export const ADMINS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [];

export const userNames: { [userId: number]: string } = {};

export const userEmails: { [userId: number]: string } = {}; 