<template>
  <div class="card h-100 shadow-sm border">
    <div class="row g-0 h-100">
      <div class="col-4 col-sm-3 col-md-4 p-2 d-flex align-items-center">
        <div class="book-cover-wrapper w-100">
          <img v-if="book.cover" :src="book.cover" :alt="book.title" />
          <div v-else class="book-cover-placeholder">
            <i class="bi bi-book fs-1 mb-1"></i>
            <span class="small text-truncate w-100">EPUB</span>
          </div>
        </div>
      </div>

      <div class="col-8 col-sm-9 col-md-8 d-flex flex-column">
        <div class="card-body d-flex flex-column h-100 p-3">
          <div class="mb-2">
            <h5 class="card-title mb-1 text-truncate" :title="book.title">
              {{ book.title }}
            </h5>
            <p class="card-text text-body-secondary small mb-2 text-truncate">
              {{ book.author }}
            </p>
          </div>

          <div class="small text-body-secondary mb-2">
            <span class="me-3">
              <i class="bi bi-calendar3 me-1"></i>{{ book.totalSegments }} jours
            </span>
            <span>
              <i class="bi bi-speedometer2 me-1"></i>{{ book.wordsPerDay }} mots/j
            </span>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-content-between small mb-1">
              <span>Progression</span>
              <span class="fw-semibold">{{ progress.completion }} %</span>
            </div>
            <div class="progress" style="height: 8px">
              <div
                class="progress-bar"
                :class="progress.completion >= 100 ? 'bg-success' : 'bg-primary'"
                role="progressbar"
                :style="{ width: `${progress.completion}%` }"
              ></div>
            </div>
          </div>

          <div class="mt-auto d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-sm btn-primary flex-grow-1"
              @click="$emit('continue', book.id)"
            >
              <i class="bi bi-play-fill me-1"></i>
              {{ progress.completion >= 100 ? 'Relire' : 'Continuer' }}
            </button>

            <RouterLink
              :to="`/book/${book.id}`"
              class="btn btn-sm btn-outline-secondary"
              title="Modifier rythme & détails"
            >
              <i class="bi bi-sliders"></i>
            </RouterLink>

            <button
              type="button"
              class="btn btn-sm btn-outline-warning"
              title="Réinitialiser progression"
              @click="$emit('reset', book)"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>

            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              title="Supprimer"
              @click="$emit('delete', book)"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  book: { type: Object, required: true },
  progress: { type: Object, required: true },
});

defineEmits(['continue', 'reset', 'delete']);
</script>
