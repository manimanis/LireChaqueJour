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

      <div class="d-flex align-items-center gap-2 flex-wrap">
        <!-- Start Flashcards Practice Button (Point 1) -->
        <button
          v-if="filteredWords.length > 0"
          type="button"
          class="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm px-3"
          title="Lancer une session d'entraînement Flashcards"
          @click="startFlashcardsMode"
        >
          <i class="bi bi-play-circle-fill"></i>
          <span>Flashcards</span>
        </button>

        <!-- Mini-Quiz QCM Button (Axe 6) -->
        <button
          v-if="filteredWords.length >= 3"
          type="button"
          class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-sm px-3"
          title="Lancer un mini-quiz d'ancrage mémoriel à choix multiples"
          @click="showQuizModal = true"
        >
          <i class="bi bi-patch-question-fill text-warning"></i>
          <span>Mini-Quiz</span>
        </button>

        <!-- Export Dropdown -->
        <div v-if="filteredWords.length > 0" class="btn-group">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i class="bi bi-download"></i>
            <span>Exporter</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm small">
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2" @click="exportAnkiCsv">
                <i class="bi bi-file-earmark-spreadsheet text-success"></i>
                <span>Fiches Anki / Quizlet (.csv)</span>
              </button>
            </li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2" @click="exportVocabularyTxt">
                <i class="bi bi-file-text text-primary"></i>
                <span>Fichier Texte lisible (.txt)</span>
              </button>
            </li>
          </ul>
        </div>

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
          <div class="col-md-4">
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
          <div class="col-md-3">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-search me-1"></i>Rechercher
            </label>
            <div class="input-group input-group-sm">
              <input
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Mot, sens..."
              />
              <button
                v-if="searchQuery"
                type="button"
                class="btn btn-outline-secondary"
                @click="searchQuery = ''"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>

          <!-- Mastery Filter (SRS) -->
          <div class="col-md-3">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-award me-1"></i>Niveau de maîtrise
            </label>
            <select v-model="masteryFilter" class="form-select form-select-sm">
              <option value="all">Tous les statuts</option>
              <option value="to_review">À réviser ({{ countByMastery(0) }})</option>
              <option value="in_progress">En cours ({{ countByMastery(1) }})</option>
              <option value="mastered">Maîtrisés ({{ countByMastery(2) }})</option>
            </select>
          </div>

          <!-- Sort Selector -->
          <div class="col-md-2">
            <label class="form-label small fw-semibold text-body-secondary mb-1">
              <i class="bi bi-sort-down me-1"></i>Trier
            </label>
            <select v-model="sortBy" class="form-select form-select-sm">
              <option value="recent">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="alpha_asc">A → Z</option>
              <option value="alpha_desc">Z → A</option>
              <option value="lookups">Fréquence</option>
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
          Lorsque vous lisez un segment dans <strong>Aujourd'hui</strong>, sélectionnez n'importe quel mot avec votre curseur pour afficher sa définition : il s'ajoutera automatiquement avec sa phrase de contexte.
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
          Aucun mot ne correspond à vos filtres actuels.
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
            <!-- Word & phonetic & audio -->
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

              <!-- Universal Voice Pronunciation Button (Point 3) -->
              <button
                type="button"
                class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                :class="{ 'btn-primary text-white': speakingWordId === item.id }"
                title="Écouter la prononciation vocale"
                @click="playVoiceForWord(item)"
              >
                <i class="bi" :class="speakingWordId === item.id ? 'bi-volume-up-fill animate-pulse' : 'bi-volume-up'"></i>
              </button>

              <!-- Mastery Badge (Point 1 SRS) -->
              <span
                v-if="item.masteryLevel === 2"
                class="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle d-inline-flex align-items-center gap-1"
                title="Maîtrisé"
              >
                <i class="bi bi-check-circle-fill"></i>
                <span>Maîtrisé</span>
              </span>
              <span
                v-else-if="item.masteryLevel === 1"
                class="badge rounded-pill text-bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                title="En cours d'apprentissage"
              >
                En cours
              </span>
              <span
                v-else
                class="badge rounded-pill text-bg-light border text-body-secondary"
                title="À réviser"
              >
                À réviser
              </span>

              <span
                v-if="item.lookupCount > 1"
                class="badge rounded-pill text-bg-secondary-subtle text-secondary-emphasis"
                :title="`Consulté ${item.lookupCount} fois`"
              >
                {{ item.lookupCount }}x
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

          <!-- Grammatical Category & Timestamp -->
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

          <!-- Reading Context Sentence Snippet (Point 2) -->
          <div
            v-if="item.contextSentence"
            class="p-2 mb-3 rounded bg-body-tertiary small border-start border-3 border-primary"
          >
            <div class="fw-semibold text-primary mb-1">
              <i class="bi bi-chat-quote-fill me-1"></i>Contexte de lecture :
            </div>
            <div class="fst-italic text-body">
              « {{ item.contextSentence }} »
            </div>
          </div>

          <!-- Etymology if present -->
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
                title="Consulter cette forme"
                @click="triggerWordLookup(item.referenceWords[0], item.contextSentence)"
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

    <!-- ========================================== -->
    <!-- INTERACTIVE FLASHCARDS MODAL (Point 1 SRS) -->
    <!-- ========================================== -->
    <div
      v-if="isFlashcardsOpen"
      class="flashcards-overlay position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center p-3"
      style="z-index: 1090; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px)"
    >
      <div class="flashcards-container w-100" style="max-width: 620px">
        <!-- Flashcard Header Bar -->
        <div class="d-flex justify-content-between align-items-center text-white mb-3">
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-primary rounded-pill px-3 py-2">
              Carte {{ currentFlashcardIndex + 1 }} / {{ flashcardList.length }}
            </span>
            <span v-if="currentCard?.bookTitle" class="badge text-bg-light text-truncate" style="max-width: 200px">
              {{ currentCard.bookTitle }}
            </span>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-outline-light rounded-pill px-3"
            @click="closeFlashcards"
          >
            <i class="bi bi-x-lg me-1"></i>Quitter
          </button>
        </div>

        <!-- The Flashcard Card (Click to flip) -->
        <div
          v-if="currentCard"
          class="card border-0 shadow-lg rounded-4 flashcard cursor-pointer"
          style="min-height: 380px"
          @click="toggleCardFlip"
        >
          <div class="card-body p-4 p-md-5 d-flex flex-column justify-content-between">
            <!-- Top Card Tag -->
            <div class="d-flex justify-content-between align-items-center text-body-secondary small mb-3">
              <span class="text-uppercase fw-bold letter-spacing">
                {{ isCardFlipped ? 'Définition & Sens' : 'Mot à mémoriser' }}
              </span>
              <span class="small text-body-secondary">
                <i class="bi bi-arrow-repeat me-1"></i>Cliquer pour retourner
              </span>
            </div>

            <!-- Card Content (Front vs Back) -->
            <div class="my-auto text-center">
              <!-- FRONT: Word + Cloze context -->
              <div v-if="!isCardFlipped">
                <h2 class="display-5 fw-bold text-primary mb-2 text-capitalize">
                  {{ currentCard.word }}
                </h2>

                <div v-if="currentCard.pronunciation" class="text-body-secondary font-monospace fs-5 mb-3">
                  {{ currentCard.pronunciation }}
                </div>

                <div class="mb-4">
                  <button
                    type="button"
                    class="btn btn-outline-primary rounded-pill btn-sm px-3"
                    @click.stop="playVoiceForWord(currentCard)"
                  >
                    <i class="bi bi-volume-up-fill me-1"></i>Écouter
                  </button>
                </div>

                <!-- Cloze context sentence with word blanked out -->
                <div
                  v-if="currentCard.contextSentence"
                  class="p-3 rounded bg-body-tertiary small fst-italic text-body text-start border-start border-3 border-primary"
                >
                  <div class="fw-bold text-primary mb-1 not-italic">
                    <i class="bi bi-chat-quote-fill me-1"></i>Phrase de votre livre :
                  </div>
                  <div>
                    « {{ formatCloze(currentCard.contextSentence, currentCard.word) }} »
                  </div>
                </div>
              </div>

              <!-- BACK: Full definition + Revealed Context -->
              <div v-else class="text-start">
                <div class="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom">
                  <div>
                    <h3 class="fw-bold text-primary mb-0 text-capitalize d-inline-block me-2">
                      {{ currentCard.word }}
                    </h3>
                    <span v-if="currentCard.partOfSpeech" class="badge text-bg-primary-subtle text-primary-emphasis">
                      {{ currentCard.partOfSpeech }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                    @click.stop="playVoiceForWord(currentCard)"
                  >
                    <i class="bi bi-volume-up-fill"></i>
                  </button>
                </div>

                <div class="mb-3">
                  <div class="fw-semibold text-body mb-1">Définition :</div>
                  <p class="fs-6 lh-base mb-0">
                    {{ currentCard.topDefinition || currentCard.entries?.[0]?.definitions?.[0] }}
                  </p>
                </div>

                <div
                  v-if="currentCard.contextSentence"
                  class="p-2 mb-2 rounded bg-body-tertiary small fst-italic text-body border-start border-3 border-success"
                >
                  <div class="fw-bold text-success mb-1 not-italic">
                    <i class="bi bi-check2-circle me-1"></i>Dans le texte :
                  </div>
                  <div>
                    « {{ currentCard.contextSentence }} »
                  </div>
                </div>

                <div v-if="currentCard.etymology" class="small text-body-secondary">
                  <strong>Étymologie :</strong> {{ currentCard.etymology }}
                </div>
              </div>
            </div>

            <!-- Card Bottom Action Hint -->
            <div class="text-center pt-3 border-top">
              <span v-if="!isCardFlipped" class="btn btn-outline-secondary rounded-pill btn-sm">
                Voir la réponse
              </span>
              <span v-else class="small text-body-secondary">
                Évaluez votre mémorisation ci-dessous :
              </span>
            </div>
          </div>
        </div>

        <!-- SRS Evaluation Buttons (visible when flipped) -->
        <div v-if="isCardFlipped" class="d-flex gap-2 justify-content-center mt-3 animate-fade-in">
          <button
            type="button"
            class="btn btn-danger btn-lg flex-grow-1 rounded-pill shadow-sm"
            @click="rateCard(0)"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>À revoir
          </button>
          <button
            type="button"
            class="btn btn-warning btn-lg flex-grow-1 rounded-pill shadow-sm text-dark"
            @click="rateCard(1)"
          >
            <i class="bi bi-hand-thumbs-up me-1"></i>Presque
          </button>
          <button
            type="button"
            class="btn btn-success btn-lg flex-grow-1 rounded-pill shadow-sm"
            @click="rateCard(2)"
          >
            <i class="bi bi-check2-all me-1"></i>Maîtrisé
          </button>
        </div>

        <!-- Next / Previous Controls if not flipped -->
        <div v-else class="d-flex justify-content-between align-items-center mt-3">
          <button
            type="button"
            class="btn btn-outline-light rounded-pill px-3"
            :disabled="currentFlashcardIndex === 0"
            @click="currentFlashcardIndex--"
          >
            <i class="bi bi-chevron-left me-1"></i>Précédent
          </button>
          <button
            type="button"
            class="btn btn-primary rounded-pill px-4"
            @click="toggleCardFlip"
          >
            Révéler la définition
          </button>
          <button
            type="button"
            class="btn btn-outline-light rounded-pill px-3"
            :disabled="currentFlashcardIndex >= flashcardList.length - 1"
            @click="currentFlashcardIndex++"
          >
            Suivant<i class="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mini-Quiz Modal (Axe 6) -->
    <VocabularyQuizModal
      :show="showQuizModal"
      :book-id="selectedBookId"
      @close="showQuizModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import VocabularyQuizModal from '@/components/VocabularyQuizModal.vue';
import {
  speakWord,
  generateAnkiCsv,
  triggerWordLookup,
} from '@/services/dictionaryService.js';

const route = useRoute();
const router = useRouter();
const libraryStore = useLibraryStore();

const allWords = ref([]);
const loading = ref(true);
const selectedBookId = ref('all');
const searchQuery = ref('');
const masteryFilter = ref('all');
const sortBy = ref('recent');
const expandedWords = ref(new Set());
const copiedId = ref(null);
const speakingWordId = ref(null);
const showQuizModal = ref(false);

// Flashcards state (Point 1 SRS)
const isFlashcardsOpen = ref(false);
const currentFlashcardIndex = ref(0);
const isCardFlipped = ref(false);

onMounted(async () => {
  await libraryStore.loadLibrary();
  if (route.query.bookId) {
    selectedBookId.value = route.query.bookId;
  }
  await loadWords();

  // If URL has ?mode=flashcards, auto-open flashcards
  if (route.query.mode === 'flashcards' && allWords.value.length > 0) {
    startFlashcardsMode();
  }
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
  if (selectedBookId.value === 'all') {
    router.replace({ query: {} });
  } else {
    router.replace({ query: { bookId: selectedBookId.value } });
  }
}

function countForBook(bookId) {
  return allWords.value.filter((w) => w.bookId === bookId).length;
}

function countByMastery(level) {
  return allWords.value.filter((w) => (w.masteryLevel || 0) === level).length;
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

  // Filter by mastery level (SRS)
  if (masteryFilter.value === 'to_review') {
    list = list.filter((w) => (w.masteryLevel || 0) === 0);
  } else if (masteryFilter.value === 'in_progress') {
    list = list.filter((w) => w.masteryLevel === 1);
  } else if (masteryFilter.value === 'mastered') {
    list = list.filter((w) => w.masteryLevel === 2);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((w) => {
      const matchWord = w.word?.toLowerCase().includes(q);
      const matchDef = w.topDefinition?.toLowerCase().includes(q);
      const matchPos = w.partOfSpeech?.toLowerCase().includes(q);
      const matchBook = w.bookTitle?.toLowerCase().includes(q);
      const matchContext = w.contextSentence?.toLowerCase().includes(q);
      return matchWord || matchDef || matchPos || matchBook || matchContext;
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
  masteryFilter.value = 'all';
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

// Universal Voice Pronunciation (Point 3)
function playVoiceForWord(item) {
  if (!item?.word) return;
  speakingWordId.value = item.id;
  const lang = item.provider === 'dictionary_api_en' ? 'en-US' : 'fr-FR';
  speakWord(item.word, lang, () => {
    speakingWordId.value = null;
  });
}

async function copyWordText(item) {
  let text = `${item.word} (${item.partOfSpeech || 'terme'})\n${item.topDefinition}`;
  if (item.contextSentence) {
    text += `\nContexte : « ${item.contextSentence} »`;
  }
  text += `\nSource: ${item.sourceUrl || item.providerName}`;

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

// Flashcards functions (Point 1 SRS)
const flashcardList = computed(() => {
  return filteredWords.value.length > 0 ? filteredWords.value : allWords.value;
});

const currentCard = computed(() => {
  return flashcardList.value[currentFlashcardIndex.value] || null;
});

function startFlashcardsMode() {
  if (flashcardList.value.length === 0) return;
  currentFlashcardIndex.value = 0;
  isCardFlipped.value = false;
  isFlashcardsOpen.value = true;
}

function closeFlashcards() {
  isFlashcardsOpen.value = false;
  isCardFlipped.value = false;
}

function toggleCardFlip() {
  isCardFlipped.value = !isCardFlipped.value;
}

async function rateCard(masteryLevel) {
  if (!currentCard.value) return;
  await libraryStore.updateWordMastery(currentCard.value.id, masteryLevel);
  currentCard.value.masteryLevel = masteryLevel;

  // Advance to next card or finish
  if (currentFlashcardIndex.value < flashcardList.value.length - 1) {
    currentFlashcardIndex.value++;
    isCardFlipped.value = false;
  } else {
    alert('🎉 Félicitations ! Vous avez révisé toutes les cartes de cette session.');
    closeFlashcards();
    await loadWords();
  }
}

function formatCloze(sentence, word) {
  if (!sentence || !word) return sentence;
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  return sentence.replace(regex, '[ ... ]');
}

// Anki CSV Export (Point 1)
function exportAnkiCsv() {
  const wordsToExport = filteredWords.value.length > 0 ? filteredWords.value : allWords.value;
  if (wordsToExport.length === 0) return;

  const csvContent = generateAnkiCsv(wordsToExport);
  const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anki-vocabulaire-${selectedBookId.value === 'all' ? 'toutes-lectures' : 'livre'}-${new Date().toISOString().slice(0, 10)}.tsv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Plain text Export
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
    if (item.contextSentence) lines.push(`  Contexte: « ${item.contextSentence} »`);
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

.flashcard {
  transition: transform 0.25s ease-in-out, box-shadow 0.25s ease;
  user-select: none;
}
.flashcard:hover {
  transform: scale(1.01);
}

.cursor-pointer {
  cursor: pointer;
}

.animate-pulse {
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
