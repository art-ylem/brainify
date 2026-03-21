interface Props {
  t: (key: string) => string;
  score: number;
  taskName?: string;
}

export function ShareButton({ t, score, taskName }: Props) {
  function handleShare() {
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
    const botUsername = 'BrainifyBot'; // Replace with actual bot username
    const text = taskName
      ? `🧠 Я набрал ${score} очков в «${taskName}» на Brainify! Попробуй побить мой рекорд!`
      : `🧠 Я набрал ${score} очков в Brainify! Тренируй мозг каждый день!`;
    const shareUrl = `https://t.me/share/url?url=https://t.me/${botUsername}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }

  return (
    <button
      class="btn-primary"
      style={{
        background: 'var(--tg-theme-secondary-bg-color)',
        color: 'var(--tg-theme-text-color)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
      onClick={handleShare}
    >
      📤 {t('common.share')}
    </button>
  );
}
