import { Queue, Worker } from 'bullmq';
import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const API_HOST = process.env.API_HOST ?? 'localhost';
const API_PORT = process.env.API_PORT ?? '3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';
const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://brainify.ellow.tech';

const QUEUE_NAME = 'daily-reminders';

const connection = { url: REDIS_URL };

interface InactiveUser {
  telegramId: string;
  firstName: string;
  languageCode: string;
}

export function setupDailyReminders(bot: Bot) {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Schedule repeating job — every day at 10:00 UTC
  queue.upsertJobScheduler(
    'daily-reminder-scheduler',
    { pattern: '0 10 * * *' },
    { name: 'send-daily-reminders' },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const users = await fetchInactiveUsers();

      const keyboard = new InlineKeyboard().webApp(
        '🧠 Начать тренировку',
        WEBAPP_URL,
      );

      for (const user of users) {
        try {
          await bot.api.sendMessage(
            Number(user.telegramId),
            `👋 ${user.firstName}, ты давно не тренировался!\n\nПроведи 5 минут с пользой — поддержи мозг в форме.`,
            { reply_markup: keyboard },
          );
        } catch {
          // User may have blocked the bot
        }
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`Daily reminder job ${job?.id} failed:`, err.message);
  });

  return { queue, worker };
}

async function fetchInactiveUsers(): Promise<InactiveUser[]> {
  try {
    const response = await fetch(
      `http://${API_HOST}:${API_PORT}/api/internal/inactive-users`,
      {
        headers: {
          'X-Internal-Secret': INTERNAL_SECRET,
        },
      },
    );

    if (!response.ok) return [];
    return (await response.json()) as InactiveUser[];
  } catch {
    return [];
  }
}
