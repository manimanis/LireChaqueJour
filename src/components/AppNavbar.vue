<template>
  <nav class="navbar navbar-expand-md border-bottom sticky-top bg-body-tertiary">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2 fw-bold" to="/">
        <img
          :src="logoUrl"
          alt=""
          width="28"
          height="28"
          class="rounded-2 shadow-sm flex-shrink-0"
        />
        <span>Lire chaque jour</span>
      </RouterLink>

      <div class="d-flex align-items-center gap-2 order-lg-last">
        <span
          class="badge rounded-pill d-none d-sm-inline-flex align-items-center gap-1"
          :class="isOnline ? 'text-bg-success-subtle text-success-emphasis border border-success-subtle' : 'text-bg-secondary'"
          :title="isOnline ? 'Application prête hors ligne (PWA)' : 'Mode hors ligne actif'"
        >
          <i class="bi" :class="isOnline ? 'bi-wifi' : 'bi-wifi-off'"></i>
          <span>{{ isOnline ? 'Offline prêt' : 'Hors ligne' }}</span>
        </span>

        <button
          v-if="installPromptEvent"
          type="button"
          class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
          @click="triggerInstall"
        >
          <i class="bi bi-download"></i>
          <span class="d-none d-md-inline">Installer</span>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :title="`Thème : ${themeLabel}`"
          @click="cycleTheme"
        >
          <i class="bi" :class="themeIcon"></i>
        </button>

        <button
          class="navbar-toggler d-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Menu de navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
      </div>

      <div id="mainNavbar" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/">
              <i class="bi bi-house me-1"></i>Accueil
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/today">
              <i class="bi bi-sun me-1"></i>Aujourd'hui
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/library">
              <i class="bi bi-collection me-1"></i>Bibliothèque
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/vocabulary">
              <i class="bi bi-journal-bookmark me-1"></i>Vocabulaire
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/stats">
              <i class="bi bi-bar-chart-line me-1"></i>Statistiques
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active fw-semibold" to="/settings">
              <i class="bi bi-gear me-1"></i>Paramètres
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore.js';

const settingsStore = useSettingsStore();
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`;
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const installPromptEvent = ref(null);

const themeIcon = computed(() => {
  if (settingsStore.theme === 'dark') return 'bi-moon-stars-fill';
  if (settingsStore.theme === 'light') return 'bi-sun-fill';
  return 'bi-circle-half';
});

const themeLabel = computed(() => {
  if (settingsStore.theme === 'dark') return 'Sombre';
  if (settingsStore.theme === 'light') return 'Clair';
  return 'Automatique';
});

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const idx = order.indexOf(settingsStore.theme);
  settingsStore.theme = order[(idx + 1) % order.length];
}

async function triggerInstall() {
  if (!installPromptEvent.value) return;
  installPromptEvent.value.prompt();
  await installPromptEvent.value.userChoice;
  installPromptEvent.value = null;
}

const handleOnline = () => {
  isOnline.value = true;
};
const handleOffline = () => {
  isOnline.value = false;
};
const handleBeforeInstallPrompt = (e) => {
  e.preventDefault();
  installPromptEvent.value = e;
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});
</script>
