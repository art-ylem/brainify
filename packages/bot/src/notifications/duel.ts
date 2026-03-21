import { Bot, InlineKeyboard } from 'grammy';

const webappUrl = process.env.WEBAPP_URL ?? 'https://brinify.ellow.tech';

/**
 * Send a duel challenge notification to the opponent.
 * Called from the API after a duel is created.
 */
export async function notifyDuelChallenge(
  bot: Bot,
  opponentTelegramId: bigint,
  challengerName: string,
  duelId: number,
  taskName: string,
) {
  const keyboard = new InlineKeyboard().webApp(
    '🎯 Принять вызов',
    `${webappUrl}?startapp=duel_${duelId}`,
  );

  try {
    await bot.api.sendMessage(
      Number(opponentTelegramId),
      `⚔️ ${challengerName} вызывает тебя на дуэль!\n\nЗадание: ${taskName}\n\nПрими вызов и покажи, кто лучше!`,
      { reply_markup: keyboard },
    );
  } catch {
    // Opponent may have blocked the bot — silently ignore
  }
}

/**
 * Send duel result notification to both players.
 */
export async function notifyDuelResult(
  bot: Bot,
  challengerTelegramId: bigint,
  opponentTelegramId: bigint,
  challengerScore: number,
  opponentScore: number,
  challengerName: string,
  opponentName: string,
) {
  let challengerMsg: string;
  let opponentMsg: string;

  if (challengerScore > opponentScore) {
    challengerMsg = `🎉 Ты победил в дуэли с ${opponentName}! ${challengerScore} vs ${opponentScore}`;
    opponentMsg = `😔 ${challengerName} победил в дуэли. ${opponentScore} vs ${challengerScore}`;
  } else if (opponentScore > challengerScore) {
    challengerMsg = `😔 ${opponentName} победил в дуэли. ${challengerScore} vs ${opponentScore}`;
    opponentMsg = `🎉 Ты победил в дуэли с ${challengerName}! ${opponentScore} vs ${challengerScore}`;
  } else {
    challengerMsg = `🤝 Ничья в дуэли с ${opponentName}! Оба по ${challengerScore}`;
    opponentMsg = `🤝 Ничья в дуэли с ${challengerName}! Оба по ${opponentScore}`;
  }

  const keyboard = new InlineKeyboard().webApp('📊 Посмотреть', webappUrl);

  await Promise.allSettled([
    bot.api.sendMessage(Number(challengerTelegramId), challengerMsg, { reply_markup: keyboard }),
    bot.api.sendMessage(Number(opponentTelegramId), opponentMsg, { reply_markup: keyboard }),
  ]);
}
