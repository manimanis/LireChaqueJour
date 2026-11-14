<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 fw-bold mb-1">Bibliothèque</h1>
        <p class="text-body-secondary mb-0">
          {{ libraryStore.books.length }} livre(s) stocké(s) localement
        </p>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        @click="showImport = !showImport"
      >
        <i class="bi bi-plus-lg me-2"></i>Ajouter un livre
      </button>
    </div>

    <div v-if="showImport" class="mb-4">
      <ImportBookModal
        :show-close="true"
        @close="showImport = false"
        @imported="onBookImported"
      />
    </div>

    <div v-if="libraryStore.books.length > 0" class="mb-4">
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input
          v-model="searchQuery"
          type="search"
          class="form-control"
          placeholder="Rechercher par titre ou auteur…"
        />
      </div>
    </div>

    <div v-if="filteredBooks.length === 0" class="text-center py-5">
      <i class="bi bi-bookshelf fs-1 text-body-secondary d-block mb-3"></i>
      <h5 class="fw-semibold mb-2">
        {{ libraryStore.books.length === 0 ? 'Votre bibliothèque est vide' : 'Aucun livre trouvé' }}
      </h5>
      <p class="text-body-secondary mb-3">
        {{
          libraryStore.books.length === 0
            ? 'Importez votre premier livre EPUB pour commencer votre lecture quotidienne.'
            : 'Essayez un autre terme de recherche.'
        }}
      </p>
      <button
        v-if="libraryStore.books.length === 0"
        type="button"
        class="btn btn-primary"
        @click="showImport = true"
      >
        <i class="bi bi-upload me-2"></i>Ajouter un livre EPUB
      </button>
    </div>

    <div v-else class="row g-3">
      <div
        v-for="book in filteredBooks"
        :key="book.id"
        class="col-md-6 col-xl-4"
      >
        <BookCard
          :book="book"
          :progress="libraryStore.getProgress(book.id)"
          @continue="continueBook"
          @reset="handleReset"
          @delete="handleDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import ImportBookModal from '@/components/ImportBookModal.vue';
import BookCard from '@/components/BookCard.vue';

const router = useRouter();
const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const showImport = ref(false);
const searchQuery = ref('');

const filteredBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return libraryStore.books;
  return libraryStore.books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
  );
});

function onBookImported(book) {
  showImport.value = false;
  router.push(`/today/${book.id}`);
}

function continueBook(bookId) {
  settingsStore.currentBookId = bookId;
  router.push(`/today/${bookId}`);
}

async function handleReset(book) {
  if (confirm(`Réinitialiser la progression de « ${book.title} » ?`)) {
    await libraryStore.resetProgress(book.id);
  }
}

async function handleDelete(book) {
  if (confirm(`Supprimer définitivement « ${book.title} » de votre bibliothèque ?`)) {
    await libraryStore.deleteBook(book.id);
  }
}
</script>
