/** Check if running inside Telegram Mini App */
export function isTelegramMiniApp(): boolean {
  return !!window.Telegram?.WebApp?.initData;
}

/** Access Telegram WebApp SDK */
export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

/** Get initData string for API auth */
export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? '';
}

/** Get current user from initData */
export function getTelegramUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user;
}

/** Get deep link start parameter */
export function getStartParam(): string | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.start_param;
}

/** Initialize WebApp */
export function initWebApp() {
  const webapp = getTelegramWebApp();
  if (webapp) {
    console.log('[TMA] Telegram WebApp SDK found');
    console.log('[TMA] initData present:', !!webapp.initData);
    console.log('[TMA] user present:', !!webapp.initDataUnsafe?.user);
    webapp.ready();
    webapp.expand();
  } else {
    console.log('[Web] Running in browser mode');
  }
}
