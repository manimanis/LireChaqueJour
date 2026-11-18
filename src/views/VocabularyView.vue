<template>
  <div class="container py-4" style="max-width: 920px">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 fw-bold mb-1 d-flex align-items-center gap-2">
          <i class="bi bi-journal-bookmark-fill text-primary"></i>
          <span>Carnet de Vocabulaire</span>
        </h1>
        <p class="text-body-secondary mb-0">
          Retrouvez et révisez les mots dont vous avez consulté la définition au fil de vos lectures.
        </p>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          v-if="filteredWords.length > 0"
          type="button"
          class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          title="Exporter la liste au format texte"
          @click="exportVocabularyTxt"
        >
          <i class="bi bi-download"></i>
          <span>Exporter</span>
        </button>

        <button
          v-if="filteredWords.length > 0"
          type="button"
          class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
          title="Vider les mots affichés"
          @click="clearCurrentVocabulary"
        >
          <i class="bi bi-trash"></i>
          <span>Vider</span>
        </button>
      </div>
    </div>

    <!-- Filter & Search Controls -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-3 p-md-4">
        <div class="row g-3">
          <!-- Book Selector (Tous ou un livre précis) -->
          <div class="col-md-5">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-book me-1"></i>Périmètre de lecture
            </label>
            <select
              v-model="selectedBookId"
              class="form-select form-select-sm"
              @change="onBookChange"
            >
              <option value="all">📚 Toutes mes lectures ({{ allWords.length }} mots)</option>
              <option
                v-for="b in libraryStore.books"
                :key="b.id"
                :value="b.id"
              >
                {{ b.title }} ({{ countForBook(b.id) }})
              </option>
              <option v-if="countForBook('general') > 0" value="general">
                Lectures libres / Hors livre ({{ countForBook('general') }})
              </option>
            </select>
          </div>

          <!-- Search input -->
          <div class="col-md-4">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-search me-1"></i>Filtrer par mot ou sens
            </label>
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-body-tertiary border-end-0">
                <i class="bi bi-search text-body-secondary"></i>
              </span>
              <input
                v-model="searchQuery"
                type="text"
                class="form-control border-start-0"
                placeholder="Rechercher un terme..."
              />
              <button
                v-if="searchQuery"
                type="button"
                class="btn btn-outline-secondary border-start-0"
                @click="searchQuery = ''"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>

          <!-- Sort Selector -->
          <div class="col-md-3">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-sort-down me-1"></i>Trier par
            </label>
            <select v-model="sortBy" class="form-select form-select-sm">
              <option value="recent">Plus récents d'abord</option>
              <option value="oldest">Plus anciens d'abord</option>
              <option value="alpha_asc">Alphabétique (A → Z)</option>
              <option value="alpha_desc">Alphabétique (Z → A)</option>
              <option value="lookups">Plus consultés</option>
            </select>
          </div>
        </div>

        <!-- Badges summary -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top small text-body-secondary">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="badge rounded-pill text-bg-primary">
              {{ filteredWords.length }} {{ filteredWords.length > 1 ? 'mots affichés' : 'mot affiché' }}
            </span>
            <span v-if="selectedBookId !== 'all'" class="text-body-secondary">
              pour <strong>{{ selectedBookTitle }}</strong>
            </span>
            <span v-else class="text-body-secondary">
              sur l'ensemble de votre bibliothèque
            </span>
          </div>

          <div v-if="selectedBookId !== 'all'" class="d-flex align-items-center gap-1">
            <button
              type="button"
              class="btn btn-link btn-sm p-0 text-decoration-none"
              @click="selectedBookId = 'all'"
            >
              Voir toutes mes lectures
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="loading"
      class="text-center py-5"
    >
      <div class="spinner-border text-primary mb-3" role="status"></div>
      <p class="text-body-secondary mb-0">Chargement de votre carnet de vocabulaire…</p>
    </div>

    <div
      v-else-if="allWords.length === 0"
      class="card border-0 shadow-sm text-center py-5 px-3"
    >
      <div class="py-4">
        <i class="bi bi-journal-text display-3 text-body-secondary d-block mb-3"></i>
        <h4 class="fw-bold mb-2">Votre carnet de vocabulaire est vide</h4>
        <p class="text-body-secondary mx-auto mb-4" style="max-width: 500px">
          Lorsque vous lisez un segment dans <strong>Aujourd'hui</strong>, sélectionnez n'importe quel mot inconnu avec votre curseur ou votre doigt pour afficher sa définition : il s'ajoutera automatiquement à ce carnet.
        </p>
        <RouterLink to="/today" class="btn btn-primary">
          <i class="bi bi-book-half me-2"></i>Commencer la lecture du jour
        </RouterLink>
      </div>
    </div>

    <div
      v-else-if="filteredWords.length === 0"
      class="card border-0 shadow-sm text-center py-5 px-3"
    >
      <div class="py-3">
        <i class="bi bi-funnel text-body-secondary fs-1 d-block mb-2"></i>
        <h5 class="fw-bold mb-1">Aucun mot trouvé</h5>
        <p class="text-body-secondary small mb-3">
          Aucun mot ne correspond à vos critères de recherche pour ce filtre.
        </p>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="resetFilters"
        >
          Réinitialiser les filtres
        </button>
      </div>
    </div>

    <!-- Words List -->
    <div v-else class="d-flex flex-column gap-3">
      <div
        v-for="item in filteredWords"
        :key="item.id"
        class="card shadow-sm border-0 word-card transition-all"
      >
        <div class="card-body p-3 p-md-4">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
            <!-- Word & phonetic -->
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h4 class="fw-bold mb-0 text-capitalize text-primary">
                {{ item.word }}
              </h4>

              <span
                v-if="item.pronunciation"
                class="badge text-bg-secondary font-monospace"
                title="Prononciation phonétique"
              >
                {{ item.pronunciation }}
              </span>

              <button
                v-if="item.audioUrl"
                type="button"
                class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                title="Écouter la prononciation"
                @click="playAudio(item.audioUrl)"
              >
                <i class="bi bi-volume-up-fill"></i>
              </button>

              <span
                v-if="item.lookupCount > 1"
                class="badge rounded-pill text-bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                :title="`Consulté ${item.lookupCount} fois`"
              >
                Consulté {{ item.lookupCount }}x
              </span>
            </div>

            <!-- Context Book & Actions -->
            <div class="d-flex align-items-center gap-2">
              <span
                v-if="item.bookTitle"
                class="badge text-bg-light border text-truncate"
                style="max-width: 220px"
                :title="`Livre : ${item.bookTitle}`"
              >
                <i class="bi bi-book me-1"></i>{{ item.bookTitle }}
              </span>

              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0 px-2"
                :title="`Copier la définition de « ${item.word} »`"
                @click="copyWordText(item)"
              >
                <i class="bi" :class="copiedId === item.id ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
              </button>

              <button
                type="button"
                class="btn btn-sm btn-outline-danger py-0 px-2"
                title="Supprimer ce mot du carnet"
                @click="deleteWord(item.id)"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <!-- Grammatical Category & Etymology -->
          <div class="d-flex align-items-center gap-2 mb-2 flex-wrap small">
            <span v-if="item.partOfSpeech" class="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
              {{ item.partOfSpeech }}
            </span>
            <span class="text-body-secondary">
              <i class="bi bi-clock me-1"></i>{{ formatDate(item.lookedUpAt) }}
            </span>
            <span v-if="item.providerName" class="text-body-secondary fst-italic">
              via {{ item.providerName }}
            </span>
          </div>

          <div
            v-if="item.etymology"
            class="p-2 mb-2 rounded bg-body-tertiary small text-body-secondary border-start border-2 border-info"
          >
            <strong>Étymologie :</strong> {{ item.etymology }}
          </div>

          <!-- Definitions list -->
          <div class="text-body">
            <p v-if="item.topDefinition && (!item.entries || item.entries.length <= 1)" class="mb-2 lh-base">
              {{ item.topDefinition }}
            </p>

            <div v-else-if="item.entries && item.entries.length > 0">
              <div
                v-for="(entry, eIdx) in (expandedWords.has(item.id) ? item.entries : item.entries.slice(0, 1))"
                :key="eIdx"
                class="mb-2"
              >
                <div v-if="item.entries.length > 1" class="small fw-semibold text-secondary mb-1">
                  {{ entry.partOfSpeech }} :
                </div>
                <ol class="ps-3 mb-1">
                  <li
                    v-for="(def, dIdx) in (expandedWords.has(item.id) ? entry.definitions : entry.definitions.slice(0, 2))"
                    :key="dIdx"
                    class="mb-1 lh-base"
                  >
                    {{ def }}
                  </li>
                </ol>
              </div>

              <!-- Expand / collapse button if multiple definitions -->
              <button
                v-if="item.entries.length > 1 || item.entries[0]?.definitions?.length > 2"
                type="button"
                class="btn btn-link btn-sm p-0 text-decoration-none small"
                @click="toggleExpand(item.id)"
              >
                <i class="bi" :class="expandedWords.has(item.id) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                {{ expandedWords.has(item.id) ? 'Afficher moins' : 'Voir toutes les définitions' }}
              </button>
            </div>
          </div>

          <!-- Direct link to reference word if present -->
          <div
            v-if="item.referenceWords && item.referenceWords.length > 0"
            class="mt-2 pt-2 border-top d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <div class="d-flex align-items-center gap-1 small text-body-secondary">
              <i class="bi bi-arrow-right-circle-fill text-primary"></i>
              <span>Renvoie à la forme :</span>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 fw-bold text-primary text-decoration-none"
                title="Filtrer ou rechercher cette forme"
                @click="searchQuery = item.referenceWords[0]"
              >
                « {{ item.referenceWords[0] }} »
                <i class="bi bi-arrow-up-right-square small ms-1"></i>
              </button>
            </div>

            <a
              v-if="item.sourceUrl"
              :href="item.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="small text-decoration-none d-inline-flex align-items-center gap-1"
            >
              <span>Page source</span>
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </div>

          <!-- External Link -->
          <div v-else-if="item.sourceUrl" class="mt-2 pt-2 border-top d-flex justify-content-end">
            <a
              :href="item.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="small text-decoration-none d-inline-flex align-items-center gap-1"
            >
              <span>Consulter la page source</span>
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';

