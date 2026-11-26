<template>
  <div class="container py-4" :class="isFocusMode ? 'focus-mode-active' : ''">
    <!-- Floating Exit Button for Focus Mode -->
    <div
      v-if="isFocusMode"
      class="position-fixed top-0 end-0 p-3"
      style="z-index: 1080"
    >
      <button
        type="button"
        class="btn btn-sm btn-dark opacity-75 shadow rounded-pill d-flex align-items-center gap-1 px-3 py-1"
        title="Quitter le mode plein écran"
        @click="toggleFocusMode"
      >
        <i class="bi bi-fullscreen-exit"></i>
        <span>Quitter Focus</span>
      </button>
    </div>

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

    <div v-else class="reading-surface" :class="'reading-surface-theme-' + settingsStore.readingTheme">
      <!-- Book Switcher & Header Info (Hidden in Focus Mode) -->
      <div v-if="!isFocusMode" class="card shadow-sm border-0 mb-4">
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

      <!-- Summary Card (UC04) (Hidden in Focus Mode) -->
      <div v-if="!isFocusMode" ref="summarySectionRef">
        <SummaryCard
          :summary="summaryText"
          :length="settingsStore.summaryLength"
          :loading="summaryLoading"
          @change-length="onSummaryLengthChange"
          @regenerate="loadSummary(true)"
        />
      </div>

      <!-- Audio Reader Player Bar (Axe 1) -->
      <AudioPlayerBar
        :show="showAudioPlayer"
        :audio-state="audioState"
        @toggle-play="toggleAudioPlay"
        @prev="globalAudioReader.prev()"
        @next="globalAudioReader.next()"
        @cycle-rate="cycleAudioRate"
        @close="closeAudioPlayer"
      />

      <!-- Segment Content -->
      <div
        class="card shadow-sm border-0 mb-4 position-relative"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <div class="card-body p-3 p-sm-4 p-md-5">
          <div v-if="segmentLoading" class="text-center py-5 text-body-secondary">
            <div class="spinner-border mb-2" role="status"></div>
            <div>Chargement du segment…</div>
          </div>

          <div v-else-if="currentSegment">
            <!-- Reader Header Strip with Compact Actions (Aa, Audio, TOC, Focus) -->
            <div class="d-flex flex-wrap justify-content-between align-items-center text-body-secondary small mb-4 pb-2 border-bottom gap-2">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-bold text-body">Jour {{ currentSegment.dayNumber }}</span>
                <span>•</span>
                <span>{{ currentSegment.wordCount }} mots</span>
                <span v-if="settingsStore.readingMode === 'paginated'">
                  • Page {{ currentPageIdx + 1 }} / {{ paginatedPages.length }}
                </span>
              </div>

              <div class="d-flex align-items-center gap-1">
                <!-- Audio toggle -->
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="showAudioPlayer ? 'btn-primary' : 'btn-outline-primary'"
                  title="Écouter le segment en synthèse vocale"
                  @click="toggleAudioBar"
                >
                  <i class="bi bi-headphones me-1"></i>
                  <span class="d-none d-sm-inline">Écouter</span>
                </button>

                <!-- Table of Contents / Chapters -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  title="Table des matières et chapitres"
                  @click="showTocDrawer = true"
                >
                  <i class="bi bi-list-columns-reverse me-1"></i>
                  <span class="d-none d-sm-inline">Chapitres</span>
                </button>

                <!-- Reading Options (Aa) Drawer trigger -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary fw-bold px-2 py-1 shadow-sm"
                  title="Options d'affichage et de lecture (Aa)"
                  @click="showReadingOptionsDrawer = true"
                >
                  <span style="font-size: 0.95rem; font-family: serif;">Aa</span>
                </button>

                <!-- Focus / Fullscreen Mode -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary px-2"
                  title="Mode lecture plein écran sans distraction"
                  @click="toggleFocusMode"
                >
                  <i class="bi bi-arrows-fullscreen"></i>
                </button>
              </div>
            </div>

            <!-- Reading Prose Surface -->
            <div
              ref="readingProseRef"
              class="reading-prose"
              :style="readingStyle"
              @click="handleReadingProseClick"
            >
              <!-- Paginated mode display -->
              <template v-if="settingsStore.readingMode === 'paginated'">
                <div v-if="paginatedPages[currentPageIdx]">
                  <p
                    v-for="(pIdx) in paginatedPages[currentPageIdx]"
                    :key="pIdx"
                    :data-pidx="pIdx"
                    v-html="renderParagraph(paragraphs[pIdx], pIdx)"
                  ></p>
                </div>
              </template>

              <!-- Standard vertical scroll display -->
              <template v-else>
                <p
                  v-for="(para, idx) in paragraphs"
                  :key="idx"
                  :data-pidx="idx"
                  v-html="renderParagraph(para, idx)"
                ></p>
              </template>
            </div>

            <!-- Pagination Bottom Nav Controls (Axe 2) -->
            <div
              v-if="settingsStore.readingMode === 'paginated'"
              class="d-flex justify-content-between align-items-center pt-4 mt-4 border-top"
            >
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm rounded-pill px-3"
                :disabled="currentPageIdx === 0"
                @click="currentPageIdx--"
              >
                <i class="bi bi-arrow-left me-1"></i>Page précédente
              </button>
              <span class="small text-body-secondary">
                {{ currentPageIdx + 1 }} / {{ paginatedPages.length }}
              </span>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm rounded-pill px-3"
                :disabled="currentPageIdx >= paginatedPages.length - 1"
                @click="currentPageIdx++"
              >
                Page suivante<i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>

          <div v-else class="text-center py-4 text-body-secondary">
            Segment introuvable.
          </div>
        </div>
      </div>

      <!-- Daily Vocabulary Review Widget (Moved to end of reading segment) -->
      <div v-if="!isFocusMode && reviewWords.length > 0" class="card shadow-sm border-0 mb-4 border-start border-4 border-primary">
        <div class="card-body p-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h6 class="fw-bold mb-0 d-flex align-items-center gap-2 text-primary">
              <i class="bi bi-lightbulb-fill"></i>
              <span>Vocabulaire à réviser ({{ reviewWords.length }})</span>
            </h6>
            <RouterLink
              :to="`/vocabulary?mode=flashcards&bookId=${book?.id || ''}`"
              class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2"
            >
              <i class="bi bi-play-circle me-1"></i>Lancer les Flashcards
            </RouterLink>
          </div>

          <div class="d-flex flex-wrap gap-2 pt-1">
            <button
              v-for="rw in reviewWords"
              :key="rw.id"
              type="button"
              class="btn btn-sm btn-light border rounded-pill d-inline-flex align-items-center gap-1 py-1 px-3 shadow-sm"
              @click="triggerWordLookup(rw.word, rw.contextSentence)"
            >
              <span class="fw-semibold text-capitalize">{{ rw.word }}</span>
              <span v-if="rw.masteryLevel === 2" class="text-success small ms-1" title="Maîtrisé">✓</span>
              <span v-else class="text-warning small ms-1" title="À réviser">●</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Completion Banner & Badges unlocked alert -->
      <div
        v-if="justCompletedMsg"
        class="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3"
      >
        <div>
          <i class="bi bi-check-circle-fill me-2 fs-5"></i>
          <span>{{ justCompletedMsg }}</span>
        </div>
      </div>

      <div
        v-if="unlockedBadgeMsg"
        class="alert alert-warning d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3 border-warning"
      >
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-trophy-fill text-warning fs-4"></i>
          <div>
            <div class="fw-bold">Nouveau succès débloqué !</div>
            <div class="small">{{ unlockedBadgeMsg }}</div>
          </div>
        </div>
        <RouterLink to="/stats" class="btn btn-sm btn-outline-dark rounded-pill">
          Voir mes trophées
        </RouterLink>
      </div>

      <!-- Action Buttons (UC04: Terminé, Reporter, Relire le résumé) -->
      <div v-if="!isFocusMode" class="card shadow-sm border-0 mb-4">
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
            <span class="btn btn-outline-secondary disabled fw-semibold">
              Jour {{ displayedDay }}
            </span>
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

    <!-- Free Highlight & Quote Floating Action Trigger (Axe 3) -->
    <div
      v-if="highlightTrigger.visible"
      class="position-fixed shadow-lg rounded-pill p-1 bg-body border d-flex align-items-center gap-1 animate-fade-in"
      :style="{
        top: `${highlightTrigger.top}px`,
        left: `${highlightTrigger.left}px`,
        transform: 'translate(-50%, 0)',
        zIndex: 1060,
      }"
      @mousedown.prevent
      @touchstart.prevent
    >
      <!-- Color dots for highlights -->
      <button
        v-for="c in highlightColors"
        :key="c.name"
        type="button"
        class="btn p-0 rounded-circle border shadow-sm"
        :style="{ width: '22px', height: '22px', backgroundColor: c.code }"
        :title="`Surligner en ${c.label}`"
        @click="createHighlight(c.name)"
      ></button>

      <div class="vr mx-1 my-1"></div>

      <!-- Quote generator trigger -->
      <button
        type="button"
        class="btn btn-sm btn-light border-0 rounded-pill py-0 px-2 small d-inline-flex align-items-center gap-1"
        title="Créer une image de citation"
        @click="openQuoteModal(highlightTrigger.text)"
      >
        <i class="bi bi-card-image text-primary"></i>
        <span>Citation</span>
      </button>

      <button
        type="button"
        class="btn btn-sm btn-link text-body-secondary p-0 px-1"
        title="Fermer"
        @click="highlightTrigger.visible = false"
      >
        <i class="bi bi-x"></i>
      </button>
    </div>

    <!-- Table of Contents & Search Offcanvas / Drawer (Axe 4) -->
    <TocDrawer
      :show="showTocDrawer"
      :total-segments="book?.totalSegments || 1"
      :displayed-day="displayedDay"
      :completed-segments="progress?.completedSegments || []"
      v-model:search-query="searchBookQuery"
      :search-active="searchActive"
      :search-results="searchResults"
      @close="showTocDrawer = false"
      @select-day="selectDayFromToc"
      @search="performBookSearch"
      @clear-search="clearBookSearch"
    />

    <!-- Reading Options Drawer "Aa" (Kindle / Apple Books style) -->
    <ReadingOptionsDrawer
      :show="showReadingOptionsDrawer"
      @close="showReadingOptionsDrawer = false"
    />

    <!-- Quote Card Generator Modal (Axe 3) -->
    <QuoteCardModal
      :show="showQuoteModal"
      :quote-text="selectedQuoteText"
      :book-title="book?.title"
      :author="book?.author"
      @close="showQuoteModal = false"
    />

    <!-- Bottom Reading Progress Bar -->
    <div
      v-if="currentSegment"
      class="reading-progress-bar border-top shadow-sm"
      :class="{ 'reading-progress-bar-focus': isFocusMode }"
    >
      <div class="progress rounded-0" style="height: 3px; background-color: rgba(var(--bs-primary-rgb), 0.15);">
        <div
          class="progress-bar bg-primary"
          role="progressbar"
          :style="{ width: `${readingProgressPercent}%`, transition: 'width 0.15s ease-out' }"
          :aria-valuenow="readingProgressPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
      <div class="container d-flex justify-content-between align-items-center py-1 px-3 small">
        <span class="text-body-secondary fw-medium">
          <template v-if="settingsStore.readingMode === 'paginated'">
            Page {{ currentPageIdx + 1 }} / {{ paginatedPages.length }} • {{ readingProgressPercent }} %
          </template>
          <template v-else>
            Segment : {{ readingProgressPercent }} %
          </template>
        </span>
        <span class="text-body-secondary">
          Livre : <strong class="text-body">{{ progress.completion }} %</strong>
          <span class="d-none d-sm-inline"> (Jour {{ displayedDay }} / {{ book.totalSegments }})</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { estimateReadingMinutes } from '@/services/segmenter.js';
