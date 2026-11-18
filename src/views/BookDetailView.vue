<template>
  <div class="container py-4">
    <div v-if="!book" class="text-center py-5">
      <i class="bi bi-book fs-1 text-body-secondary d-block mb-3"></i>
      <h5>Livre introuvable</h5>
      <RouterLink to="/library" class="btn btn-primary mt-2">
        Retour à la bibliothèque
      </RouterLink>
    </div>

    <div v-else>
      <div class="mb-3">
        <RouterLink to="/library" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i>Bibliothèque
        </RouterLink>
      </div>

      <div class="row g-4">
        <!-- Book Info -->
        <div class="col-lg-4">
          <div class="card shadow-sm border-0">
            <div class="card-body p-4 text-center">
              <div class="book-cover-wrapper mx-auto mb-3" style="max-width: 190px">
                <img v-if="book.cover" :src="book.cover" :alt="book.title" />
                <div v-else class="book-cover-placeholder">
                  <i class="bi bi-book fs-1"></i>
                </div>
              </div>

              <h1 class="h4 fw-bold mb-1">{{ book.title }}</h1>
              <p class="text-body-secondary mb-3">{{ book.author }}</p>

              <div class="d-grid gap-2 mb-3">
                <RouterLink :to="`/today/${book.id}`" class="btn btn-primary">
                  <i class="bi bi-book-half me-2"></i>Lire maintenant
                </RouterLink>
                <RouterLink :to="`/vocabulary?bookId=${book.id}`" class="btn btn-outline-secondary">
                  <i class="bi bi-journal-bookmark me-2"></i>Vocabulaire du livre
                </RouterLink>
              </div>

              <ul class="list-group list-group-flush text-start small">
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-body-secondary">Nombre total de mots</span>
                  <span class="fw-semibold">{{ book.totalWords.toLocaleString('fr-FR') }}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-body-secondary">Segments (jours)</span>
                  <span class="fw-semibold">{{ book.totalSegments }}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-body-secondary">Temps total estimé</span>
                  <span class="fw-semibold">{{ totalHoursText }}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-body-secondary">Chapitres détectés</span>
                  <span class="fw-semibold">{{ book.chapters?.length || 0 }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Progression & Rhythm Config -->
        <div class="col-lg-8 d-flex flex-column gap-4">
          <div class="card shadow-sm border-0">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-3">
                <i class="bi bi-graph-up text-primary me-2"></i>Progression
              </h5>

              <div class="row g-3 mb-3 text-center">
                <div class="col-4">
                  <div class="p-3 rounded bg-body-tertiary">
                    <div class="fs-4 fw-bold text-primary">
                      {{ progress.currentSegment }} / {{ book.totalSegments }}
                    </div>
                    <div class="small text-body-secondary">Jour courant</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="p-3 rounded bg-body-tertiary">
                    <div class="fs-4 fw-bold text-success">{{ progress.finishedSegments }}</div>
                    <div class="small text-body-secondary">Segments lus</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="p-3 rounded bg-body-tertiary">
                    <div class="fs-4 fw-bold text-info">{{ progress.completion }} %</div>
                    <div class="small text-body-secondary">Avancement</div>
                  </div>
                </div>
              </div>

              <div class="progress mb-3" style="height: 10px">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: `${progress.completion}%` }"
                ></div>
              </div>

              <div class="d-flex justify-content-between align-items-center">
                <span class="small text-body-secondary">
                  Dernière lecture :
                  {{
                    progress.lastReadingDate
                      ? new Date(progress.lastReadingDate).toLocaleDateString('fr-FR')
                      : 'Pas encore commencée'
                  }}
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-warning"
                  @click="handleReset"
                >
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Réinitialiser
                </button>
              </div>
            </div>
          </div>

          <div class="card shadow-sm border-0">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-3">
                <i class="bi bi-sliders text-primary me-2"></i>Configurer le rythme de lecture
              </h5>

              <form @submit.prevent="saveRhythm">
                <div class="row g-3 mb-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      Mots par jour (100 – 5000)
                    </label>
                    <input
                      v-model.number="wordsPerDay"
                      type="number"
                      min="100"
                      max="5000"
                      step="25"
                      class="form-control"
                      required
                    />
                    <div class="form-text">
                      Durée estimée : ~{{ Math.ceil(book.totalWords / Math.max(100, wordsPerDay)) }} jours
                    </div>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      Tolérance (± mots)
                    </label>
                    <input
                      v-model.number="tolerance"
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      class="form-control"
                      required
                    />
                    <div class="form-text">
                      Intervalle : {{ Math.max(100, wordsPerDay - tolerance) }} à {{ wordsPerDay + tolerance }} mots
                    </div>
                  </div>
                </div>

                <div class="form-check form-switch mb-3">
                  <input
                    id="detailReadWeekends"
                    v-model="readWeekends"
                    class="form-check-input"
                    type="checkbox"
                  />
                  <label class="form-check-label" for="detailReadWeekends">
                    Lecture le week-end
                  </label>
                </div>

                <div v-if="savedMessage" class="alert alert-success py-2 px-3 small">
                  <i class="bi bi-check-circle-fill me-2"></i>{{ savedMessage }}
                </div>

                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="isSaving"
                >
                  <span
                    v-if="isSaving"
                    class="spinner-border spinner-border-sm me-2"
                  ></span>
                  Recalculer le découpage
                </button>
              </form>
            </div>
          </div>

          <div v-if="book.chapters?.length" class="card shadow-sm border-0">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-3">
                <i class="bi bi-list-ol text-primary me-2"></i>Chapitres ({{ book.chapters.length }})
              </h5>
              <div class="list-group list-group-flush" style="max-height: 260px; overflow-y: auto">
                <div
                  v-for="(ch, i) in book.chapters"
                  :key="i"
                  class="list-group-item d-flex justify-content-between align-items-center px-0 small"
                >
                  <span class="text-truncate me-3">{{ ch.title }}</span>
                  <span class="badge text-bg-secondary rounded-pill">
                    {{ ch.wordCount.toLocaleString('fr-FR') }} mots
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { estimateReadingMinutes } from '@/services/segmenter.js';

