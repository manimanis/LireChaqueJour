<template>
  <div v-if="settingsStore.dictionaryEnabled">
    <!-- Floating Action Trigger (appears near selected word) -->
    <div
      v-if="floatingTrigger.visible && !isModalOpen"
      class="word-def-floating-trigger position-fixed"
      :style="{
        top: `${floatingTrigger.top}px`,
        left: `${floatingTrigger.left}px`,
        transform: floatingTrigger.placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 1070,
      }"
    >
      <button
        type="button"
        class="btn btn-sm btn-primary shadow rounded-pill d-inline-flex align-items-center gap-1 px-3 py-1 animate-fade-in"
        style="touch-action: manipulation; user-select: none; -webkit-user-select: none;"
        @touchstart.prevent.stop="onTriggerPress"
        @pointerdown.prevent.stop="onTriggerPress"
        @mousedown.prevent.stop="onTriggerPress"
        @click.prevent.stop="onTriggerPress"
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
                type="button"
                class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                :class="{ 'btn-primary text-white': isSpeaking }"
                title="Écouter la prononciation vocale"
                @click="handleAudioPronunciation"
              >
                <i class="bi" :class="isSpeaking ? 'bi-volume-up-fill animate-pulse' : 'bi-volume-up'"></i>
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

              <!-- Context sentence from reading (Point 2) -->
              <div
                v-if="currentContextSentence"
                class="p-2 mb-3 rounded bg-body-tertiary small border-start border-3 border-primary shadow-sm"
              >
                <div class="fw-semibold text-primary mb-1">
                  <i class="bi bi-chat-quote-fill me-1"></i>Dans votre lecture :
                </div>
                <div class="fst-italic text-body">
                  « {{ currentContextSentence }} »
                </div>
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
  speakWord,
  extractContextSentence,
} from '@/services/dictionaryService.js';

const settingsStore = useSettingsStore();
const libraryStore = useLibraryStore();