const route = useRoute();
const router = useRouter();
const libraryStore = useLibraryStore();

const allWords = ref([]);
const loading = ref(true);
const selectedBookId = ref('all');
const searchQuery = ref('');
const sortBy = ref('recent');
const expandedWords = ref(new Set());
const copiedId = ref(null);

let audioPlayer = null;

onMounted(async () => {
  await libraryStore.loadLibrary();
  // Check if bookId passed in route query
  if (route.query.bookId) {
    selectedBookId.value = route.query.bookId;
  }
  await loadWords();
});

async function loadWords() {
  loading.value = true;
  try {
    allWords.value = await libraryStore.getVocabulary('all');
  } finally {
    loading.value = false;
  }
}

function onBookChange() {
  // Update URL query parameter without reloading
  if (selectedBookId.value === 'all') {
    router.replace({ query: {} });
  } else {
    router.replace({ query: { bookId: selectedBookId.value } });
  }
}

function countForBook(bookId) {
  return allWords.value.filter((w) => w.bookId === bookId).length;
}

const selectedBookTitle = computed(() => {
  if (selectedBookId.value === 'all') return 'Toutes mes lectures';
  if (selectedBookId.value === 'general') return 'Lectures libres';
  const found = libraryStore.books.find((b) => b.id === selectedBookId.value);
  return found?.title || 'Livre sélectionné';
});

