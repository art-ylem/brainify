import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import { Bot } from 'grammy';
import { registerStartCommand } from './commands/start.js';
import { registerQuickTaskCommand } from './commands/quick-task.js';
import { registerInviteCommand } from './commands/invite.js';
import { registerPayments } from './payments/payments.js';
import { registerStarsPayments } from './payments/stars.js';
import { setupDailyReminders } from './jobs/daily-reminder.js';
import { setupLeaderboardNotifications } from './notifications/leaderboard.js';
import { setupStreakNotifications } from './notifications/streak.js';
import { setupMenu } from './menu.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN environment variable is required');
}

const bot = new Bot(token);

// Register commands
registerStartCommand(bot);
registerQuickTaskCommand(bot);
registerInviteCommand(bot);

// Register payment handlers (Stars first — it calls next() for non-XTR payments)
registerStarsPayments(bot);
registerPayments(bot);

// Setup scheduled jobs
setupDailyReminders(bot);
setupLeaderboardNotifications(bot);
setupStreakNotifications(bot);

// Setup menu button
await setupMenu(bot);

// Set bot commands list
await bot.api.setMyCommands([
  { command: 'start', description: 'Start Brainify' },
  { command: 'train', description: 'Quick training in chat' },
  { command: 'invite', description: 'Invite a friend' },
  { command: 'subscribe', description: 'Оформить подписку Premium' },
]);

// Start
console.log('Brainify Bot started');
bot.start();
