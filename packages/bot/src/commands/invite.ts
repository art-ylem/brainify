import type { Bot } from 'grammy';
import { resolveLocale, t } from '@brainify/shared';

export function registerInviteCommand(bot: Bot) {
  bot.command('invite', async (ctx) => {
    const locale = resolveLocale(ctx.from?.language_code);
    const userId = ctx.from?.id;

    if (!userId) return;

    const botInfo = await bot.api.getMe();
    const inviteLink = `https://t.me/${botInfo.username}?start=ref_${userId}`;

    const inviteText = t(locale, 'bot.invite_text');

    await ctx.reply(`${inviteText}\n\n${inviteLink}`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(locale, 'bot.invite_button'),
              url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(inviteText)}`,
            },
          ],
        ],
      },
    });
  });
}