const filteredWords = computed(() => {
  let list = allWords.value;

  // Filter by book
  if (selectedBookId.value !== 'all') {
    list = list.filter((w) => w.bookId === selectedBookId.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((w) => {
      const matchWord = w.word?.toLowerCase().includes(q);
      const matchDef = w.topDefinition?.toLowerCase().includes(q);
      const matchPos = w.partOfSpeech?.toLowerCase().includes(q);
      const matchBook = w.bookTitle?.toLowerCase().includes(q);
      return matchWord || matchDef || matchPos || matchBook;
    });
  }

  // Sort list
  return [...list].sort((a, b) => {
    switch (sortBy.value) {
      case 'oldest':
        return new Date(a.lookedUpAt) - new Date(b.lookedUpAt);
      case 'alpha_asc':
        return a.word.localeCompare(b.word, 'fr', { sensitivity: 'base' });
      case 'alpha_desc':
        return b.word.localeCompare(a.word, 'fr', { sensitivity: 'base' });
      case 'lookups':
        return (b.lookupCount || 1) - (a.lookupCount || 1);
      case 'recent':
      default:
        return new Date(b.lookedUpAt) - new Date(a.lookedUpAt);
    }
  });
});

function resetFilters() {
  selectedBookId.value = 'all';
  searchQuery.value = '';
  sortBy.value = 'recent';
}

function toggleExpand(id) {
  if (expandedWords.value.has(id)) {
    expandedWords.value.delete(id);
  } else {
    expandedWords.value.add(id);
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const now = new Date();
  const diffHours = (now - date) / (1000 * 60 * 60);

  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

async function copyWordText(item) {
  const text = `${item.word} (${item.partOfSpeech || 'terme'})\n${item.topDefinition}\nSource: ${item.sourceUrl || item.providerName}`;
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = item.id;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch {
    // Clipboard failed
  }
}

async function deleteWord(id) {
  await libraryStore.deleteVocabularyWord(id);
  allWords.value = allWords.value.filter((w) => w.id !== id);
}

async function clearCurrentVocabulary() {
  const targetLabel = selectedBookId.value === 'all'
    ? 'tous les mots de toutes vos lectures'
    : `les mots du livre « ${selectedBookTitle.value} »`;

  if (confirm(`Voulez-vous vraiment effacer ${targetLabel} de votre carnet ?`)) {
    await libraryStore.clearVocabulary(selectedBookId.value);
    await loadWords();
  }
}

function exportVocabularyTxt() {
  if (filteredWords.value.length === 0) return;

  const lines = [
    `# CARNET DE VOCABULAIRE — ${selectedBookTitle.value.toUpperCase()}`,
    `# Exporté le ${new Date().toLocaleDateString('fr-FR')} (${filteredWords.value.length} mots)`,
    '',
  ];

  for (const item of filteredWords.value) {
    lines.push(`• ${item.word.toUpperCase()} ${item.pronunciation ? `[${item.pronunciation}]` : ''} (${item.partOfSpeech || ''})`);
    lines.push(`  Livre: ${item.bookTitle || 'Général'}`);
    lines.push(`  Définition: ${item.topDefinition || ''}`);
    if (item.etymology) lines.push(`  Étymologie: ${item.etymology}`);
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocabulaire-${selectedBookId.value === 'all' ? 'toutes-lectures' : 'livre'}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<style scoped>
.word-card {
  border-left: 4px solid var(--bs-primary) !important;
}
.transition-all {
  transition: all 0.2s ease-in-out;
}
.word-card:hover {
  transform: translateY(-1px);
}
</style>