import {
  triggerWordLookup,
  extractSentenceFromText,
} from '@/services/dictionaryService.js';
import { globalAudioReader } from '@/services/audioReaderService.js';
import { evaluateBadges } from '@/services/badgeService.js';
import { getLocalIsoDate } from '@/utils/dateUtils.js';
import {
  renderHighlightedParagraph,
  filterSearchSegments,
} from '@/utils/readerHelpers.js';
import SummaryCard from '@/components/SummaryCard.vue';
import QuoteCardModal from '@/components/QuoteCardModal.vue';
import AudioPlayerBar from '@/components/AudioPlayerBar.vue';
import TocDrawer from '@/components/TocDrawer.vue';
import ReadingOptionsDrawer from '@/components/ReadingOptionsDrawer.vue';

const route = useRoute();
const router = useRouter();
const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const summarySectionRef = ref(null);
const readingProseRef = ref(null);
const scrollProgressPercent = ref(0);
const currentSegment = ref(null);
const segmentLoading = ref(false);
const summaryText = ref('');
const summaryLoading = ref(false);
const displayedDay = ref(1);
const justCompletedMsg = ref('');
const unlockedBadgeMsg = ref('');
const vocabList = ref([]);
const reviewWords = ref([]);
const userHighlights = ref([]);

// Fullscreen / Focus Mode (Axe 2)
const isFocusMode = ref(false);

