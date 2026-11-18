<template>
  <div class="container py-4">
    <!-- Empty state -->
    <div v-if="!book" class="text-center py-5">
      <i class="bi bi-journal-x fs-1 text-body-secondary d-block mb-3"></i>
      <h4 class="fw-bold mb-2">Aucun livre sélectionné</h4>
      <p class="text-body-secondary mb-4">
        Importez un livre EPUB ou sélectionnez-en un dans votre bibliothèque pour commencer la lecture du jour.
      </p>
      <RouterLink to="/library" class="btn btn-primary">
        <i class="bi bi-collection me-2"></i>Aller à la bibliothèque
      </RouterLink>
    </div>

    <div v-else class="reading-surface">
      <!-- Book Switcher & Header Info (UC04) -->
      <div class="card shadow-sm border-0 mb-4">
        <div class="card-body p-3 p-md-4">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div class="flex-grow-1">
              <div v-if="libraryStore.books.length > 1" class="mb-2">
                <select
                  class="form-select form-select-sm w-auto mw-100"
                  :value="book.id"
                  aria-label="Changer de livre"
                  @change="switchBook($event.target.value)"
                >
                  <option v-for="b in libraryStore.books" :key="b.id" :value="b.id">
                    {{ b.title }}
                  </option>
                </select>
              </div>
              <h1 class="h4 fw-bold mb-1">{{ book.title }}</h1>
              <p class="text-body-secondary small mb-0">{{ book.author }}</p>
            </div>

            <div class="text-end">
              <span class="badge text-bg-primary fs-6 mb-1">
                Jour {{ displayedDay }} / {{ book.totalSegments }}
              </span>
              <div class="small text-body-secondary">
                {{ progress.completion }} % • ~{{ estimatedMinutes }} min
              </div>
            </div>
          </div>

          <div class="progress" style="height: 8px">
            <div
              class="progress-bar"
              :class="progress.completion >= 100 ? 'bg-success' : 'bg-primary'"
              role="progressbar"
              :style="{ width: `${progress.completion}%` }"
            ></div>
          </div>

          <div
            v-if="isPostponedToday"
            class="alert alert-warning py-2 px-3 small mt-3 mb-0"
          >
            <i class="bi bi-clock-history me-2"></i>
            Lecture reportée pour aujourd'hui. Vous pouvez la reprendre à tout moment.
          </div>
        </div>
      </div>

      <!-- Summary Card (UC04) -->
      <div ref="summarySectionRef">
        <SummaryCard
          :summary="summaryText"
          :length="settingsStore.summaryLength"
          :loading="summaryLoading"
          @change-length="onSummaryLengthChange"
          @regenerate="loadSummary(true)"
        />
      </div>

      <!-- Quick Reading Comfort Controls -->
      <div class="card border-0 bg-body-tertiary mb-4">
        <div class="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2 small">
          <div class="d-flex align-items-center gap-2">
            <label class="text-body-secondary mb-0">Police :</label>
            <select
              v-model="settingsStore.fontFamily"
              class="form-select form-select-sm w-auto"
            >
              <option value="Georgia">Georgia</option>
              <option value="Merriweather">Merriweather</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Arial">Arial</option>
            </select>
          </div>

          <div class="d-flex align-items-center gap-2">
            <span class="text-body-secondary">Taille :</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary px-2 py-0"
              :disabled="settingsStore.fontSize <= 12"
              @click="settingsStore.fontSize = Math.max(12, settingsStore.fontSize - 1)"
            >
              A-
            </button>
            <span class="fw-semibold">{{ settingsStore.fontSize }}px</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary px-2 py-0"
              :disabled="settingsStore.fontSize >= 32"
              @click="settingsStore.fontSize = Math.min(32, settingsStore.fontSize + 1)"
            >
              A+
            </button>
          </div>

          <div class="d-flex align-items-center gap-2">
            <label class="text-body-secondary mb-0">Interligne :</label>
            <select
              v-model.number="settingsStore.lineHeight"
              class="form-select form-select-sm w-auto"
            >
              <option :value="1.2">1.2</option>
              <option :value="1.5">1.5</option>
              <option :value="1.7">1.7</option>
              <option :value="2.0">2.0</option>
              <option :value="2.3">2.3</option>
            </select>
          </div>

          <div>
            <RouterLink
              :to="`/vocabulary?bookId=${book.id}`"
              class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
              title="Consulter le carnet de vocabulaire pour ce livre"
            >
              <i class="bi bi-journal-bookmark"></i>
              <span>Vocabulaire</span>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Segment Content -->
      <div class="card shadow-sm border-0 mb-4">
        <div class="card-body p-3 p-sm-4 p-md-5">
          <div v-if="segmentLoading" class="text-center py-5 text-body-secondary">
            <div class="spinner-border mb-2" role="status"></div>
            <div>Chargement du segment…</div>
          </div>

          <div v-else-if="currentSegment">
            <div class="d-flex justify-content-between align-items-center text-body-secondary small mb-4 pb-2 border-bottom">
              <span>Lecture du jour {{ currentSegment.dayNumber }}</span>
              <span>{{ currentSegment.wordCount }} mots</span>
            </div>

            <div
              class="reading-prose"
              :style="readingStyle"
            >
              <p v-for="(para, idx) in paragraphs" :key="idx">
                {{ para }}
              </p>
            </div>
          </div>

          <div v-else class="text-center py-4 text-body-secondary">
            Segment introuvable.
          </div>
        </div>
      </div>

      <!-- Completion Banner -->
      <div
        v-if="justCompletedMsg"
        class="alert alert-success d-flex align-items-center justify-content-between mb-4"
      >
        <div>
          <i class="bi bi-check-circle-fill me-2"></i>{{ justCompletedMsg }}
        </div>
      </div>

      <!-- Action Buttons (UC04: Terminé, Reporter, Relire le résumé) -->
      <div class="card shadow-sm border-0 mb-4">
        <div class="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-success btn-lg"
              :disabled="!currentSegment || isCurrentCompleted && progress.completion >= 100"
              @click="handleComplete"
            >
              <i class="bi bi-check2-circle me-2"></i>
              {{ isCurrentCompleted ? 'Déjà validé — Passer au suivant' : 'Terminé' }}
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="handlePostpone"
            >
              <i class="bi bi-calendar-plus me-1"></i>Reporter
            </button>

            <button
              type="button"
              class="btn btn-outline-info"
              @click="scrollToSummary"
            >
              <i class="bi bi-stars me-1"></i>Relire le résumé
            </button>
          </div>

          <!-- Navigate completed days -->
          <div class="btn-group btn-group-sm">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="displayedDay <= 1"
              title="Jour précédent"
              @click="viewDay(displayedDay - 1)"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="displayedDay >= progress.currentSegment"
              title="Jour suivant"
              @click="viewDay(displayedDay + 1)"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { estimateReadingMinutes } from '@/services/segmenter.js';
