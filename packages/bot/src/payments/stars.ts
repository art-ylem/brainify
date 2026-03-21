import type { Bot } from 'grammy';

const STARS_PRICE = 50; // Telegram Stars
const SUBSCRIPTION_DAYS = 30;

export function registerStarsPayments(bot: Bot) {
  bot.command('subscribe_stars', async (ctx) => {
    await ctx.replyWithInvoice(
      'Brainify Premium ⭐',
      'Полный доступ к тренировкам: без ограничений, дуэли, детальная статистика. 30 дней.',
      'brainify_premium_stars_30d',
      'XTR',
      [{ label: 'Подписка (Stars)', amount: STARS_PRICE }],
      { provider_token: '' },
    );
  });

  // Successful Stars payment — activate subscription
  bot.on('message:successful_payment', async (ctx, next) => {
    const payment = ctx.message.successful_payment;
    if (payment.currency !== 'XTR') {
      return next();
    }

    const telegramId = ctx.from.id;

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
        await ctx.reply('🎉 Подписка активирована через Stars! Полный доступ на 30 дней.');
      } else {
        await ctx.reply('Оплата получена, но произошла ошибка активации. Обратитесь в поддержку.');
      }
    } catch {
      await ctx.reply('Оплата получена, но произошла ошибка активации. Обратитесь в поддержку.');
    }
  });
}
