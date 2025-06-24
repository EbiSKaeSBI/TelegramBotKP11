// Типы для бота
import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
    isAdmin: boolean;
    state?: string;
    tempComplaint?: {
        userId: number;
        text?: string;
        files?: string[];
        date: Date;
        status: "new" | "reviewed" | "closed";
    };
    tempProfessionStory?: {
        userId: number;
        text?: string;
        files?: string[];
        date: Date;
        status: "new" | "reviewed" | "closed";
    };
}

export type FAQ = {
    question: string;
    answer: string;
};

export type Complaint = {
    userId: number;
    text: string;
    files?: string[];
    date: Date;
    status: "new" | "reviewed" | "closed";
};

export type MyContext = Context & SessionFlavor<SessionData>; 