<template>
  <div v-if="show">
    <!-- Backdrop -->
    <div class="modal-backdrop fade show" style="z-index: 1090" @click="closeModal"></div>

    <!-- Modal Dialog -->
    <div
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="z-index: 1095"
      @keydown.esc="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered" style="max-width: 540px">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <!-- Header -->
          <div class="modal-header border-0 pb-1 pt-3 px-4">
            <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
              <i class="bi bi-patch-question text-primary"></i>
              <span>Mini-Quiz Vocabulaire</span>
            </h5>
            <button type="button" class="btn-close" aria-label="Fermer" @click="closeModal"></button>
          </div>

          <!-- Body -->
          <div class="modal-body px-4 py-3">
            <!-- Case 1: Not enough words -->
            <div v-if="questions.length === 0" class="text-center py-4">
              <i class="bi bi-journal-plus fs-1 text-primary d-block mb-2"></i>
              <h6 class="fw-bold mb-2">Pas assez de mots enregistrés</h6>
              <p class="text-body-secondary small mb-3">
                Vous devez avoir enregistré au moins 3 mots dans votre carnet de vocabulaire pour générer un quiz d'ancrage mémoriel.
              </p>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeModal">
                Fermer
              </button>
            </div>

            <!-- Case 2: Quiz finished -->
            <div v-else-if="quizFinished" class="text-center py-4">
              <div class="mb-3">
                <i
                  class="bi fs-1"
                  :class="score === questions.length ? 'bi-trophy-fill text-warning animate-bounce' : 'bi-award text-primary'"
                ></i>
              </div>
              <h4 class="fw-bold mb-1">Quiz terminé !</h4>
              <p class="text-body-secondary mb-3">
                Votre score : <strong class="fs-5 text-primary">{{ score }} / {{ questions.length }}</strong>
              </p>
              <div v-if="score === questions.length" class="alert alert-success py-2 px-3 small rounded-3 mb-3">
                🎉 Bravo ! Vous maîtrisez parfaitement ces mots de votre carnet !
              </div>
              <div v-else class="alert alert-info py-2 px-3 small rounded-3 mb-3">
                Bon travail ! Les mots réussis ont été réhaussés dans votre suivi de maîtrise.
              </div>

              <div class="d-flex justify-content-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="restartQuiz">
                  <i class="bi bi-arrow-repeat me-1"></i>Rejouer un quiz
                </button>
                <button type="button" class="btn btn-sm btn-primary" @click="closeModal">
                  Terminer
                </button>
              </div>
            </div>

            <!-- Case 3: Question active -->
            <div v-else-if="currentQuestion">
              <div class="d-flex justify-content-between align-items-center mb-3 text-body-secondary small">
                <span>Question {{ currentIdx + 1 }} sur {{ questions.length }}</span>
                <span class="badge text-bg-primary-subtle text-primary border border-primary-subtle">
                  Score : {{ score }}
                </span>
              </div>

              <div class="progress mb-4" style="height: 6px">
                <div
                  class="progress-bar bg-primary"
                  role="progressbar"
                  :style="{ width: `${((currentIdx + 1) / questions.length) * 100}%` }"
                ></div>
              </div>

              <!-- Question Prompt -->
              <div class="card bg-body-tertiary border-0 rounded-3 p-3 mb-4 text-center">
                <div class="small text-body-secondary text-uppercase fw-semibold mb-1">
                  Que signifie le mot :
                </div>
                <div class="d-flex align-items-center justify-content-center gap-2">
                  <h3 class="fw-bold mb-0 text-capitalize text-primary">
                    {{ currentQuestion.word.word }}
                  </h3>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1"
                    title="Prononciation vocale"
                    @click="speak(currentQuestion.word.word)"
                  >
                    <i class="bi bi-volume-up"></i>
                  </button>
                </div>
                <div v-if="currentQuestion.word.partOfSpeech" class="small text-body-secondary mt-1 fst-italic">
                  ({{ currentQuestion.word.partOfSpeech }})
                </div>
              </div>

              <!-- Options -->
              <div class="d-flex flex-column gap-2 mb-3">
                <button
                  v-for="(opt, oIdx) in currentQuestion.options"
                  :key="oIdx"
                  type="button"
                  class="btn text-start p-3 rounded-3 border d-flex align-items-center justify-content-between gap-2"
                  :class="getOptionClass(oIdx)"
                  :disabled="answered"
                  @click="selectAnswer(oIdx)"
                >
                  <span class="small">{{ opt.definition }}</span>
                  <i v-if="answered && oIdx === currentQuestion.correctIdx" class="bi bi-check-circle-fill text-success fs-5"></i>
                  <i v-else-if="answered && selectedIdx === oIdx && !opt.isCorrect" class="bi bi-x-circle-fill text-danger fs-5"></i>
                </button>
              </div>

              <!-- Feedback & Next Button -->
              <div v-if="answered" class="mt-3 text-end animate-fade-in">
                <button type="button" class="btn btn-primary btn-sm px-4 rounded-pill" @click="nextQuestion">
                  <span>{{ currentIdx < questions.length - 1 ? 'Question suivante' : 'Voir les résultats' }}</span>
                  <i class="bi bi-arrow-right ms-1"></i>
                </button>
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
import { useLibraryStore } from '@/stores/libraryStore.js';
import { speakWord } from '@/services/dictionaryService.js';

