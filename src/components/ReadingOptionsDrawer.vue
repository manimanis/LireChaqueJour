<template>
  <div
    v-if="show"
    class="modal-backdrop fade show"
    style="z-index: 1075"
    @click="$emit('close')"
  ></div>

  <div
    v-if="show"
    class="offcanvas offcanvas-end show"
    tabindex="-1"
    style="z-index: 1080; visibility: visible;"
  >
    <div class="offcanvas-header border-bottom">
      <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2">
        <span class="fs-5" style="font-family: serif;">Aa</span>
        <span>Confort de lecture</span>
      </h5>
      <button type="button" class="btn-close" aria-label="Fermer" @click="$emit('close')"></button>
    </div>

    <div class="offcanvas-body p-3">
      <!-- Police de caractères -->
      <div class="mb-4">
        <label class="form-label fw-semibold small text-body-secondary mb-2">Police de caractères</label>
        <div class="row g-2">
          <div
            v-for="f in ['Georgia', 'Merriweather', 'Open Sans', 'Arial']"
            :key="f"
            class="col-6"
          >
            <button
              type="button"
              class="btn btn-sm w-100 py-2 border text-start d-flex justify-content-between align-items-center"
              :class="settingsStore.fontFamily === f ? 'btn-primary' : 'btn-outline-light text-body border-secondary-subtle'"
              :style="{ fontFamily: f }"
              @click="settingsStore.fontFamily = f"
            >
              <span>{{ f }}</span>
              <i v-if="settingsStore.fontFamily === f" class="bi bi-check2"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Taille de texte -->
      <div class="mb-4">
        <label class="form-label fw-semibold small text-body-secondary mb-2">Taille du texte</label>
        <div class="d-flex align-items-center justify-content-between bg-body-tertiary rounded-3 p-2 border">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm px-3"
            :disabled="settingsStore.fontSize <= 12"
            @click="settingsStore.fontSize = Math.max(12, settingsStore.fontSize - 1)"
          >
            <span class="fw-bold" style="font-size: 0.85rem">A-</span>
          </button>
          <span class="fw-bold fs-6">{{ settingsStore.fontSize }} px</span>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm px-3"
            :disabled="settingsStore.fontSize >= 32"
            @click="settingsStore.fontSize = Math.min(32, settingsStore.fontSize + 1)"
          >
            <span class="fw-bold" style="font-size: 1.15rem">A+</span>
          </button>
        </div>
      </div>

      <!-- Thèmes de lecture -->
      <div class="mb-4">
        <label class="form-label fw-semibold small text-body-secondary mb-2">Thème de lecture</label>
        <div class="row g-2">
          <div class="col-6">
            <button
              type="button"
              class="btn btn-sm w-100 p-2 text-center rounded-3 border d-flex flex-column align-items-center gap-1"
              :class="settingsStore.readingTheme === 'default' ? 'border-primary border-2 shadow-sm' : 'border-secondary-subtle'"
              style="background-color: var(--bs-body-bg); color: var(--bs-body-color);"
              @click="settingsStore.readingTheme = 'default'"
            >
              <i class="bi bi-circle-half fs-5"></i>
              <span class="small fw-semibold">Défaut</span>
            </button>
          </div>
          <div class="col-6">
            <button
              type="button"
              class="btn btn-sm w-100 p-2 text-center rounded-3 border d-flex flex-column align-items-center gap-1"
              :class="settingsStore.readingTheme === 'sepia' ? 'border-primary border-2 shadow-sm' : 'border-secondary-subtle'"
              style="background-color: #fbf0d9; color: #5f4b32;"
              @click="settingsStore.readingTheme = 'sepia'"
            >
              <i class="bi bi-sun-fill fs-5" style="color: #c29d59;"></i>
              <span class="small fw-semibold">Sépia</span>
            </button>
          </div>
          <div class="col-6">
            <button
              type="button"
              class="btn btn-sm w-100 p-2 text-center rounded-3 border d-flex flex-column align-items-center gap-1"
              :class="settingsStore.readingTheme === 'ivory' ? 'border-primary border-2 shadow-sm' : 'border-secondary-subtle'"
              style="background-color: #fdf6e2; color: #383a42;"
              @click="settingsStore.readingTheme = 'ivory'"
            >
              <i class="bi bi-brightness-high fs-5" style="color: #d97706;"></i>
              <span class="small fw-semibold">Ivoire</span>
            </button>
          </div>
          <div class="col-6">
            <button
              type="button"
              class="btn btn-sm w-100 p-2 text-center rounded-3 border d-flex flex-column align-items-center gap-1"
              :class="settingsStore.readingTheme === 'oled' ? 'border-primary border-2 shadow-sm' : 'border-secondary-subtle'"
              style="background-color: #000000; color: #d1d5db;"
              @click="settingsStore.readingTheme = 'oled'"
            >
              <i class="bi bi-moon-stars-fill fs-5 text-light"></i>
              <span class="small fw-semibold text-light">Noir OLED</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mode de lecture (Défilement vs Pages) -->
      <div class="mb-4">
        <label class="form-label fw-semibold small text-body-secondary mb-2">Mode de lecture</label>
        <div class="btn-group w-100" role="group">
          <button
            type="button"
            class="btn btn-sm py-2"
            :class="settingsStore.readingMode !== 'paginated' ? 'btn-primary' : 'btn-outline-secondary'"
            @click="settingsStore.readingMode = 'scroll'"
          >
            <i class="bi bi-card-text me-1"></i>Défilement
          </button>
          <button
            type="button"
            class="btn btn-sm py-2"
            :class="settingsStore.readingMode === 'paginated' ? 'btn-primary' : 'btn-outline-secondary'"
            @click="settingsStore.readingMode = 'paginated'"
          >
            <i class="bi bi-book-half me-1"></i>Pages (Livre)
          </button>
        </div>
      </div>

      <!-- Options supplémentaires -->
      <div class="mb-3 pt-2 border-top">
        <div class="form-check form-switch mb-3">
          <input
            id="vocabHighlightCheck"
            v-model="settingsStore.highlightVocabularyWords"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label small" for="vocabHighlightCheck">
            Surligner le vocabulaire enregistré
          </label>
        </div>

        <div class="d-grid gap-2">
          <RouterLink
            to="/vocabulary"
            class="btn btn-outline-secondary btn-sm text-start d-flex justify-content-between align-items-center"
            @click="$emit('close')"
          >
            <span><i class="bi bi-journal-bookmark me-2 text-primary"></i>Mon carnet de vocabulaire</span>
            <i class="bi bi-chevron-right small"></i>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettingsStore } from '@/stores/settingsStore.js';

defineProps({
  show: { type: Boolean, default: false },
});

defineEmits(['close']);

const settingsStore = useSettingsStore();
</script>