// Mode Pagination (Axe 2)
const currentPageIdx = ref(0);

// Audio Reader State (Axe 1)
const showAudioPlayer = ref(false);
const audioState = ref({
  isPlaying: false,
  isPaused: false,
  currentIndex: -1,
  totalSentences: 0,
  rate: 1.0,
});
const activeAudioSentence = ref(null);

// TOC Drawer & Search (Axe 4)
const showTocDrawer = ref(false);
const showReadingOptionsDrawer = ref(false);
const searchBookQuery = ref('');
const searchActive = ref(false);
const searchResults = ref([]);

// Highlights & Quote modal (Axe 3)
const showQuoteModal = ref(false);
const selectedQuoteText = ref('');
const highlightTrigger = ref({
  visible: false,
  text: '',
  top: 0,
  left: 0,
});

const highlightColors = [
  { name: 'yellow', code: '#fef08a', label: 'Jaune' },
  { name: 'green', code: '#bbf7d0', label: 'Menthe' },
  { name: 'pink', code: '#fbcfe8', label: 'Rose' },
  { name: 'blue', code: '#bae6fd', label: 'Ciel' },
];

// Touch swipe tracking for Paginated mode
let touchStartX = 0;
let touchStartY = 0;

const knownWords = computed(() => {
  return new Set(vocabList.value.map((w) => w.word.toLowerCase()));
});

