import { pgTable, text, integer, timestamp, boolean, bigint, pgEnum, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';

// --- Enums ---

export const taskCategoryEnum = pgEnum('task_category', ['memory', 'attention', 'logic', 'speed']);

export const taskTypeEnum = pgEnum('task_type', [
  'schulte',
  'sequence_memory',
  'arithmetic',
  'stroop',
  'number_series',
  'memory_pairs',
  'pattern_search',
]);

export const duelStatusEnum = pgEnum('duel_status', [
  'pending',
  'accepted',
  'completed',
  'expired',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'completed',
  'expired',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'free',
]);

// --- Tables ---

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull().unique(),
  username: text('username'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  languageCode: text('language_code').default('en').notNull(),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial').notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: taskTypeEnum('type').notNull(),
  category: taskCategoryEnum('category').notNull(),
  name: text('name').notNull(),
  descriptionKey: text('description_key').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('tasks_type_idx').on(table.type),
]);

export const taskAttempts = pgTable('task_attempts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  sessionId: integer('session_id').references(() => taskSessions.id),
  score: integer('score').notNull(),
  timeMs: integer('time_ms').notNull(),
  difficulty: integer('difficulty').default(1).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('task_attempts_user_idx').on(table.userId),
  index('task_attempts_completed_idx').on(table.completedAt),
]);

export const taskSessions = pgTable('task_sessions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  taskType: taskTypeEnum('task_type').notNull(),
  difficulty: integer('difficulty').default(1).notNull(),
  generatedData: jsonb('generated_data').notNull(),
  status: sessionStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('task_sessions_user_status_idx').on(table.userId, table.status),
]);

export const friendships = pgTable('friendships', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  friendId: integer('friend_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('friendships_pair_idx').on(table.userId, table.friendId),
]);

export const duels = pgTable('duels', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  challengerId: integer('challenger_id').notNull().references(() => users.id),
  opponentId: integer('opponent_id').notNull().references(() => users.id),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  status: duelStatusEnum('status').default('pending').notNull(),
  challengerScore: integer('challenger_score'),
  opponentScore: integer('opponent_score'),
  challengerTimeMs: integer('challenger_time_ms'),
  opponentTimeMs: integer('opponent_time_ms'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('duels_challenger_idx').on(table.challengerId),
  index('duels_opponent_idx').on(table.opponentId),
]);

export const subscriptions = pgTable('subscriptions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  status: subscriptionStatusEnum('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  paymentProvider: text('payment_provider'),
  paymentId: text('payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('subscriptions_user_idx').on(table.userId),
]);

export const referrals = pgTable('referrals', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  referrerId: integer('referrer_id').notNull().references(() => users.id),
  referredId: integer('referred_id').notNull().references(() => users.id),
  bonusApplied: boolean('bonus_applied').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('referrals_referred_idx').on(table.referredId),
]);

export const achievements = pgTable('achievements', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id),
  achievementType: text('achievement_type').notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('achievements_user_type_idx').on(table.userId, table.achievementType),
]);

export const streaks = pgTable('streaks', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActivityDate: timestamp('last_activity_date', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
