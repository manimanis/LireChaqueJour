<template>
  <div class="d-flex flex-column min-vh-100 has-mobile-bottom-nav">
    <AppNavbar />
    <main class="flex-grow-1">
      <RouterView />
    </main>
    <footer class="border-top py-3 text-center small text-body-secondary bg-body-tertiary">
      <div class="container">
        Lire chaque jour v1.0 • Lecture quotidienne d'EPUB 100 % hors ligne
      </div>
    </footer>
    <MobileBottomNav />
    <WordDefinitionModal />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import AppNavbar from '@/components/AppNavbar.vue';
import MobileBottomNav from '@/components/MobileBottomNav.vue';
import WordDefinitionModal from '@/components/WordDefinitionModal.vue';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { startNotificationScheduler } from '@/services/notifications.js';

const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

let stopScheduler = null;

onMounted(async () => {
  settingsStore.applyTheme();
  await libraryStore.loadLibrary();

  stopScheduler = startNotificationScheduler(() => ({
    enabled: settingsStore.notificationsEnabled,
    time: settingsStore.notificationTime,
    hasPendingReading: libraryStore.hasPendingReadingToday,
    bookTitle: libraryStore.activeBook?.title,
  }));
});

onUnmounted(() => {
  stopScheduler?.();
});
</script>