import SummaryCard from '@/components/SummaryCard.vue';

const route = useRoute();
const router = useRouter();
const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const summarySectionRef = ref(null);
const currentSegment = ref(null);
const segmentLoading = ref(false);
const summaryText = ref('');
const summaryLoading = ref(false);
const displayedDay = ref(1);
const justCompletedMsg = ref('');

const book = computed(() => {
  const paramId = route.params.bookId;
  if (paramId) {
    const found = libraryStore.books.find((b) => b.id === paramId);
    if (found) return found;
  }
  return libraryStore.activeBook;
});

const progress = computed(() =>
  book.value ? libraryStore.getProgress(book.value.id) : null
);

const isCurrentCompleted = computed(() =>
  progress.value?.completedSegments?.includes(displayedDay.value)
);

const isPostponedToday = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return progress.value?.postponedDate === today;
});

const estimatedMinutes = computed(() =>
  currentSegment.value
    ? estimateReadingMinutes(currentSegment.value.wordCount)
    : 0
);

const paragraphs = computed(() => {
  if (!currentSegment.value?.content) return [];
  return currentSegment.value.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
});

const readingStyle = computed(() => ({
  fontFamily: `'${settingsStore.fontFamily}', serif`,
  fontSize: `${settingsStore.fontSize}px`,
  lineHeight: settingsStore.lineHeight,
}));

async function loadSegmentAndSummary(dayNum) {
  if (!book.value) return;
  segmentLoading.value = true;
  try {
    currentSegment.value = await libraryStore.getSegment(book.value.id, dayNum);
  } finally {
    segmentLoading.value = false;
  }
  await loadSummary(false);
}

async function loadSummary(force = false) {
  if (!book.value) return;
  summaryLoading.value = true;
  try {
    summaryText.value = await libraryStore.getOrGenerateSummary(
      book.value.id,
      displayedDay.value,
      settingsStore.summaryLength,
      force
    );
  } finally {
    summaryLoading.value = false;
  }
}

watch(
  () => [book.value?.id, libraryStore.isLoaded],
  async ([bookId, loaded]) => {
    if (!loaded || !bookId) return;
    settingsStore.currentBookId = bookId;
    const prog = libraryStore.getProgress(bookId);
    displayedDay.value = prog.currentSegment || 1;
    justCompletedMsg.value = '';
    await loadSegmentAndSummary(displayedDay.value);
  },
  { immediate: true }
);

function switchBook(bookId) {
  settingsStore.currentBookId = bookId;
  router.push(`/today/${bookId}`);
}

async function viewDay(dayNum) {
  if (!book.value) return;
  const maxAllowed = progress.value.currentSegment || 1;
  const target = Math.min(maxAllowed, Math.max(1, dayNum));
  displayedDay.value = target;
  justCompletedMsg.value = '';
  await loadSegmentAndSummary(target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleComplete() {
  if (!book.value || !currentSegment.value) return;
  const dayJustRead = displayedDay.value;
  await libraryStore.markSegmentCompleted(book.value.id, dayJustRead);

  if (dayJustRead >= book.value.totalSegments) {
    justCompletedMsg.value = `Félicitations ! Vous avez terminé « ${book.value.title} » !`;
  } else {
    justCompletedMsg.value = `Jour ${dayJustRead} validé ! Votre résumé a été mis à jour pour le jour ${dayJustRead + 1}.`;
    displayedDay.value = dayJustRead + 1;
    await loadSegmentAndSummary(displayedDay.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function handlePostpone() {
  if (!book.value) return;
  await libraryStore.postponeToday(book.value.id);
}

async function onSummaryLengthChange(newLength) {
  settingsStore.summaryLength = newLength;
  await loadSummary(false);
}

function scrollToSummary() {
  summarySectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
</script>
