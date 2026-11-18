<template>
  <div v-if="settingsStore.dictionaryEnabled">
    <!-- Floating Action Trigger (appears above selected word) -->
    <div
      v-if="floatingTrigger.visible && !isModalOpen"
      class="word-def-floating-trigger position-fixed"
      :style="{
        top: `${floatingTrigger.top}px`,
        left: `${floatingTrigger.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 1070,
      }"
    >
      <button
        type="button"
        class="btn btn-sm btn-primary shadow-sm rounded-pill d-inline-flex align-items-center gap-1 px-3 py-1 animate-fade-in"
        @mousedown.prevent
        @click="openForWord(floatingTrigger.word)"
      >
        <i class="bi bi-book-half"></i>
        <span>Définir</span>
        <span class="text-truncate" style="max-width: 140px; font-weight: 600">
          « {{ floatingTrigger.word }} »
        </span>
      </button>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="isModalOpen"
      class="modal-backdrop fade show"
      style="z-index: 1080"
      @click="closeModal"
    ></div>

    <!-- Definition Modal / Dialog -->
    <div
      v-if="isModalOpen"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="z-index: 1085"
      @keydown.esc="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 580px">
        <div class="modal-content shadow border-0 rounded-4">
          <!-- Modal Header -->
          <div class="modal-header border-0 pb-1 pt-3 px-4">
            <div class="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
              <button
                v-if="navigationStack.length > 0"
                type="button"
                class="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2 d-inline-flex align-items-center gap-1 me-1"
                title="Revenir au mot précédent"
                @click="goBackInHistory"
              >
                <i class="bi bi-arrow-left"></i>
                <span class="small">Retour</span>
              </button>

              <h4 class="modal-title fw-bold mb-0 text-capitalize text-break">
                {{ activeResult?.word || currentQuery }}
              </h4>

              <span
                v-if="activeResult?.pronunciation"
                class="badge text-bg-secondary font-monospace"
                title="Prononciation phonétique"
              >
                {{ activeResult.pronunciation }}
              </span>

              <button
                v-if="activeResult?.audioUrl"
                type="button"
                class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                title="Écouter la prononciation"
                @click="playAudio(activeResult.audioUrl)"
              >
                <i class="bi bi-volume-up-fill"></i>
              </button>
            </div>

            <button
              type="button"
              class="btn-close"
              aria-label="Fermer"
              @click="closeModal"
            ></button>
          </div>

          <!-- Provider Switcher Bar -->
          <div class="px-4 py-2 bg-body-tertiary border-bottom border-top d-flex align-items-center justify-content-between gap-2 small">
            <div class="d-flex align-items-center gap-1 text-body-secondary text-truncate">
              <i class="bi bi-globe2 text-primary"></i>
              <span class="text-truncate">Source :</span>
            </div>

            <select
              :value="currentProvider"
              class="form-select form-select-sm w-auto py-0 px-2 fw-semibold"
              @change="switchProvider($event.target.value)"
            >
              <option
                v-for="prov in DICTIONARY_PROVIDERS"
                :key="prov.id"
                :value="prov.id"
              >
                {{ prov.name }}
              </option>
            </select>
          </div>

          <!-- Modal Body -->
          <div class="modal-body px-4 py-3" style="min-height: 200px; max-height: 60vh">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Recherche...</span>
              </div>
              <p class="text-body-secondary mb-0">
                Recherche de la définition de « <strong>{{ currentQuery }}</strong> »…
              </p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-4">
              <div class="text-warning fs-1 mb-2">
                <i class="bi bi-search"></i>
              </div>
              <h5 class="fw-bold mb-2">Définition introuvable</h5>
              <p class="text-body-secondary small mb-3">
                {{ error }}
              </p>

              <div class="d-flex justify-content-center gap-2 flex-wrap">
                <button
                  v-if="currentProvider !== 'wikipedia_fr'"
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="switchProvider('wikipedia_fr')"
                >
                  <i class="bi bi-wikipedia me-1"></i>Chercher sur Wikipédia
                </button>
                <button
                  v-if="currentProvider !== 'wiktionary_fr'"
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="switchProvider('wiktionary_fr')"
                >
                  <i class="bi bi-book me-1"></i>Chercher sur Wiktionnaire
                </button>
              </div>
            </div>

            <!-- Result State -->
            <div v-else-if="activeResult">
              <!-- Cross-Reference Banner (when word points to a base form e.g. débordante -> débordant) -->
              <div
                v-if="activeResult.referenceWords && activeResult.referenceWords.length > 0"
                class="alert alert-primary py-2 px-3 small d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 rounded-3 shadow-sm border-primary-subtle"
              >
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-arrow-right-circle-fill text-primary fs-5"></i>
                  <div>
                    Ce mot renvoie à la forme principale :
                    <strong class="text-capitalize">{{ activeResult.referenceWords[0] }}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn btn-sm btn-primary py-1 px-3 rounded-pill d-inline-flex align-items-center gap-1 shadow-sm"
                  @click="followReference(activeResult.referenceWords[0])"
                >
                  <span>Définir « {{ activeResult.referenceWords[0] }} »</span>
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>

              <!-- Thumbnail (for Wikipedia) -->
              <div v-if="activeResult.thumbnail" class="text-center mb-3">
                <img
                  :src="activeResult.thumbnail"
                  alt=""
                  class="img-fluid rounded shadow-sm"
                  style="max-height: 140px; object-fit: contain"
                />
              </div>

              <!-- Etymology (if available) -->
              <div
                v-if="activeResult.etymology"
                class="p-2 mb-3 rounded bg-body-tertiary small text-body-secondary border-start border-3 border-info"
              >
                <div class="fw-bold text-info mb-1">
                  <i class="bi bi-clock-history me-1"></i>Étymologie
                </div>
                <div>{{ activeResult.etymology }}</div>
              </div>

              <!-- Entries -->
              <div
                v-for="(entry, eIdx) in activeResult.entries"
                :key="eIdx"
                class="mb-3 pb-3"
                :class="{ 'border-bottom': eIdx < activeResult.entries.length - 1 }"
              >
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="badge rounded-pill text-bg-light border text-primary fw-bold">
                    {{ entry.partOfSpeech }}
                  </span>
                  <span v-if="entry.details" class="text-body-secondary small fst-italic">
                    {{ entry.details }}
                  </span>
                </div>

                <ol class="ps-3 mb-2">
                  <li
                    v-for="(def, dIdx) in entry.definitions"
                    :key="dIdx"
                    class="mb-1 text-body lh-base"
                  >
                    <!-- Clickable Reference Word inside definition text -->
                    <template v-if="entry.definitionItems?.[dIdx]?.referenceWord">
                      <span
                        v-for="(seg, sIdx) in getDefinitionSegments(def, entry.definitionItems[dIdx].referenceWord)"
                        :key="sIdx"
                      >
                        <button
                          v-if="seg.isRef"
                          type="button"
                          class="btn btn-link btn-sm p-0 fw-bold text-primary align-baseline text-decoration-underline"
                          :title="`Consulter la définition de « ${seg.text} »`"
                          @click="followReference(seg.text)"
                        >
                          {{ seg.text }}
                          <i class="bi bi-arrow-up-right-square small ms-1"></i>
                        </button>
                        <span v-else>{{ seg.text }}</span>
                      </span>
                    </template>
                    <template v-else>
                      {{ def }}
                    </template>
                  </li>
                </ol>

                <div
                  v-if="entry.examples && entry.examples.length > 0"
                  class="ms-3 ps-2 border-start border-2 border-secondary-subtle"
                >
                  <div
                    v-for="(ex, xIdx) in entry.examples"
                    :key="xIdx"
                    class="small text-body-secondary fst-italic mb-1"
                  >
                    « {{ ex }} »
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer border-0 pt-0 px-4 pb-3 justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              <a
                v-if="activeResult?.sourceUrl"
                :href="activeResult.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-link text-decoration-none p-0"
              >
                <i class="bi bi-box-arrow-up-right me-1"></i>Page source
              </a>

              <RouterLink
                v-if="savedInVocab"
                to="/vocabulary"
                class="badge text-bg-success-subtle text-success-emphasis border border-success-subtle text-decoration-none d-inline-flex align-items-center gap-1 py-1 px-2"
                title="Consulter votre carnet de vocabulaire"
                @click="closeModal"
              >
                <i class="bi bi-bookmark-check-fill"></i>
                <span>Enregistré dans le carnet</span>
              </RouterLink>
            </div>

            <div class="d-flex gap-2">
              <button
                v-if="activeResult"
                type="button"
                class="btn btn-sm btn-outline-secondary"
                title="Copier la définition"
                @click="copyDefinition"
              >
                <i class="bi" :class="copied ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
                <span class="ms-1">{{ copied ? 'Copié' : 'Copier' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="closeModal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { useLibraryStore } from '@/stores/libraryStore.js';
import {
  cleanSelectedWord,
  fetchWordDefinition,
  DICTIONARY_PROVIDERS,
} from '@/services/dictionaryService.js';

const settingsStore = useSettingsStore();
const libraryStore = useLibraryStore();

const floatingTrigger = ref({
  visible: false,
  word: '',
  top: 0,
  left: 0,
});

const isModalOpen = ref(false);
const loading = ref(false);
const error = ref(null);
const currentQuery = ref('');
const currentProvider = ref('wiktionary_fr');
const activeResult = ref(null);
const copied = ref(false);
const savedInVocab = ref(false);
const navigationStack = ref([]);

let audioPlayer = null;

function handleSelection() {
  if (!settingsStore.dictionaryEnabled) {
    hideFloatingTrigger();
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    hideFloatingTrigger();
    return;
  }

  const rawText = selection.toString();
  const cleaned = cleanSelectedWord(rawText);

  // Allow lookup only if 1-2 words and reasonable length
  if (!cleaned || cleaned.length < 2 || cleaned.length > 35 || cleaned.includes('\n')) {
    hideFloatingTrigger();
    return;
  }

  // Do not trigger inside inputs, textareas, or contenteditables
  const anchorNode = selection.anchorNode;
  const element = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
  if (element?.closest('input, textarea, select, [contenteditable="true"], .no-def-lookup')) {
    hideFloatingTrigger();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    hideFloatingTrigger();
    return;
  }

  // Calculate coordinates relative to viewport
  const left = Math.min(Math.max(rect.left + rect.width / 2, 80), window.innerWidth - 80);
  const top = Math.max(rect.top - 8, 40);

  if (settingsStore.dictionaryAutoOpen) {
    hideFloatingTrigger();
    openForWord(cleaned);
  } else {
    floatingTrigger.value = {
      visible: true,
      word: cleaned,
      top,
      left,
    };
  }
}

function hideFloatingTrigger() {
  floatingTrigger.value.visible = false;
}

async function openForWord(word, provider = null, clearHistory = true) {
  if (clearHistory) {
    navigationStack.value = [];
  }
  currentQuery.value = word;
  currentProvider.value = provider || settingsStore.dictionaryProvider || 'wiktionary_fr';
  isModalOpen.value = true;
  hideFloatingTrigger();
  await loadDefinition();
}

function followReference(word) {
  if (!word) return;
  // Push current word onto navigation stack so user can go back
  if (currentQuery.value && currentQuery.value.toLowerCase() !== word.toLowerCase()) {
    navigationStack.value.push(currentQuery.value);
  }
  openForWord(word, null, false);
}

function goBackInHistory() {
  if (navigationStack.value.length === 0) return;
  const prevWord = navigationStack.value.pop();
  openForWord(prevWord, null, false);
}

function getDefinitionSegments(text, refWord) {
  if (!refWord) return [{ text, isRef: false }];
  try {
    const escaped = refWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escaped}\\b)`, 'i');
    const parts = text.split(regex);
    return parts.map((p) => ({
      text: p,
      isRef: p.toLowerCase() === refWord.toLowerCase(),
    }));
  } catch {
    return [{ text, isRef: false }];
  }
}

