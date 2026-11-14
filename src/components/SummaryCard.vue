<template>
  <div class="card border-info-subtle bg-body-tertiary shadow-sm mb-4">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 bg-transparent">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-stars text-info"></i>
        <span class="fw-semibold">Résumé de vos lectures précédentes</span>
      </div>

      <div class="d-flex align-items-center gap-2">
        <div class="btn-group btn-group-sm" role="group" aria-label="Longueur du résumé">
          <button
            v-for="opt in lengthOptions"
            :key="opt.value"
            type="button"
            class="btn"
            :class="length === opt.value ? 'btn-info text-dark fw-semibold' : 'btn-outline-secondary'"
            @click="$emit('change-length', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          title="Recalculer le résumé"
          :disabled="loading"
          @click="$emit('regenerate')"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': loading }"></i>
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="loading" class="d-flex align-items-center gap-2 text-body-secondary">
        <div class="spinner-border spinner-border-sm" role="status"></div>
        <span>Génération du résumé local…</span>
      </div>
      <p v-else-if="summary" class="mb-0 lh-base">
        {{ summary }}
      </p>
      <p v-else class="mb-0 text-body-secondary fst-italic">
        C'est votre première session pour ce livre. Le résumé des passages déjà lus apparaîtra ici dès votre prochaine lecture.
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  summary: { type: String, default: '' },
  length: { type: String, default: 'medium' },
  loading: { type: Boolean, default: false },
});

defineEmits(['change-length', 'regenerate']);

const lengthOptions = [
  { value: 'short', label: 'Court' },
  { value: 'medium', label: 'Moyen' },
  { value: 'long', label: 'Long' },
];
</script>
