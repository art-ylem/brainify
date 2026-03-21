import { Queue, Worker } from 'bullmq';
import type { Bot } from 'grammy';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const API_HOST = process.env.API_HOST ?? 'localhost';
const API_PORT = process.env.API_PORT ?? '3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

const QUEUE_NAME = 'leaderboard-notifications';

const connection = { url: REDIS_URL };

interface RankDropUser {
  telegramId: string;
  firstName: string;
  oldRank: number;
  newRank: number;
}

export function setupLeaderboardNotifications(bot: Bot) {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Check rank changes every 6 hours
  queue.upsertJobScheduler(
    'leaderboard-check-scheduler',
    { pattern: '0 */6 * * *' },
    { name: 'check-rank-drops' },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const drops = await fetchRankDrops();

      for (const user of drops) {
        try {
          await bot.api.sendMessage(
            Number(user.telegramId),
            `📉 ${user.firstName}, ты опустился в рейтинге с ${user.oldRank} на ${user.newRank} место!\n\nВернись и покажи результат! 💪`,
          );
        } catch {
          // User may have blocked the bot
        }
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`Leaderboard notification job ${job?.id} failed:`, err.message);
  });

  return { queue, worker };
}

async function fetchRankDrops(): Promise<RankDropUser[]> {
  try {
    const response = await fetch(
      `http://${API_HOST}:${API_PORT}/api/internal/rank-drops`,
      {
        headers: {
          'X-Internal-Secret': INTERNAL_SECRET,
        },
      },
    );

    if (!response.ok) return [];
    return (await response.json()) as RankDropUser[];
  } catch {
    return [];
  }
}