const floatingTrigger = ref({
  visible: false,
  word: '',
  contextSentence: '',
  top: 0,
  left: 0,
  placeAbove: false,
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
const currentContextSentence = ref('');
const isSpeaking = ref(false);

let audioPlayer = null;

function onTriggerPress(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const word = floatingTrigger.value.word;
  const context = floatingTrigger.value.contextSentence;
  if (word) {
    openForWord(word, null, true, context);
  }
}

function handleSelection() {
  if (!settingsStore.dictionaryEnabled || isModalOpen.value) {
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
  if (element?.closest('input, textarea, select, [contenteditable="true"], .no-def-lookup, .word-def-floating-trigger, .modal')) {
    return;
  }

  const range = selection.getRangeAt(0);
  let rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    const clientRects = range.getClientRects();
    if (clientRects.length > 0) {
      rect = clientRects[0];
    } else {
      hideFloatingTrigger();
      return;
    }
  }

  // Extract surrounding reading sentence for context (Point 2)
  const context = extractContextSentence(selection);

  if (settingsStore.dictionaryAutoOpen) {
    hideFloatingTrigger();
    openForWord(cleaned, null, true, context);
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768 || ('ontouchstart' in window);

  // Center horizontally relative to selection, clamped to viewport margins
  const left = Math.min(Math.max(rect.left + rect.width / 2, 95), vw - 95);

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;

  let placeAbove = false;
  let top = 0;

  if (isMobile) {
    // On mobile touch devices, the native OS toolbar (Copy / Look up / Share) floats directly ABOVE the word.
    // Placing our button below the word avoids obstruction by the OS toolbar.
    // Account for mobile bottom nav (~70px height)
    if (spaceBelow >= 70) {
      placeAbove = false;
      top = Math.min(rect.bottom + 8, vh - 75);
    } else if (spaceAbove >= 95) {
      placeAbove = true;
      top = Math.max(rect.top - 10, 60);
    } else {
      placeAbove = false;
      top = Math.max(65, vh - 75);
    }
  } else {
    // Desktop: default above unless too close to top bar (< 80px)
    if (spaceAbove >= 75) {
      placeAbove = true;
      top = Math.max(rect.top - 8, 55);
    } else {
      placeAbove = false;
      top = Math.min(rect.bottom + 8, vh - 35);
    }
  }

  floatingTrigger.value = {
    visible: true,
    word: cleaned,
    contextSentence: context,
    top,
    left,
    placeAbove,
  };
}

function hideFloatingTrigger() {
  floatingTrigger.value.visible = false;
}

async function openForWord(word, provider = null, clearHistory = true, contextSentence = '') {
  if (clearHistory) {
    navigationStack.value = [];
  }
  if (contextSentence) {
    currentContextSentence.value = contextSentence;
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

    // Automatically record lookup in Vocabulary notebook with context sentence
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
        contextSentence: currentContextSentence.value || '',
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
  currentContextSentence.value = '';
  navigationStack.value = [];
  hideFloatingTrigger();
  if (isSpeaking.value) {
    window.speechSynthesis?.cancel();
    isSpeaking.value = false;
  }
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

function handleAudioPronunciation() {
  const word = activeResult.value?.word || currentQuery.value;
  if (!word) return;

  if (activeResult.value?.audioUrl) {
    playAudio(activeResult.value.audioUrl);
    return;
  }

  // Web Speech Synthesis (Point 3)
  if (settingsStore.speechSynthesisEnabled) {
    isSpeaking.value = true;
    const lang = currentProvider.value === 'dictionary_api_en' ? 'en-US' : 'fr-FR';
    speakWord(word, lang, () => {
      isSpeaking.value = false;
    });
  }
}

async function copyDefinition() {
  if (!activeResult.value) return;
  const defs = activeResult.value.entries
    .map(e => `${e.partOfSpeech} :\n` + e.definitions.map(d => `• ${d}`).join('\n'))
    .join('\n\n');
  let fullText = `${activeResult.value.word}\n\n${defs}`;
  if (currentContextSentence.value) {
    fullText += `\n\nContexte: « ${currentContextSentence.value} »`;
  }
  fullText += `\n\nSource : ${activeResult.value.sourceUrl}`;

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

// Global selection listeners & debounce timer
let selectionDebounceTimer = null;

function debouncedHandleSelection(delay = 180) {
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }
  selectionDebounceTimer = setTimeout(() => {
    handleSelection();
  }, delay);
}

function onSelectionChange() {
  if (isModalOpen.value) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    // If focus or touch is on our trigger button, do not clear
    if (document.activeElement?.closest('.word-def-floating-trigger')) {
      return;
    }
    // Small delay so a touchstart on the button doesn't prematurely hide before press executes
    if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
    selectionDebounceTimer = setTimeout(() => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || !s.toString().trim()) {
        hideFloatingTrigger();
      }
    }, 120);
    return;
  }

  // Active non-empty selection: wait for user to finish touching/moving handles
  debouncedHandleSelection(180);
}

function onMouseUp(e) {
  // If clicking inside the floating trigger or modal, do not close or recalculate
  if (e?.target?.closest('.word-def-floating-trigger') || e?.target?.closest('.modal')) {
    return;
  }
  debouncedHandleSelection(60);
}

function onTouchEnd(e) {
  if (e?.target?.closest('.word-def-floating-trigger') || e?.target?.closest('.modal')) {
    return;
  }
  // On mobile touch, allow browser to finish committing the selection range
  debouncedHandleSelection(120);
}

function onKeyUp(e) {
  // Check selection when using keyboard Shift+Arrows
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    debouncedHandleSelection(60);
  }
}

function onGlobalOpenWord(e) {
  const word = e.detail?.word;
  const context = e.detail?.contextSentence || '';
  if (word) {
    openForWord(word, null, true, context);
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('open-word-definition', onGlobalOpenWord);
});

onUnmounted(() => {
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }
  document.removeEventListener('selectionchange', onSelectionChange);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchend', onTouchEnd);
  document.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('open-word-definition', onGlobalOpenWord);
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
  if (isSpeaking.value) {
    window.speechSynthesis?.cancel();
  }
});
</script>

<style scoped>
.word-def-floating-trigger {
  animation: fadeIn 0.15s ease-out;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
</style>
