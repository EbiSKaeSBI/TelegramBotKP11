import { session, NextFunction, Bot } from 'grammy';
import { ADMINS } from './constants';
import { MyContext } from './types';

export const sessionMiddleware = session({
    initial: () => ({
        isAdmin: false
    })
});

export const adminCheckMiddleware = async (ctx: MyContext, next: NextFunction) => {
    if (ctx.from?.id) {
        ctx.session.isAdmin = ADMINS.includes(ctx.from.id);
    }
    await next();
};

export const errorHandler = (bot: Bot<MyContext>) => {
    bot.catch((err: unknown) => {
        console.error('Error in middleware while handling update', err);
    });
}; 