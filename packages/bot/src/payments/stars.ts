import type { Bot, Context } from 'grammy';
import { resolveLocale, t } from '@brainify/shared';

const STARS_PRICE = 50; // Telegram Stars
const SUBSCRIPTION_DAYS = 30;

export async function sendStarsInvoice(ctx: Context) {
  const locale = resolveLocale(ctx.from?.language_code);

  await ctx.replyWithInvoice(
    t(locale, 'bot.invoice_stars_title'),
    t(locale, 'bot.invoice_stars_description'),
    'brainify_premium_stars_30d',
    'XTR',
    [{ label: t(locale, 'bot.invoice_stars_label'), amount: STARS_PRICE }],
    { provider_token: '' },
  );
}

export function registerStarsPayments(bot: Bot) {
  bot.command('subscribe_stars', async (ctx) => {
    await sendStarsInvoice(ctx);
  });

  // Successful Stars payment — activate subscription
  bot.on('message:successful_payment', async (ctx, next) => {
    const payment = ctx.message.successful_payment;
    if (payment.currency !== 'XTR') {
      return next();
    }

    const telegramId = ctx.from.id;
    const locale = resolveLocale(ctx.from?.language_code);

    try {
      const apiHost = process.env.API_HOST ?? 'localhost';
      const apiPort = process.env.API_PORT ?? '3000';
      const response = await fetch(`http://${apiHost}:${apiPort}/api/internal/activate-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
        },
        body: JSON.stringify({
          telegramId: String(telegramId),
          provider: 'telegram_stars',
          paymentId: payment.telegram_payment_charge_id,
          durationDays: SUBSCRIPTION_DAYS,
        }),
      });

      if (response.ok) {
        await ctx.reply(t(locale, 'bot.payment_stars_success'));
      } else {
        await ctx.reply(t(locale, 'bot.payment_error'));
      }
    } catch {
      await ctx.reply(t(locale, 'bot.payment_error'));
    }
  });
}
