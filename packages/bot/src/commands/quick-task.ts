import type { Bot } from 'grammy';
import { resolveLocale, t, arithmeticTask } from '@brainify/shared';

/** In-memory store for pending quick tasks: chatId:messageId → correctAnswer */
const pendingTasks = new Map<string, number>();

/** Auto-cleanup after 5 min */
function storeTask(key: string, answer: number) {
  pendingTasks.set(key, answer);
  setTimeout(() => pendingTasks.delete(key), 5 * 60 * 1000);
}

export function registerQuickTaskCommand(bot: Bot) {
  bot.command('train', async (ctx) => {
    const locale = resolveLocale(ctx.from?.language_code);

    // Generate an arithmetic task (easiest to do inline in chat)
    const generated = arithmeticTask.generate({ difficulty: 1 });
    const problem = generated.data.problems[0];

    const taskName = t(locale, 'tasks.arithmetic.name');

    const sent = await ctx.reply(
      `🧮 *${taskName}*\n\n\`${problem.expression} = ?\``,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: buildAnswerButtons(problem.correctAnswer),
        },
      },
    );

    storeTask(`${ctx.chat.id}:${sent.message_id}`, problem.correctAnswer);
  });

  // Handle button callback
  bot.callbackQuery(/^qt:(.+)$/, async (ctx) => {
    const locale = resolveLocale(ctx.from?.language_code);
    const selectedAnswer = Number(ctx.match[1]);

    const msg = ctx.callbackQuery.message;
    if (!msg) {
      await ctx.answerCallbackQuery();
      return;
    }

    const key = `${msg.chat.id}:${msg.message_id}`;
    const correctAnswer = pendingTasks.get(key);

    if (correctAnswer === undefined) {
      await ctx.answerCallbackQuery({ text: '⏰' });
      return;
    }

    pendingTasks.delete(key);

    const isCorrect = selectedAnswer === correctAnswer;
    const emoji = isCorrect ? '✅' : '❌';
    const resultText = isCorrect
      ? t(locale, 'common.ready')
      : `${t(locale, 'common.error')}: ${correctAnswer}`;

    await ctx.editMessageText(`${emoji} ${resultText}`, {
      reply_markup: undefined,
    });
    await ctx.answerCallbackQuery();
  });
}

function buildAnswerButtons(correctAnswer: number) {
  // Generate 3 wrong answers and shuffle with correct one
  const options = new Set<number>([correctAnswer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = correctAnswer + (offset === 0 ? 1 : offset);
    options.add(wrong);
  }

  const shuffled = [...options].sort(() => Math.random() - 0.5);

  return [
    shuffled.map((opt) => ({
      text: String(opt),
      callback_data: `qt:${opt}`,
    })),
  ];
}
