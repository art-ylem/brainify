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
    webapp.ready();
    webapp.expand();
  }
}
