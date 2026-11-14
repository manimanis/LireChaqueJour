<template>
  <div class="card border-0 shadow-sm">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="card-title mb-0">
          <i class="bi bi-file-earmark-plus text-primary me-2"></i>Ajouter un livre EPUB
        </h5>
        <button
          v-if="showClose"
          type="button"
          class="btn-close"
          aria-label="Fermer"
          :disabled="isImporting"
          @click="$emit('close')"
        ></button>
      </div>

      <div
        class="dropzone-area mb-3"
        :class="{ 'is-dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".epub,application/epub+zip"
          class="d-none"
          :disabled="isImporting"
          @change="handleFileSelect"
        />
        <i class="bi bi-cloud-arrow-up fs-1 text-primary d-block mb-2"></i>
        <p class="fw-semibold mb-1">
          Cliquez pour sélectionner un fichier EPUB ou glissez-le ici
        </p>
        <p class="text-body-secondary small mb-0">
          Traitement 100 % local sur votre appareil — aucune donnée envoyée sur Internet
        </p>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label class="form-label small fw-semibold">Mots par jour (100 – 5000)</label>
          <input
            v-model.number="wordsPerDay"
            type="number"
            min="100"
            max="5000"
            step="50"
            class="form-control form-control-sm"
            :disabled="isImporting"
          />
        </div>
        <div class="col-sm-6 d-flex align-items-end">
          <div class="form-check form-switch mb-1">
            <input
              id="importReadWeekends"
              v-model="readWeekends"
              class="form-check-input"
              type="checkbox"
              :disabled="isImporting"
            />
            <label class="form-check-label small" for="importReadWeekends">
              Lecture le week-end
            </label>
          </div>
        </div>
      </div>

      <div v-if="isImporting" class="mb-2">
        <div class="d-flex justify-content-between small mb-1">
          <span>{{ statusText }}</span>
          <span class="fw-semibold">{{ progressPct }} %</span>
        </div>
        <div class="progress" style="height: 8px">
          <div
            class="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            :style="{ width: `${progressPct}%` }"
          ></div>
        </div>
      </div>

      <div v-if="errorMsg" class="alert alert-danger py-2 px-3 small mb-0">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';

defineProps({
  showClose: { type: Boolean, default: false },
});

const emit = defineEmits(['imported', 'close']);

const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const fileInput = ref(null);
const isDragging = ref(false);
const isImporting = ref(false);
const progressPct = ref(0);
const statusText = ref('');
const errorMsg = ref('');

const wordsPerDay = ref(settingsStore.defaultWordsPerDay);
const readWeekends = ref(settingsStore.defaultReadWeekends);

async function processFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.epub')) {
    errorMsg.value = 'Veuillez sélectionner un fichier au format .epub.';
    return;
  }

  errorMsg.value = '';
  isImporting.value = true;
  progressPct.value = 0;
  statusText.value = 'Préparation de l’import…';

  try {
    const safeWords = Math.min(5000, Math.max(100, Number(wordsPerDay.value) || 400));
    const book = await libraryStore.importBook(
      file,
      {
        wordsPerDay: safeWords,
        tolerance: settingsStore.defaultTolerance,
        readWeekends: readWeekends.value,
      },
      (pct, text) => {
        progressPct.value = pct;
        statusText.value = text;
      }
    );
    emit('imported', book);
  } catch (err) {
    errorMsg.value = err?.message || "Erreur lors de l'import du livre EPUB.";
  } finally {
    isImporting.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  processFile(file);
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  processFile(file);
}
</script>