const props = defineProps({
  show: { type: Boolean, default: false },
  bookId: { type: String, default: null },
});

const emit = defineEmits(['close']);

const libraryStore = useLibraryStore();

const questions = ref([]);
const currentIdx = ref(0);
const score = ref(0);
const answered = ref(false);
const selectedIdx = ref(null);
const quizFinished = ref(false);

const currentQuestion = computed(() => questions.value[currentIdx.value] || null);

function speak(word) {
  if (word) speakWord(word, 'fr-FR');
}

function closeModal() {
  emit('close');
}

async function prepareQuiz() {
  quizFinished.value = false;
  currentIdx.value = 0;
  score.value = 0;
  answered.value = false;
  selectedIdx.value = null;

  const vocab = await libraryStore.getVocabulary(props.bookId);
  const validWords = (vocab || []).filter(w => w.word && w.topDefinition);

  if (validWords.length < 3) {
    questions.value = [];
    return;
  }

  // Pick up to 5 random words for questions
  const shuffled = [...validWords].sort(() => 0.5 - Math.random());
  const selectedPool = shuffled.slice(0, Math.min(5, shuffled.length));

  questions.value = selectedPool.map((targetWord) => {
    // Pick 2 distractors from the remaining words
    const otherWords = validWords.filter(w => w.id !== targetWord.id);
    const distractorPool = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 2);

    const options = [
      { definition: targetWord.topDefinition, isCorrect: true },
      ...distractorPool.map(d => ({ definition: d.topDefinition, isCorrect: false })),
    ].sort(() => 0.5 - Math.random());

    const correctIdx = options.findIndex(o => o.isCorrect);

    return {
      word: targetWord,
      options,
      correctIdx,
    };
  });
}

function selectAnswer(index) {
  if (answered.value) return;
  answered.value = true;
  selectedIdx.value = index;

  const isCorrect = index === currentQuestion.value.correctIdx;
  if (isCorrect) {
    score.value++;
    // Upgrade mastery in DB
    const wordId = currentQuestion.value.word.id;
    if (wordId) {
      libraryStore.updateWordMastery(wordId, 2);
    }
  }
}

function nextQuestion() {
  answered.value = false;
  selectedIdx.value = null;
  if (currentIdx.value < questions.value.length - 1) {
    currentIdx.value++;
  } else {
    quizFinished.value = true;
  }
}

function restartQuiz() {
  prepareQuiz();
}

function getOptionClass(idx) {
  if (!answered.value) {
    return 'btn-light border-secondary-subtle';
  }
  if (idx === currentQuestion.value.correctIdx) {
    return 'btn-success-subtle border-success text-success-emphasis fw-semibold';
  }
  if (idx === selectedIdx.value) {
    return 'btn-danger-subtle border-danger text-danger-emphasis';
  }
  return 'btn-light opacity-50';
}

watch(
  () => props.show,
  (show) => {
    if (show) prepareQuiz();
  },
  { immediate: true }
);
</script>

<style scoped>
.animate-bounce {
  animation: bounce 1s infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}
</style>