const paragraphs = computed(() => {
  if (!currentSegment.value?.content) return [];
  return currentSegment.value.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
});

// Group paragraphs into pages for paginated mode (e.g. 1-2 paragraphs per page)
const paginatedPages = computed(() => {
  const pages = [];
  let currentGroup = [];
  let currentWords = 0;

  paragraphs.value.forEach((p, idx) => {
    const words = p.split(/\s+/).length;
    if (currentWords + words > 220 && currentGroup.length > 0) {
      pages.push(currentGroup);
      currentGroup = [idx];
      currentWords = words;
    } else {
      currentGroup.push(idx);
      currentWords += words;
    }
  });
  if (currentGroup.length > 0) pages.push(currentGroup);
  return pages.length > 0 ? pages : [[]];
});

const readingStyle = computed(() => ({
  fontFamily: `'${settingsStore.fontFamily}', serif`,
  fontSize: `${settingsStore.fontSize}px`,
  lineHeight: settingsStore.lineHeight,
}));

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
  const today = getLocalIsoDate();
  return progress.value?.postponedDate === today;
});

const estimatedMinutes = computed(() =>
  currentSegment.value
    ? estimateReadingMinutes(currentSegment.value.wordCount)
    : 0
);

// Focus mode toggle
function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value;
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('reading-focus-mode', isFocusMode.value);
  }
}

// Pagination mode toggle
function toggleReadingMode() {
  settingsStore.readingMode = settingsStore.readingMode === 'paginated' ? 'scroll' : 'paginated';
  currentPageIdx.value = 0;
}

// Touch swipe navigation
function handleTouchStart(e) {
  if (settingsStore.readingMode !== 'paginated') return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
  if (settingsStore.readingMode !== 'paginated') return;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  // Horizontal swipe detected
  if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
    if (deltaX < 0 && currentPageIdx.value < paginatedPages.value.length - 1) {
      currentPageIdx.value++;
    } else if (deltaX > 0 && currentPageIdx.value > 0) {
      currentPageIdx.value--;
    }
  }
}

// Audio Reader functions (Axe 1)
function toggleAudioBar() {
  showAudioPlayer.value = !showAudioPlayer.value;
  if (showAudioPlayer.value) {
    setupAudioReader();
  } else {
    globalAudioReader.stop();
  }
}

