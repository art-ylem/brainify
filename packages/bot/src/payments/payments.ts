import type { Bot, Context } from 'grammy';
import { resolveLocale, t } from '@brainify/shared';

const SUBSCRIPTION_PRICE = 29900; // in smallest currency unit (29900 kopecks = 299 RUB)
const SUBSCRIPTION_DAYS = 30;
const CURRENCY = 'RUB';
const PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN ?? '';

export async function sendCardInvoice(ctx: Context) {
  if (!PROVIDER_TOKEN) {
    const locale = resolveLocale(ctx.from?.language_code);
    await ctx.reply(t(locale, 'bot.payments_not_configured'));
    return;
  }

  const locale = resolveLocale(ctx.from?.language_code);

  await ctx.replyWithInvoice(
    t(locale, 'bot.invoice_title'),
    t(locale, 'bot.invoice_description'),
    'brainify_premium_30d',
    CURRENCY,
    [{ label: t(locale, 'bot.invoice_label'), amount: SUBSCRIPTION_PRICE }],
    { provider_token: PROVIDER_TOKEN },
  );
}

export function registerPayments(bot: Bot) {
  // Handle /subscribe command — send invoice
  bot.command('subscribe', async (ctx) => {
    await sendCardInvoice(ctx);
  });

  // Pre-checkout — must answer within 10 seconds
  bot.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  // Successful payment — activate subscription
  bot.on('message:successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;
    const telegramId = ctx.from.id;
    const locale = resolveLocale(ctx.from?.language_code);

    // Call API to activate subscription
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
          provider: 'telegram_payments',
          paymentId: payment.telegram_payment_charge_id,
          durationDays: SUBSCRIPTION_DAYS,
        }),
      });

      if (response.ok) {
        await ctx.reply(t(locale, 'bot.payment_success'));
      } else {
        await ctx.reply(t(locale, 'bot.payment_error'));
      }
    } catch {
      await ctx.reply(t(locale, 'bot.payment_error'));
    }
  });
}
