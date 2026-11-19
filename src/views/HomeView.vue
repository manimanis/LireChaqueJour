<template>
  <div class="container py-4">
    <!-- Hero / Continue Reading -->
    <div class="row g-4 align-items-stretch mb-4">
      <div class="col-lg-8">
        <div v-if="activeBook" class="card h-100 shadow-sm border-0 bg-body-tertiary">
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div class="row g-4 align-items-center">
              <div class="col-4 col-sm-3">
                <div class="book-cover-wrapper shadow-sm">
                  <img
                    v-if="activeBook.cover"
                    :src="activeBook.cover"
                    :alt="activeBook.title"
                  />
                  <div v-else class="book-cover-placeholder">
                    <i class="bi bi-book fs-1"></i>
                  </div>
                </div>
              </div>

              <div class="col-8 col-sm-9">
                <span class="badge text-bg-primary mb-2">Lecture en cours</span>
                <h2 class="h4 fw-bold mb-1">{{ activeBook.title }}</h2>
                <p class="text-body-secondary mb-3">{{ activeBook.author }}</p>

                <div class="d-flex flex-wrap gap-3 small text-body-secondary mb-3">
                  <span>
                    <i class="bi bi-calendar-day me-1"></i>
                    Jour {{ activeProgress.currentSegment }} / {{ activeBook.totalSegments }}
                  </span>
                  <span>
                    <i class="bi bi-clock me-1"></i>
                    ~{{ estimatedMinutes }} min aujourd'hui
                  </span>
                  <span>
                    <i class="bi bi-check2-circle me-1"></i>
                    {{ activeProgress.completion }} % terminé
                  </span>
                </div>

                <div class="progress mb-3" style="height: 10px">
                  <div
                    class="progress-bar"
                    role="progressbar"
                    :style="{ width: `${activeProgress.completion}%` }"
                  ></div>
                </div>

                <div class="d-flex flex-wrap gap-2">
                  <RouterLink
                    :to="`/today/${activeBook.id}`"
                    class="btn btn-primary"
                  >
                    <i class="bi bi-book-half me-2"></i>Continuer la lecture
                  </RouterLink>
                  <RouterLink
                    :to="`/book/${activeBook.id}`"
                    class="btn btn-outline-secondary"
                  >
                    <i class="bi bi-sliders me-1"></i>Rythme & détails
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card h-100 shadow-sm border-0 bg-body-tertiary">
          <div class="card-body p-4 p-md-5 d-flex flex-column justify-content-center text-center">
            <i class="bi bi-journal-bookmark fs-1 text-primary mb-3"></i>
            <h1 class="h3 fw-bold mb-2">Bienvenue dans Lire chaque jour</h1>
            <p class="text-body-secondary mb-4 mx-auto" style="max-width: 520px">
              Importez un livre EPUB local pour le découper automatiquement en lectures quotidiennes adaptées à votre rythme, avec résumé intelligent des chapitres déjà lus.
            </p>
            <div>
              <button
                type="button"
                class="btn btn-primary btn-lg"
                @click="showImport = true"
              >
                <i class="bi bi-plus-circle me-2"></i>Ajouter mon premier livre
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats & Add Book -->
      <div class="col-lg-4 d-flex flex-column gap-3">
        <div class="card shadow-sm border-0">
          <div class="card-body p-3">
            <h6 class="text-body-secondary text-uppercase small fw-bold mb-3">
              Votre progression
            </h6>
            <div class="row g-2 text-center">
              <div class="col-4">
                <div class="p-2 rounded bg-body-tertiary">
                  <div class="fs-4 fw-bold text-primary">{{ libraryStore.books.length }}</div>
                  <div class="small text-body-secondary">Livres</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-body-tertiary">
                  <div class="fs-4 fw-bold text-success">{{ libraryStore.consecutiveDaysStreak }}</div>
                  <div class="small text-body-secondary">Jours suivis</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-body-tertiary">
                  <div class="fs-4 fw-bold text-info">{{ formattedWords }}</div>
                  <div class="small text-body-secondary">Mots lus</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 flex-grow-1">
          <div class="card-body p-3 d-flex flex-column justify-content-between">
            <div>
              <h6 class="fw-bold mb-1">
                <i class="bi bi-plus-circle text-primary me-2"></i>Ajouter un livre
              </h6>
              <p class="small text-body-secondary mb-3">
                Importez un fichier EPUB depuis votre ordinateur (100 % hors ligne).
              </p>
            </div>
            <div class="d-grid gap-2">
              <button
                type="button"
                class="btn btn-outline-primary"
                @click="showImport = !showImport"
              >
                <i class="bi bi-upload me-2"></i>
                {{ showImport ? 'Masquer l’import' : 'Importer un EPUB' }}
              </button>
              <RouterLink to="/library" class="btn btn-outline-secondary">
                <i class="bi bi-collection me-2"></i>Voir la bibliothèque
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Import Box -->
    <div v-if="showImport" class="mb-4">
      <ImportBookModal
        :show-close="true"
        @close="showImport = false"
        @imported="onBookImported"
      />
    </div>

    <!-- Recent Books in Library -->
    <div v-if="libraryStore.books.length > 0">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="h5 fw-bold mb-0">Bibliothèque récente</h3>
        <RouterLink to="/library" class="btn btn-sm btn-link text-decoration-none">
          Tout voir <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </div>

      <div class="row g-3">
        <div
          v-for="book in recentBooks"
          :key="book.id"
          class="col-md-6 col-xl-4"
        >
          <BookCard
            :book="book"
            :progress="libraryStore.getProgress(book.id)"
            @continue="continueBook"
            @reset="handleReset"
            @delete="handleDelete"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { estimateReadingMinutes } from '@/services/segmenter.js';
import ImportBookModal from '@/components/ImportBookModal.vue';
import BookCard from '@/components/BookCard.vue';

const router = useRouter();
const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const showImport = ref(false);

const activeBook = computed(() => libraryStore.activeBook);
const activeProgress = computed(() =>
  activeBook.value ? libraryStore.getProgress(activeBook.value.id) : null
);
const estimatedMinutes = computed(() =>
  activeBook.value ? estimateReadingMinutes(activeBook.value.wordsPerDay) : 0
);
const recentBooks = computed(() => libraryStore.books.slice(0, 3));

const formattedWords = computed(() => {
  const w = libraryStore.totalWordsRead;
  if (w >= 1000) return `${(w / 1000).toFixed(1)}k`;
  return String(w);
});

function onBookImported(book) {
  showImport.value = false;
  router.push(`/today/${book.id}`);
}

function continueBook(bookId) {
  settingsStore.currentBookId = bookId;
  router.push(`/today/${bookId}`);
}

async function handleReset(book) {
  if (confirm(`Réinitialiser la progression de « ${book.title} » ?`)) {
    await libraryStore.resetProgress(book.id);
  }
}

async function handleDelete(book) {
  if (confirm(`Supprimer définitivement « ${book.title} » de votre bibliothèque ?`)) {
    await libraryStore.deleteBook(book.id);
  }
}
</script>