async function loadDefinition() {
  loading.value = true;
  error.value = null;
  activeResult.value = null;
  copied.value = false;
  savedInVocab.value = false;

  try {
    const res = await fetchWordDefinition(currentQuery.value, {
      provider: currentProvider.value,
      customUrl: settingsStore.dictionaryCustomUrl,
    });
    activeResult.value = res;

    // Automatically record lookup in Vocabulary notebook
    if (res && res.entries && res.entries.length > 0) {
      const currentBook = libraryStore.activeBook;
      await libraryStore.recordWordLookup({
        word: res.word,
        query: currentQuery.value,
        pronunciation: res.pronunciation || '',
        audioUrl: res.audioUrl || null,
        provider: currentProvider.value,
        providerName: res.providerName,
        sourceUrl: res.sourceUrl,
        topDefinition: res.entries[0]?.definitions?.[0] || '',
        partOfSpeech: res.entries[0]?.partOfSpeech || '',
        entries: res.entries,
        referenceWords: res.referenceWords || [],
        etymology: res.etymology || '',
        bookId: currentBook?.id || 'general',
        bookTitle: currentBook?.title || 'Toutes les lectures',
      });
      savedInVocab.value = true;
    }
  } catch (err) {
    error.value = err.message || 'Impossible de récupérer la définition.';
  } finally {
    loading.value = false;
  }
}

