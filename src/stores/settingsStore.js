import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'daily_reader_settings';

const DEFAULT_SETTINGS = {
  fontFamily: 'Georgia',
  fontSize: 18,
  lineHeight: 1.7,
  theme: 'auto', // 'light' | 'dark' | 'auto'
  summaryLength: 'medium', // 'short' | 'medium' | 'long'
  defaultWordsPerDay: 400,
  defaultTolerance: 20,
  defaultReadWeekends: true,
  notificationsEnabled: false,
  notificationTime: '20:00',
  currentBookId: null,
};

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadSavedSettings();

  const fontFamily = ref(initial.fontFamily);
  const fontSize = ref(initial.fontSize);
  const lineHeight = ref(initial.lineHeight);
  const theme = ref(initial.theme);
  const summaryLength = ref(initial.summaryLength);
  const defaultWordsPerDay = ref(initial.defaultWordsPerDay);
  const defaultTolerance = ref(initial.defaultTolerance);
  const defaultReadWeekends = ref(initial.defaultReadWeekends);
  const notificationsEnabled = ref(initial.notificationsEnabled);
  const notificationTime = ref(initial.notificationTime);
  const currentBookId = ref(initial.currentBookId);

  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fontFamily: fontFamily.value,
          fontSize: fontSize.value,
          lineHeight: lineHeight.value,
          theme: theme.value,
          summaryLength: summaryLength.value,
          defaultWordsPerDay: defaultWordsPerDay.value,
          defaultTolerance: defaultTolerance.value,
          defaultReadWeekends: defaultReadWeekends.value,
          notificationsEnabled: notificationsEnabled.value,
          notificationTime: notificationTime.value,
          currentBookId: currentBookId.value,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  const applyTheme = () => {
    if (typeof document === 'undefined') return;
    let resolved = theme.value;
    if (resolved === 'auto') {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-bs-theme', resolved);
  };

  watch(
    [
      fontFamily,
      fontSize,
      lineHeight,
      theme,
      summaryLength,
      defaultWordsPerDay,
      defaultTolerance,
      defaultReadWeekends,
      notificationsEnabled,
      notificationTime,
      currentBookId,
    ],
    () => {
      persist();
      applyTheme();
    },
    { immediate: true }
  );

  // Listen to OS theme changes when theme is 'auto'
  if (typeof window !== 'undefined' && window.matchMedia) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (theme.value === 'auto') applyTheme();
      });
  }

  function resetToDefaults() {
    fontFamily.value = DEFAULT_SETTINGS.fontFamily;
    fontSize.value = DEFAULT_SETTINGS.fontSize;
    lineHeight.value = DEFAULT_SETTINGS.lineHeight;
    theme.value = DEFAULT_SETTINGS.theme;
    summaryLength.value = DEFAULT_SETTINGS.summaryLength;
    defaultWordsPerDay.value = DEFAULT_SETTINGS.defaultWordsPerDay;
    defaultTolerance.value = DEFAULT_SETTINGS.defaultTolerance;
    defaultReadWeekends.value = DEFAULT_SETTINGS.defaultReadWeekends;
    notificationsEnabled.value = DEFAULT_SETTINGS.notificationsEnabled;
    notificationTime.value = DEFAULT_SETTINGS.notificationTime;
  }

  return {
    fontFamily,
    fontSize,
    lineHeight,
    theme,
    summaryLength,
    defaultWordsPerDay,
    defaultTolerance,
    defaultReadWeekends,
    notificationsEnabled,
    notificationTime,
    currentBookId,
    applyTheme,
    resetToDefaults,
  };
});
