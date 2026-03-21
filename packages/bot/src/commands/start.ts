import type { Bot } from 'grammy';
import { resolveLocale, t } from '@brainify/shared';

const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://brainify.app';

export function registerStartCommand(bot: Bot) {
  bot.command('start', async (ctx) => {
    const locale = resolveLocale(ctx.from?.language_code);
    const payload = ctx.match; // deep link parameter

    // Check if this is a referral link (ref_<userId>)
    let welcomeKey = 'bot.welcome';
    if (payload && payload.startsWith('ref_')) {
      welcomeKey = 'bot.welcome_referral';
      // Referral processing will be handled by API when user opens the app
    }

    const welcomeText = t(locale, welcomeKey);
    const openAppText = t(locale, 'bot.open_app');

    await ctx.reply(welcomeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: `${openAppText} 🧠`, web_app: { url: WEBAPP_URL } }],
        ],
      },
    });
  });
}