async function switchProvider(newProvider) {
  currentProvider.value = newProvider;
  await loadDefinition();
}

function closeModal() {
  isModalOpen.value = false;
  activeResult.value = null;
  error.value = null;
  navigationStack.value = [];
  hideFloatingTrigger();
}

function playAudio(url) {
  try {
    if (!audioPlayer) audioPlayer = new Audio();
    audioPlayer.src = url;
    audioPlayer.play().catch(() => {});
  } catch {
    // Ignore audio playback errors
  }
}

async function copyDefinition() {
  if (!activeResult.value) return;
  const defs = activeResult.value.entries
    .map(e => `${e.partOfSpeech} :\n` + e.definitions.map(d => `• ${d}`).join('\n'))
    .join('\n\n');
  const fullText = `${activeResult.value.word}\n\n${defs}\n\nSource : ${activeResult.value.sourceUrl}`;

  try {
    await navigator.clipboard.writeText(fullText);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard failed
  }
}

// Global selection listeners
function onMouseUp(e) {
  // If clicking inside the floating trigger or modal, do not close or recalculate
  if (e.target.closest('.word-def-floating-trigger') || e.target.closest('.modal')) {
    return;
  }
  // Delay slightly to allow browser selection to finish settling
  setTimeout(handleSelection, 20);
}

function onKeyUp(e) {
  // Check selection when using keyboard Shift+Arrows
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    setTimeout(handleSelection, 20);
  }
}

onMounted(() => {
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('touchend', onMouseUp);
  document.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchend', onMouseUp);
  document.removeEventListener('keyup', onKeyUp);
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
});
</script>

<style scoped>
.word-def-floating-trigger {
  animation: fadeIn 0.15s ease-out;
  pointer-events: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -85%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}

.modal-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
</style>
