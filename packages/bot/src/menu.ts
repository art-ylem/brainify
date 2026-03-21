import type { Bot } from 'grammy';

const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://brainify.app';

export async function setupMenu(bot: Bot) {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Brainify 🧠',
      web_app: { url: WEBAPP_URL },
    },
  });
}
