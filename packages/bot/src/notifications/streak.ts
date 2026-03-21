import { Queue, Worker } from 'bullmq';
import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const API_HOST = process.env.API_HOST ?? 'localhost';
const API_PORT = process.env.API_PORT ?? '3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';
const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://brainify.ellow.tech';

const QUEUE_NAME = 'streak-notifications';

const connection = { url: REDIS_URL };

interface StreakAtRiskUser {
  telegramId: string;
  firstName: string;
  currentStreak: number;
}

export function setupStreakNotifications(bot: Bot) {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Check at 22:00 UTC — 2 hours before end of day
  queue.upsertJobScheduler(
    'streak-warning-scheduler',
    { pattern: '0 22 * * *' },
    { name: 'check-streak-at-risk' },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const users = await fetchStreakAtRiskUsers();

      const keyboard = new InlineKeyboard().webApp(
        '🧠 Потренироваться',
        WEBAPP_URL,
      );

      for (const user of users) {
        try {
          await bot.api.sendMessage(
            Number(user.telegramId),
            `🔥 ${user.firstName}, не потеряй серию из ${user.currentStreak} дней!\n\nОсталось 2 часа до конца дня — выполни хотя бы одно задание.`,
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
    console.error(`Streak notification job ${job?.id} failed:`, err.message);
  });

  return { queue, worker };
}

async function fetchStreakAtRiskUsers(): Promise<StreakAtRiskUser[]> {
  try {
    const response = await fetch(
      `http://${API_HOST}:${API_PORT}/api/internal/streak-at-risk`,
      {
        headers: {
          'X-Internal-Secret': INTERNAL_SECRET,
        },
      },
    );

    if (!response.ok) return [];
    return (await response.json()) as StreakAtRiskUser[];
  } catch {
    return [];
  }
}