function setupAudioReader() {
  if (paragraphs.value.length > 0) {
    globalAudioReader.loadContent(paragraphs.value, 'fr-FR');
    globalAudioReader.setRate(audioState.value.rate);
  }
}

function toggleAudioPlay() {
  if (audioState.value.isPlaying) {
    globalAudioReader.pause();
  } else {
    globalAudioReader.play();
  }
}

function closeAudioPlayer() {
  globalAudioReader.stop();
  showAudioPlayer.value = false;
}

function cycleAudioRate() {
  const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
  const next = rates[(rates.indexOf(audioState.value.rate) + 1) % rates.length];
  globalAudioReader.setRate(next);
}

// Highlights & Quote functions (Axe 3)
async function loadHighlights() {
  if (!book.value) return;
  userHighlights.value = await libraryStore.getHighlights(book.value.id);
}

function openQuoteModal(text) {
  selectedQuoteText.value = text;
  highlightTrigger.value.visible = false;
  showQuoteModal.value = true;
}

async function createHighlight(colorName) {
  const text = highlightTrigger.value.text;
  if (!text || !book.value) return;

  await libraryStore.addHighlight({
    bookId: book.value.id,
    dayNumber: displayedDay.value,
    text,
    color: colorName,
  });

  highlightTrigger.value.visible = false;
  await loadHighlights();
}

function onTextSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    highlightTrigger.value.visible = false;
    return;
  }

  const raw = selection.toString().trim();
  // If user selected a sentence or phrase (> 15 chars), show highlight & quote trigger
  if (raw.length >= 12 && raw.length <= 500) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0) {
      highlightTrigger.value = {
        visible: true,
        text: raw,
        top: Math.min(rect.bottom + 10, window.innerHeight - 60),
        left: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      };
    }
  }
}

// Table of Contents & Search (Axe 4)
function selectDayFromToc(day) {
  showTocDrawer.value = false;
  viewDay(day);
}

async function performBookSearch() {
  const q = searchBookQuery.value.trim();
  if (!q || !book.value) return;

  searchActive.value = true;
  searchResults.value = [];

  const segments = await libraryStore.getBookSegments(book.value.id);
  const maxAllowed = progress.value?.currentSegment || 1;
  searchResults.value = filterSearchSegments(segments, q, maxAllowed, 15);
}

function clearBookSearch() {
  searchBookQuery.value = '';
  searchActive.value = false;
  searchResults.value = [];
}

async function loadVocab() {
  if (!book.value) return;
  try {
    vocabList.value = await libraryStore.getVocabulary(book.value.id);
    reviewWords.value = await libraryStore.getReviewWords(book.value.id, 5);
    await loadHighlights();
  } catch {
    // Ignore db load error
  }
}

function renderParagraph(para, pIdx) {
  return renderHighlightedParagraph(para, pIdx, {
    activeAudioSentence: activeAudioSentence.value,
    highlights: userHighlights.value,
    displayedDay: displayedDay.value,
    knownWords: knownWords.value,
    highlightVocabularyWords: settingsStore.highlightVocabularyWords,
  });
}

async function handleReadingProseClick(e) {
  const mark = e.target.closest('.vocab-highlight');
  if (mark) {
    const word = mark.getAttribute('data-word');
    if (word) {
      const paraText = mark.closest('p')?.textContent || '';
      const context = extractSentenceFromText(paraText, word);
      triggerWordLookup(word, context);
    }
    return;
  }

  const userMark = e.target.closest('.user-highlight');
  if (userMark) {
    const highlightId = Number(userMark.getAttribute('data-highlight-id'));
    if (highlightId && confirm('Supprimer ce surlignage ?')) {
      await libraryStore.deleteHighlight(highlightId);
      await loadHighlights();
    }
  }
}

async function loadSegmentAndSummary(dayNum) {
  if (!book.value) return;
  segmentLoading.value = true;
  try {
    currentSegment.value = await libraryStore.getSegment(book.value.id, dayNum);
    currentPageIdx.value = 0;
  } finally {
    segmentLoading.value = false;
  }
  await loadSummary(false);

  // If audio player is open, refresh sentences
  if (showAudioPlayer.value) {
    setupAudioReader();
  }
  await nextTick();
  updateScrollProgress();
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
    unlockedBadgeMsg.value = '';
    await loadSegmentAndSummary(displayedDay.value);
    await loadVocab();
  },
  { immediate: true }
);

