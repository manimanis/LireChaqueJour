<template>
  <div
    v-if="show"
    class="modal-backdrop fade show"
    style="z-index: 1075"
    @click="$emit('close')"
  ></div>

  <div
    v-if="show"
    class="offcanvas offcanvas-start show"
    tabindex="-1"
    style="z-index: 1080; visibility: visible;"
  >
    <div class="offcanvas-header border-bottom">
      <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2">
        <i class="bi bi-book-half text-primary"></i>
        <span>Structure du livre</span>
      </h5>
      <button type="button" class="btn-close" aria-label="Fermer" @click="$emit('close')"></button>
    </div>

    <div class="offcanvas-body p-3">
      <!-- Search bar across already-read segments (anti-spoiler) -->
      <div class="mb-3">
        <div class="input-group input-group-sm">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input
            :value="searchQuery"
            type="text"
            class="form-control"
            placeholder="Rechercher dans les passages lus…"
            @input="$emit('update:searchQuery', $event.target.value)"
            @keyup.enter="$emit('search')"
          />
          <button class="btn btn-primary" type="button" @click="$emit('search')">
            Chercher
          </button>
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="searchActive" class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small fw-bold">Résultats ({{ searchResults.length }}) :</span>
          <button type="button" class="btn btn-link btn-sm p-0 small" @click="$emit('clear-search')">
            Effacer
          </button>
        </div>

        <div v-if="searchResults.length === 0" class="text-body-secondary small py-2">
          Aucun résultat trouvé pour « {{ searchQuery }} ».
        </div>

        <div class="list-group list-group-flush small">
          <button
            v-for="(res, rIdx) in searchResults"
            :key="rIdx"
            type="button"
            class="list-group-item list-group-item-action text-start p-2"
            @click="$emit('select-day', res.dayNumber)"
          >
            <div class="fw-bold text-primary mb-1">Jour {{ res.dayNumber }}</div>
            <div class="text-body-secondary fst-italic">« ...{{ res.snippet }}... »</div>
          </button>
        </div>
      </div>

      <!-- Table of Contents Segments -->
      <div>
        <h6 class="fw-bold text-uppercase small text-body-secondary mb-2">
          Chapitres & Segments
        </h6>

        <div class="list-group list-group-flush small">
          <button
            v-for="day in totalSegments"
            :key="day"
            type="button"
            class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 rounded-2 mb-1"
            :class="{
              'active text-white': day === displayedDay,
              'list-group-item-light': day !== displayedDay && completedSegments.includes(day),
            }"
            @click="$emit('select-day', day)"
          >
            <div class="d-flex align-items-center gap-2">
              <i
                class="bi"
                :class="completedSegments.includes(day) ? 'bi-check-circle-fill text-success' : 'bi-circle text-body-tertiary'"
              ></i>
              <span class="fw-semibold">Jour {{ day }}</span>
            </div>
            <span class="badge" :class="day === displayedDay ? 'bg-light text-primary' : 'bg-secondary-subtle text-secondary'">
              {{ day === displayedDay ? 'En cours' : (completedSegments.includes(day) ? 'Lu' : '') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  totalSegments: { type: Number, default: 1 },
  displayedDay: { type: Number, default: 1 },
  completedSegments: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  searchActive: { type: Boolean, default: false },
  searchResults: { type: Array, default: () => [] },
});

defineEmits(['close', 'select-day', 'search', 'clear-search', 'update:searchQuery']);
</script>