const route = useRoute();
const libraryStore = useLibraryStore();

const book = computed(() =>
  libraryStore.books.find((b) => b.id === route.params.id)
);
const progress = computed(() =>
  book.value ? libraryStore.getProgress(book.value.id) : null
);

const wordsPerDay = ref(400);
const tolerance = ref(20);
const readWeekends = ref(true);
const isSaving = ref(false);
const savedMessage = ref('');

watch(
  book,
  (b) => {
    if (b) {
      wordsPerDay.value = b.wordsPerDay || 400;
      tolerance.value = b.tolerance ?? 20;
      readWeekends.value = b.readWeekends ?? true;
    }
  },
  { immediate: true }
);

const totalHoursText = computed(() => {
  if (!book.value) return '';
  const mins = estimateReadingMinutes(book.value.totalWords);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} min`;
});

async function saveRhythm() {
  if (!book.value) return;
  isSaving.value = true;
  savedMessage.value = '';
  try {
    const safeWords = Math.min(5000, Math.max(100, Number(wordsPerDay.value) || 400));
    const safeTol = Math.min(100, Math.max(0, Number(tolerance.value) || 0));
    await libraryStore.updateBookRhythm(book.value.id, {
      wordsPerDay: safeWords,
      tolerance: safeTol,
      readWeekends: readWeekends.value,
    });
    savedMessage.value = 'Rythme mis à jour et segments recalculés en conservant votre progression.';
  } finally {
    isSaving.value = false;
  }
}

async function handleReset() {
  if (!book.value) return;
  if (confirm(`Réinitialiser la progression de « ${book.value.title} » ?`)) {
    await libraryStore.resetProgress(book.value.id);
  }
}
</script>
