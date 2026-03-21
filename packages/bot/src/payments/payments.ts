import type { Bot } from 'grammy';

const SUBSCRIPTION_PRICE = 299; // in smallest currency unit (e.g. 299 RUB = 2.99)
const SUBSCRIPTION_DAYS = 30;
const CURRENCY = 'RUB';
const PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN ?? '';

export function registerPayments(bot: Bot) {
  // Handle /subscribe command — send invoice
  bot.command('subscribe', async (ctx) => {
    if (!PROVIDER_TOKEN) {
      await ctx.reply('Payments not configured.');
      return;
    }

    await ctx.replyWithInvoice(
      'Brainify Premium',
      'Полный доступ к тренировкам: без ограничений, дуэли, детальная статистика. 30 дней.',
      'brainify_premium_30d',
      CURRENCY,
      [{ label: 'Подписка на 30 дней', amount: SUBSCRIPTION_PRICE }],
      { provider_token: PROVIDER_TOKEN },
    );
  });

  // Pre-checkout — must answer within 10 seconds
  bot.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  // Successful payment — activate subscription
  bot.on('message:successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;
    const telegramId = ctx.from.id;

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
        await ctx.reply('🎉 Подписка активирована! Полный доступ на 30 дней.');
      } else {
        await ctx.reply('Оплата получена, но произошла ошибка активации. Обратитесь в поддержку.');
      }
    } catch {
      await ctx.reply('Оплата получена, но произошла ошибка активации. Обратитесь в поддержку.');
    }
  });
}