const readingProgressPercent = computed(() => {
  if (settingsStore.readingMode === 'paginated') {
    if (!paginatedPages.value.length) return 0;
    return Math.min(100, Math.round(((currentPageIdx.value + 1) / paginatedPages.value.length) * 100));
  }
  return scrollProgressPercent.value;
});

function updateScrollProgress() {
  if (settingsStore.readingMode === 'paginated') return;
  const el = readingProseRef.value;
  if (!el) {
    scrollProgressPercent.value = 0;
    return;
  }
  const rect = el.getBoundingClientRect();
  const elTop = rect.top + window.scrollY;
  const elBottom = elTop + rect.height;
  const startScrollY = Math.max(0, elTop - 120);
  const endScrollY = Math.max(0, elBottom - window.innerHeight + 120);

  if (endScrollY <= startScrollY) {
    scrollProgressPercent.value = 100;
    return;
  }
  const raw = ((window.scrollY - startScrollY) / (endScrollY - startScrollY)) * 100;
  scrollProgressPercent.value = Math.min(100, Math.max(0, Math.round(raw)));
}

watch(
  () => [settingsStore.fontSize, settingsStore.fontFamily, settingsStore.readingMode],
  async () => {
    await nextTick();
    updateScrollProgress();
  }
);

onMounted(() => {
  window.addEventListener('focus', loadVocab);
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });
  document.addEventListener('selectionchange', onTextSelectionChange);

  // Audio reader listeners
  globalAudioReader.onStateChange = (state) => {
    audioState.value = state;
  };
  globalAudioReader.onSentenceChange = (sentence) => {
    activeAudioSentence.value = sentence;
    if (sentence) {
      setTimeout(() => {
        document.querySelector('.tts-active-sentence')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 50);
    }
  };
});

onUnmounted(() => {
  window.removeEventListener('focus', loadVocab);
  window.removeEventListener('scroll', updateScrollProgress);
  window.removeEventListener('resize', updateScrollProgress);
  document.removeEventListener('selectionchange', onTextSelectionChange);
  globalAudioReader.stop();
  if (typeof document !== 'undefined') {
    document.body.classList.remove('reading-focus-mode');
  }
});

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
  unlockedBadgeMsg.value = '';
  await loadSegmentAndSummary(target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleComplete() {
  if (!book.value || !currentSegment.value) return;
  const dayJustRead = displayedDay.value;
  await libraryStore.markSegmentCompleted(book.value.id, dayJustRead);

  // Check and unlock gamification badges (Axe 5)
  const newBadges = await evaluateBadges(libraryStore);
  if (newBadges && newBadges.length > 0) {
    unlockedBadgeMsg.value = `« ${newBadges[0].title} » — ${newBadges[0].description}`;
  }

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

<style scoped>
.reading-prose :deep(.vocab-highlight) {
  background-color: rgba(var(--bs-primary-rgb), 0.14);
  border-bottom: 2px dotted var(--bs-primary);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.reading-prose :deep(.vocab-highlight:hover) {
  background-color: rgba(var(--bs-primary-rgb), 0.28);
}

.reading-prose :deep(.user-highlight) {
  color: inherit;
  padding: 1px 3px;
  border-radius: 3px;
  cursor: pointer;
}

.reading-prose :deep(.user-highlight-yellow) {
  background-color: rgba(254, 240, 138, 0.65);
}

.reading-prose :deep(.user-highlight-green) {
  background-color: rgba(187, 247, 208, 0.65);
}

.reading-prose :deep(.user-highlight-pink) {
  background-color: rgba(251, 207, 232, 0.65);
}

.reading-prose :deep(.user-highlight-blue) {
  background-color: rgba(186, 230, 253, 0.65);
}

.reading-surface {
  transition: background-color 0.2s ease, color 0.2s ease;
  border-radius: 12px;
  padding: 8px;
  padding-bottom: 2.75rem;
}

.reading-progress-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1025;
  background-color: rgba(var(--bs-tertiary-bg-rgb, 248, 249, 250), 0.94);
  backdrop-filter: blur(8px);
}

@media (max-width: 767.98px) {
  .reading-progress-bar:not(.reading-progress-bar-focus) {
    bottom: calc(var(--mobile-nav-height, 3.75rem) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
