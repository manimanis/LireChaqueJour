<template>
  <div
    v-if="show"
    class="card border-0 shadow-sm mb-4 bg-primary text-white overflow-hidden rounded-4 animate-fade-in"
  >
    <div class="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-light rounded-circle p-2 lh-1 text-primary shadow-sm"
          :title="audioState.isPlaying ? 'Mettre en pause' : 'Écouter'"
          @click="$emit('toggle-play')"
        >
          <i class="bi" :class="audioState.isPlaying ? 'bi-pause-fill fs-5' : 'bi-play-fill fs-5'"></i>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-circle p-1 lh-1"
          title="Phrase précédente"
          @click="$emit('prev')"
        >
          <i class="bi bi-chevron-left"></i>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-circle p-1 lh-1"
          title="Phrase suivante"
          @click="$emit('next')"
        >
          <i class="bi bi-chevron-right"></i>
        </button>

        <div class="small ms-1 d-flex flex-column">
          <span class="fw-semibold">Livre Audio (TTS)</span>
          <span class="opacity-75" style="font-size: 0.75rem">
            Phrase {{ audioState.currentIndex + 1 }} / {{ audioState.totalSentences }}
          </span>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-pill px-2 py-0"
          style="font-size: 0.8rem"
          title="Vitesse de lecture"
          @click="$emit('cycle-rate')"
        >
          {{ audioState.rate }}x
        </button>

        <button
          type="button"
          class="btn btn-sm btn-link text-white text-decoration-none p-0 ms-2 opacity-75"
          title="Fermer le lecteur audio"
          @click="$emit('close')"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  audioState: {
    type: Object,
    required: true,
  },
});

defineEmits(['toggle-play', 'prev', 'next', 'cycle-rate', 'close']);
</script>
