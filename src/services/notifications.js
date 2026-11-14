const LAST_NOTIFIED_KEY = 'daily_reader_last_notification_date';

/**
 * Check if browser Notification API is supported.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission state.
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return await Notification.requestPermission();
}

/**
 * Display a local browser notification.
 * @param {string} title
 * @param {string} body
 */
export function showLocalNotification(title, body) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const iconUrl = `${import.meta.env.BASE_URL}favicon.svg`;
    new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'daily-reader-reminder',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a lightweight local timer that checks if the daily reading notification
 * should be triggered at the configured time.
 *
 * @param {() => { enabled: boolean, time: string, hasPendingReading: boolean, bookTitle?: string }} getState
 * @returns {() => void} cleanup function
 */
export function startNotificationScheduler(getState) {
  const checkAndNotify = () => {
    const { enabled, time, hasPendingReading, bookTitle } = getState();
    if (!enabled || !hasPendingReading) return;
    if (!isNotificationSupported() || Notification.permission !== 'granted') return;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_NOTIFIED_KEY) === todayStr) return;

    const [targetH, targetM] = (time || '20:00').split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = (targetH || 20) * 60 + (targetM || 0);

    if (currentMinutes >= targetMinutes) {
      const body = bookTitle
        ? `Votre lecture du jour pour « ${bookTitle} » est disponible.`
        : 'Votre lecture du jour est disponible.';
      const sent = showLocalNotification('Daily Reader', body);
      if (sent) {
        localStorage.setItem(LAST_NOTIFIED_KEY, todayStr);
      }
    }
  };

  checkAndNotify();
  const intervalId = setInterval(checkAndNotify, 30 * 1000);
  return () => clearInterval(intervalId);
}
