<template>
  <div class="container py-4" :class="isFocusMode ? 'focus-mode-active' : ''">
    <!-- Floating Exit Button for Focus Mode -->
    <div
      v-if="isFocusMode"
      class="position-fixed top-0 end-0 p-3"
      style="z-index: 1080"
    >
      <button
        type="button"
        class="btn btn-sm btn-dark opacity-75 shadow rounded-pill d-flex align-items-center gap-1 px-3 py-1"
        title="Quitter le mode plein écran"
        @click="toggleFocusMode"
      >
        <i class="bi bi-fullscreen-exit"></i>
        <span>Quitter Focus</span>
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="!book" class="text-center py-5">
      <i class="bi bi-journal-x fs-1 text-body-secondary d-block mb-3"></i>
      <h4 class="fw-bold mb-2">Aucun livre sélectionné</h4>
      <p class="text-body-secondary mb-4">
        Importez un livre EPUB ou sélectionnez-en un dans votre bibliothèque pour commencer la lecture du jour.
      </p>
      <RouterLink to="/library" class="btn btn-primary">
        <i class="bi bi-collection me-2"></i>Aller à la bibliothèque
      </RouterLink>
    </div>

    <div v-else class="reading-surface" :class="'reading-surface-theme-' + settingsStore.readingTheme">
      <!-- Book Switcher & Header Info (Hidden in Focus Mode) -->
      <div v-if="!isFocusMode" class="card shadow-sm border-0 mb-4">
        <div class="card-body p-3 p-md-4">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div class="flex-grow-1">
              <div v-if="libraryStore.books.length > 1" class="mb-2">
                <select
                  class="form-select form-select-sm w-auto mw-100"
                  :value="book.id"
                  aria-label="Changer de livre"
                  @change="switchBook($event.target.value)"
                >
                  <option v-for="b in libraryStore.books" :key="b.id" :value="b.id">
                    {{ b.title }}
                  </option>
                </select>
              </div>
              <h1 class="h4 fw-bold mb-1">{{ book.title }}</h1>
              <p class="text-body-secondary small mb-0">{{ book.author }}</p>
            </div>

            <div class="text-end">
              <span class="badge text-bg-primary fs-6 mb-1">
                Jour {{ displayedDay }} / {{ book.totalSegments }}
              </span>
              <div class="small text-body-secondary">
                {{ progress.completion }} % • ~{{ estimatedMinutes }} min
              </div>
            </div>
          </div>

          <div class="progress" style="height: 8px">
            <div
              class="progress-bar"
              :class="progress.completion >= 100 ? 'bg-success' : 'bg-primary'"
              role="progressbar"
              :style="{ width: `${progress.completion}%` }"
            ></div>
          </div>

          <div
            v-if="isPostponedToday"
            class="alert alert-warning py-2 px-3 small mt-3 mb-0"
          >
            <i class="bi bi-clock-history me-2"></i>
            Lecture reportée pour aujourd'hui. Vous pouvez la reprendre à tout moment.
          </div>
        </div>
      </div>

      <!-- Summary Card (UC04) (Hidden in Focus Mode) -->
      <div v-if="!isFocusMode" ref="summarySectionRef">
        <SummaryCard
          :summary="summaryText"
          :length="settingsStore.summaryLength"
          :loading="summaryLoading"
          @change-length="onSummaryLengthChange"
          @regenerate="loadSummary(true)"
        />
      </div>

      <!-- Audio Reader Player Bar (Axe 1) -->
      <div
        v-if="showAudioPlayer"
        class="card border-0 shadow-sm mb-4 bg-primary text-white overflow-hidden rounded-4 animate-fade-in"
      >
        <div class="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="btn btn-sm btn-light rounded-circle p-2 lh-1 text-primary shadow-sm"
              :title="audioState.isPlaying ? 'Mettre en pause' : 'Écouter'"
              @click="toggleAudioPlay"
            >
              <i class="bi" :class="audioState.isPlaying ? 'bi-pause-fill fs-5' : 'bi-play-fill fs-5'"></i>
            </button>

            <button
              type="button"
              class="btn btn-sm btn-outline-light rounded-circle p-1 lh-1"
              title="Phrase précédente"
              @click="globalAudioReader.prev()"
            >
              <i class="bi bi-chevron-left"></i>
            </button>

            <button
              type="button"
              class="btn btn-sm btn-outline-light rounded-circle p-1 lh-1"
              title="Phrase suivante"
              @click="globalAudioReader.next()"
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
            <!-- Playback Speed -->
            <button
              type="button"
              class="btn btn-sm btn-outline-light rounded-pill px-2 py-0"
              style="font-size: 0.8rem"
              title="Vitesse de lecture"
              @click="cycleAudioRate"
            >
              {{ audioState.rate }}x
            </button>

            <button
              type="button"
              class="btn btn-sm btn-link text-white text-decoration-none p-0 ms-2 opacity-75"
              title="Fermer le lecteur audio"
              @click="closeAudioPlayer"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Segment Content -->
      <div
        class="card shadow-sm border-0 mb-4 position-relative"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <div class="card-body p-3 p-sm-4 p-md-5">
          <div v-if="segmentLoading" class="text-center py-5 text-body-secondary">
            <div class="spinner-border mb-2" role="status"></div>
            <div>Chargement du segment…</div>
          </div>

          <div v-else-if="currentSegment">
            <!-- Reader Header Strip with Compact Actions (Aa, Audio, TOC, Focus) -->
            <div class="d-flex flex-wrap justify-content-between align-items-center text-body-secondary small mb-4 pb-2 border-bottom gap-2">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-bold text-body">Jour {{ currentSegment.dayNumber }}</span>
                <span>•</span>
                <span>{{ currentSegment.wordCount }} mots</span>
                <span v-if="settingsStore.readingMode === 'paginated'">
                  • Page {{ currentPageIdx + 1 }} / {{ paginatedPages.length }}
                </span>
              </div>

              <div class="d-flex align-items-center gap-1">
                <!-- Audio toggle -->
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="showAudioPlayer ? 'btn-primary' : 'btn-outline-primary'"
                  title="Écouter le segment en synthèse vocale"
                  @click="toggleAudioBar"
                >
                  <i class="bi bi-headphones me-1"></i>
                  <span class="d-none d-sm-inline">Écouter</span>
                </button>

                <!-- Table of Contents / Chapters -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  title="Table des matières et chapitres"
                  @click="showTocDrawer = true"
                >
                  <i class="bi bi-list-columns-reverse me-1"></i>
                  <span class="d-none d-sm-inline">Chapitres</span>
                </button>

                <!-- Reading Options (Aa) Drawer trigger -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary fw-bold px-2 py-1 shadow-sm"
                  title="Options d'affichage et de lecture (Aa)"
                  @click="showReadingOptionsDrawer = true"
                >
                  <span style="font-size: 0.95rem; font-family: serif;">Aa</span>
                </button>

                <!-- Focus / Fullscreen Mode -->
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary px-2"
                  title="Mode lecture plein écran sans distraction"
                  @click="toggleFocusMode"
                >
                  <i class="bi bi-arrows-fullscreen"></i>
                </button>
              </div>
            </div>

            <!-- Reading Prose Surface -->
            <div
              class="reading-prose"
              :style="readingStyle"
              @click="handleReadingProseClick"
            >
              <!-- Paginated mode display -->
              <template v-if="settingsStore.readingMode === 'paginated'">
                <div v-if="paginatedPages[currentPageIdx]">
                  <p
                    v-for="(pIdx) in paginatedPages[currentPageIdx]"
                    :key="pIdx"
                    :data-pidx="pIdx"
                    v-html="renderParagraph(paragraphs[pIdx], pIdx)"
                  ></p>
                </div>
              </template>

              <!-- Standard vertical scroll display -->
              <template v-else>
                <p
                  v-for="(para, idx) in paragraphs"
                  :key="idx"
                  :data-pidx="idx"
                  v-html="renderParagraph(para, idx)"
                ></p>
              </template>
            </div>

            <!-- Pagination Bottom Nav Controls (Axe 2) -->
            <div
              v-if="settingsStore.readingMode === 'paginated'"
              class="d-flex justify-content-between align-items-center pt-4 mt-4 border-top"
            >
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm rounded-pill px-3"
                :disabled="currentPageIdx === 0"
                @click="currentPageIdx--"
              >
                <i class="bi bi-arrow-left me-1"></i>Page précédente
              </button>
              <span class="small text-body-secondary">
                {{ currentPageIdx + 1 }} / {{ paginatedPages.length }}
              </span>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm rounded-pill px-3"
                :disabled="currentPageIdx >= paginatedPages.length - 1"
                @click="currentPageIdx++"
              >
                Page suivante<i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>

          <div v-else class="text-center py-4 text-body-secondary">
            Segment introuvable.
          </div>
        </div>
      </div>

      <!-- Daily Vocabulary Review Widget (Moved to end of reading segment) -->
      <div v-if="!isFocusMode && reviewWords.length > 0" class="card shadow-sm border-0 mb-4 border-start border-4 border-primary">
        <div class="card-body p-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h6 class="fw-bold mb-0 d-flex align-items-center gap-2 text-primary">
              <i class="bi bi-lightbulb-fill"></i>
              <span>Vocabulaire à réviser ({{ reviewWords.length }})</span>
            </h6>
            <RouterLink
              :to="`/vocabulary?mode=flashcards&bookId=${book?.id || ''}`"
              class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2"
            >
              <i class="bi bi-play-circle me-1"></i>Lancer les Flashcards
            </RouterLink>
          </div>

          <div class="d-flex flex-wrap gap-2 pt-1">
            <button
              v-for="rw in reviewWords"
              :key="rw.id"
              type="button"
              class="btn btn-sm btn-light border rounded-pill d-inline-flex align-items-center gap-1 py-1 px-3 shadow-sm"
              @click="triggerWordLookup(rw.word, rw.contextSentence)"
            >
              <span class="fw-semibold text-capitalize">{{ rw.word }}</span>
              <span v-if="rw.masteryLevel === 2" class="text-success small ms-1" title="Maîtrisé">✓</span>
              <span v-else class="text-warning small ms-1" title="À réviser">●</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Completion Banner & Badges unlocked alert -->
      <div
        v-if="justCompletedMsg"
        class="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3"
      >
        <div>
          <i class="bi bi-check-circle-fill me-2 fs-5"></i>
          <span>{{ justCompletedMsg }}</span>
        </div>
      </div>

      <div
        v-if="unlockedBadgeMsg"
        class="alert alert-warning d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3 border-warning"
      >
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-trophy-fill text-warning fs-4"></i>
          <div>
            <div class="fw-bold">Nouveau succès débloqué !</div>
            <div class="small">{{ unlockedBadgeMsg }}</div>
          </div>
        </div>
        <RouterLink to="/stats" class="btn btn-sm btn-outline-dark rounded-pill">
          Voir mes trophées
        </RouterLink>
      </div>

      <!-- Action Buttons (UC04: Terminé, Reporter, Relire le résumé) -->
      <div v-if="!isFocusMode" class="card shadow-sm border-0 mb-4">
        <div class="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-success btn-lg"
              :disabled="!currentSegment || isCurrentCompleted && progress.completion >= 100"
              @click="handleComplete"
            >
              <i class="bi bi-check2-circle me-2"></i>
              {{ isCurrentCompleted ? 'Déjà validé — Passer au suivant' : 'Terminé' }}
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="handlePostpone"
            >
              <i class="bi bi-calendar-plus me-1"></i>Reporter
            </button>

            <button
              type="button"
              class="btn btn-outline-info"
              @click="scrollToSummary"
            >
              <i class="bi bi-stars me-1"></i>Relire le résumé
            </button>
          </div>

          <!-- Navigate completed days -->
          <div class="btn-group btn-group-sm">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="displayedDay <= 1"
              title="Jour précédent"
              @click="viewDay(displayedDay - 1)"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <span class="btn btn-outline-secondary disabled fw-semibold">
              Jour {{ displayedDay }}
            </span>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="displayedDay >= progress.currentSegment"
              title="Jour suivant"
              @click="viewDay(displayedDay + 1)"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Free Highlight & Quote Floating Action Trigger (Axe 3) -->
    <div
      v-if="highlightTrigger.visible"
      class="position-fixed shadow-lg rounded-pill p-1 bg-body border d-flex align-items-center gap-1 animate-fade-in"
      :style="{
        top: `${highlightTrigger.top}px`,
        left: `${highlightTrigger.left}px`,
        transform: 'translate(-50%, 0)',
        zIndex: 1060,
      }"
      @mousedown.prevent
      @touchstart.prevent
    >
      <!-- Color dots for highlights -->
      <button
        v-for="c in highlightColors"
        :key="c.name"
        type="button"
        class="btn p-0 rounded-circle border shadow-sm"
        :style="{ width: '22px', height: '22px', backgroundColor: c.code }"
        :title="`Surligner en ${c.label}`"
        @click="createHighlight(c.name)"
      ></button>

      <div class="vr mx-1 my-1"></div>

      <!-- Quote generator trigger -->
      <button
        type="button"
        class="btn btn-sm btn-light border-0 rounded-pill py-0 px-2 small d-inline-flex align-items-center gap-1"
        title="Créer une image de citation"
        @click="openQuoteModal(highlightTrigger.text)"
      >
        <i class="bi bi-card-image text-primary"></i>
        <span>Citation</span>
      </button>

      <button
        type="button"
        class="btn btn-sm btn-link text-body-secondary p-0 px-1"
        title="Fermer"
        @click="highlightTrigger.visible = false"
      >
        <i class="bi bi-x"></i>
      </button>
    </div>

    <!-- Table of Contents & Search Offcanvas / Drawer (Axe 4) -->
    <div
      v-if="showTocDrawer"
      class="modal-backdrop fade show"
      style="z-index: 1075"
      @click="showTocDrawer = false"
    ></div>

    <div
      class="offcanvas offcanvas-start show"
      :class="{ show: showTocDrawer }"
      tabindex="-1"
      style="z-index: 1080; visibility: visible;"
      v-if="showTocDrawer"
    >
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2">
          <i class="bi bi-book-half text-primary"></i>
          <span>Structure du livre</span>
        </h5>
        <button type="button" class="btn-close" aria-label="Fermer" @click="showTocDrawer = false"></button>
      </div>

      <div class="offcanvas-body p-3">
        <!-- Search bar across book -->
        <div class="mb-3">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input
              v-model="searchBookQuery"
              type="text"
              class="form-control"
              placeholder="Rechercher dans tout le livre…"
              @keyup.enter="performBookSearch"
            />
            <button class="btn btn-primary" type="button" @click="performBookSearch">
              Chercher
            </button>
          </div>
        </div>

        <!-- Search Results (if query) -->
        <div v-if="searchActive" class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small fw-bold">Résultats ({{ searchResults.length }}) :</span>
            <button type="button" class="btn btn-link btn-sm p-0 small" @click="clearBookSearch">
              Effacer
            </button>
          </div>

          <div v-if="searchResults.length === 0" class="text-body-secondary small py-2">
            Aucun résultat trouvé pour « {{ searchBookQuery }} ».
          </div>

          <div class="list-group list-group-flush small">
            <button
              v-for="(res, rIdx) in searchResults"
              :key="rIdx"
              type="button"
              class="list-group-item list-group-item-action text-start p-2"
              @click="jumpToSearchResult(res.dayNumber)"
            >
              <div class="fw-bold text-primary mb-1">Jour {{ res.dayNumber }}</div>
              <div class="text-body-secondary fst-italic">« ...{{ res.snippet }}... »</div>
            </button>
          </div>
        </div>

        <!-- Table of Contents Chapters -->
        <div>
          <h6 class="fw-bold text-uppercase small text-body-secondary mb-2">
            Chapitres & Segments
          </h6>

          <div class="list-group list-group-flush small">
            <button
              v-for="day in (book?.totalSegments || 1)"
              :key="day"
              type="button"
              class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 rounded-2 mb-1"
              :class="{
                'active text-white': day === displayedDay,
                'list-group-item-light': day !== displayedDay && progress?.completedSegments?.includes(day),
              }"
              @click="selectDayFromToc(day)"
            >
              <div class="d-flex align-items-center gap-2">
                <i
                  class="bi"
                  :class="progress?.completedSegments?.includes(day) ? 'bi-check-circle-fill text-success' : 'bi-circle text-body-tertiary'"
                ></i>
                <span class="fw-semibold">Jour {{ day }}</span>
              </div>
              <span class="badge" :class="day === displayedDay ? 'bg-light text-primary' : 'bg-secondary-subtle text-secondary'">
                {{ day === displayedDay ? 'En cours' : (progress?.completedSegments?.includes(day) ? 'Lu' : '') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reading Options Drawer "Aa" (Kindle / Apple Books style) -->
    <div
      v-if="showReadingOptionsDrawer"
      class="modal-backdrop fade show"
      style="z-index: 1075"
      @click="showReadingOptionsDrawer = false"
    ></div>

    <div
      class="offcanvas offcanvas-end show"
      tabindex="-1"
      style="z-index: 1080; visibility: visible;"
      v-if="showReadingOptionsDrawer"
    >
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2">
          <span class="fs-5" style="font-family: serif;">Aa</span>
          <span>Confort de lecture</span>
        </h5>
        <button type="button" class="btn-close" aria-label="Fermer" @click="showReadingOptionsDrawer = false"></button>
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
              @click="showReadingOptionsDrawer = false"
            >
              <span><i class="bi bi-journal-bookmark me-2 text-primary"></i>Mon carnet de vocabulaire</span>
              <i class="bi bi-chevron-right small"></i>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Quote Card Generator Modal (Axe 3) -->
    <QuoteCardModal
      :show="showQuoteModal"
      :quote-text="selectedQuoteText"
      :book-title="book?.title"
      :author="book?.author"
      @close="showQuoteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { estimateReadingMinutes } from '@/services/segmenter.js';
import {
  triggerWordLookup,
  extractSentenceFromText,
  cleanSelectedWord,
} from '@/services/dictionaryService.js';
import { globalAudioReader } from '@/services/audioReaderService.js';
import { evaluateBadges } from '@/services/badgeService.js';
import SummaryCard from '@/components/SummaryCard.vue';
import QuoteCardModal from '@/components/QuoteCardModal.vue';

const route = useRoute();
const router = useRouter();
const libraryStore = useLibraryStore();
const settingsStore = useSettingsStore();

const summarySectionRef = ref(null);
const currentSegment = ref(null);
const segmentLoading = ref(false);
const summaryText = ref('');
const summaryLoading = ref(false);
const displayedDay = ref(1);
const justCompletedMsg = ref('');
const unlockedBadgeMsg = ref('');
const vocabList = ref([]);
const reviewWords = ref([]);
const userHighlights = ref([]);

// Fullscreen / Focus Mode (Axe 2)
const isFocusMode = ref(false);

// Mode Pagination (Axe 2)
const currentPageIdx = ref(0);

// Audio Reader State (Axe 1)
const showAudioPlayer = ref(false);
const audioState = ref({
  isPlaying: false,
  isPaused: false,
  currentIndex: -1,
  totalSentences: 0,
  rate: 1.0,
});
const activeAudioSentence = ref(null);

// TOC Drawer & Search (Axe 4)
const showTocDrawer = ref(false);
const showReadingOptionsDrawer = ref(false);
const searchBookQuery = ref('');
const searchActive = ref(false);
const searchResults = ref([]);

// Highlights & Quote modal (Axe 3)
const showQuoteModal = ref(false);
const selectedQuoteText = ref('');
const highlightTrigger = ref({
  visible: false,
  text: '',
  top: 0,
  left: 0,
});

const highlightColors = [
  { name: 'yellow', code: '#fef08a', label: 'Jaune' },
  { name: 'green', code: '#bbf7d0', label: 'Menthe' },
  { name: 'pink', code: '#fbcfe8', label: 'Rose' },
  { name: 'blue', code: '#bae6fd', label: 'Ciel' },
];

// Touch swipe tracking for Paginated mode
let touchStartX = 0;
let touchStartY = 0;

const knownWords = computed(() => {
  return new Set(vocabList.value.map((w) => w.word.toLowerCase()));
});

const paragraphs = computed(() => {
  if (!currentSegment.value?.content) return [];
  return currentSegment.value.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
});

// Group paragraphs into pages for paginated mode (e.g. 1-2 paragraphs per page)
const paginatedPages = computed(() => {
  const pages = [];
  let currentGroup = [];
  let currentWords = 0;

  paragraphs.value.forEach((p, idx) => {
    const words = p.split(/\s+/).length;
    if (currentWords + words > 220 && currentGroup.length > 0) {
      pages.push(currentGroup);
      currentGroup = [idx];
      currentWords = words;
    } else {
      currentGroup.push(idx);
      currentWords += words;
    }
  });
  if (currentGroup.length > 0) pages.push(currentGroup);
  return pages.length > 0 ? pages : [[]];
});

const readingStyle = computed(() => ({
  fontFamily: `'${settingsStore.fontFamily}', serif`,
  fontSize: `${settingsStore.fontSize}px`,
  lineHeight: settingsStore.lineHeight,
}));

const book = computed(() => {
  const paramId = route.params.bookId;
  if (paramId) {
    const found = libraryStore.books.find((b) => b.id === paramId);
    if (found) return found;
  }
  return libraryStore.activeBook;
});

const progress = computed(() =>
  book.value ? libraryStore.getProgress(book.value.id) : null
);

const isCurrentCompleted = computed(() =>
  progress.value?.completedSegments?.includes(displayedDay.value)
);

const isPostponedToday = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return progress.value?.postponedDate === today;
});

const estimatedMinutes = computed(() =>
  currentSegment.value
    ? estimateReadingMinutes(currentSegment.value.wordCount)
    : 0
);

// Focus mode toggle
function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value;
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('reading-focus-mode', isFocusMode.value);
  }
}

// Pagination mode toggle
function toggleReadingMode() {
  settingsStore.readingMode = settingsStore.readingMode === 'paginated' ? 'scroll' : 'paginated';
  currentPageIdx.value = 0;
}

// Touch swipe navigation
function handleTouchStart(e) {
  if (settingsStore.readingMode !== 'paginated') return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
  if (settingsStore.readingMode !== 'paginated') return;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  // Horizontal swipe detected
  if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
    if (deltaX < 0 && currentPageIdx.value < paginatedPages.value.length - 1) {
      currentPageIdx.value++;
    } else if (deltaX > 0 && currentPageIdx.value > 0) {
      currentPageIdx.value--;
    }
  }
}

// Audio Reader functions (Axe 1)
function toggleAudioBar() {
  showAudioPlayer.value = !showAudioPlayer.value;
  if (showAudioPlayer.value) {
    setupAudioReader();
  } else {
    globalAudioReader.stop();
  }
}

function setupAudioReader() {
  if (paragraphs.value.length > 0) {
    globalAudioReader.loadContent(paragraphs.value, 'fr-FR');
    globalAudioReader.setRate(audioState.value.rate);
  }
}

function toggleAudioPlay() {
  if (audioState.value.isPlaying) {
    globalAudioReader.pause();
  } else {
    globalAudioReader.play();
  }
}

function closeAudioPlayer() {
  globalAudioReader.stop();
  showAudioPlayer.value = false;
}

function cycleAudioRate() {
  const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
  const next = rates[(rates.indexOf(audioState.value.rate) + 1) % rates.length];
  globalAudioReader.setRate(next);
}

// Highlights & Quote functions (Axe 3)
async function loadHighlights() {
  if (!book.value) return;
  userHighlights.value = await libraryStore.getHighlights(book.value.id);
}

function openQuoteModal(text) {
  selectedQuoteText.value = text;
  highlightTrigger.value.visible = false;
  showQuoteModal.value = true;
}

async function createHighlight(colorName) {
  const text = highlightTrigger.value.text;
  if (!text || !book.value) return;

  await libraryStore.addHighlight({
    bookId: book.value.id,
    dayNumber: displayedDay.value,
    text,
    color: colorName,
  });

  highlightTrigger.value.visible = false;
  await loadHighlights();
}

function onTextSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    highlightTrigger.value.visible = false;
    return;
  }

  const raw = selection.toString().trim();
  // If user selected a sentence or phrase (> 15 chars), show highlight & quote trigger
  if (raw.length >= 12 && raw.length <= 500) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0) {
      highlightTrigger.value = {
        visible: true,
        text: raw,
        top: Math.min(rect.bottom + 10, window.innerHeight - 60),
        left: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      };
    }
  }
}

// Table of Contents & Search (Axe 4)
function selectDayFromToc(day) {
  showTocDrawer.value = false;
  viewDay(day);
}

async function performBookSearch() {
  const q = searchBookQuery.value.trim().toLowerCase();
  if (!q || !book.value) return;

  searchActive.value = true;
  searchResults.value = [];

  const segments = await libraryStore.getBookSegments(book.value.id);
  const hits = [];

  segments.forEach((seg) => {
    const text = seg.content || '';
    const idx = text.toLowerCase().indexOf(q);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + q.length + 40);
      hits.push({
        dayNumber: seg.dayNumber,
        snippet: text.slice(start, end).replace(/\s+/g, ' ').trim(),
      });
    }
  });

  searchResults.value = hits.slice(0, 15);
}

function clearBookSearch() {
  searchBookQuery.value = '';
  searchActive.value = false;
  searchResults.value = [];
}

function jumpToSearchResult(day) {
  showTocDrawer.value = false;
  viewDay(day);
}

async function loadVocab() {
  if (!book.value) return;
  try {
    vocabList.value = await libraryStore.getVocabulary(book.value.id);
    reviewWords.value = await libraryStore.getReviewWords(book.value.id, 5);
    await loadHighlights();
  } catch {
    // Ignore db load error
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderParagraph(para, pIdx) {
  let content = escapeHtml(para);

  // Check TTS active sentence highlight (Axe 1)
  if (
    activeAudioSentence.value &&
    activeAudioSentence.value.pIdx === pIdx &&
    activeAudioSentence.value.text
  ) {
    const cleanS = escapeHtml(activeAudioSentence.value.text);
    if (content.includes(cleanS)) {
      content = content.replace(
        cleanS,
        `<span class="tts-active-sentence">${cleanS}</span>`
      );
    }
  }

  // Vocab highlight
  if (settingsStore.highlightVocabularyWords && knownWords.value.size > 0) {
    const tokens = content.split(/(\b[a-zA-ZÀ-ÿœæÇç-]+\b)/);
    content = tokens
      .map((token) => {
        const cleaned = cleanSelectedWord(token).toLowerCase();
        if (cleaned && knownWords.value.has(cleaned)) {
          return `<mark class="vocab-highlight" data-word="${token}" title="Mot déjà consulté : cliquer pour revoir sa définition">${token}</mark>`;
        }
        return token;
      })
      .join('');
  }

  return content;
}

function handleReadingProseClick(e) {
  const mark = e.target.closest('.vocab-highlight');
  if (mark) {
    const word = mark.getAttribute('data-word');
    if (word) {
      const paraText = mark.closest('p')?.textContent || '';
      const context = extractSentenceFromText(paraText, word);
      triggerWordLookup(word, context);
    }
  }
}

async function loadSegmentAndSummary(dayNum) {
  if (!book.value) return;
  segmentLoading.value = true;
  try {
    currentSegment.value = await libraryStore.getSegment(book.value.id, dayNum);
    currentPageIdx.value = 0;
  } finally {
    segmentLoading.value = false;
  }
  await loadSummary(false);

  // If audio player is open, refresh sentences
  if (showAudioPlayer.value) {
    setupAudioReader();
  }
}

async function loadSummary(force = false) {
  if (!book.value) return;
  summaryLoading.value = true;
  try {
    summaryText.value = await libraryStore.getOrGenerateSummary(
      book.value.id,
      displayedDay.value,
      settingsStore.summaryLength,
      force
    );
  } finally {
    summaryLoading.value = false;
  }
}

watch(
  () => [book.value?.id, libraryStore.isLoaded],
  async ([bookId, loaded]) => {
    if (!loaded || !bookId) return;
    settingsStore.currentBookId = bookId;
    const prog = libraryStore.getProgress(bookId);
    displayedDay.value = prog.currentSegment || 1;
    justCompletedMsg.value = '';
    unlockedBadgeMsg.value = '';
    await loadSegmentAndSummary(displayedDay.value);
    await loadVocab();
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('focus', loadVocab);
  document.addEventListener('selectionchange', onTextSelectionChange);

  // Audio reader listeners
  globalAudioReader.onStateChange = (state) => {
    audioState.value = state;
  };
  globalAudioReader.onSentenceChange = (sentence) => {
    activeAudioSentence.value = sentence;
    if (sentence) {
      setTimeout(() => {
        document.querySelector('.tts-active-sentence')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 50);
    }
  };
});

onUnmounted(() => {
  window.removeEventListener('focus', loadVocab);
  document.removeEventListener('selectionchange', onTextSelectionChange);
  globalAudioReader.stop();
  if (typeof document !== 'undefined') {
    document.body.classList.remove('reading-focus-mode');
  }
});

function switchBook(bookId) {
  settingsStore.currentBookId = bookId;
  router.push(`/today/${bookId}`);
}

async function viewDay(dayNum) {
  if (!book.value) return;
  const maxAllowed = progress.value.currentSegment || 1;
  const target = Math.min(maxAllowed, Math.max(1, dayNum));
  displayedDay.value = target;
  justCompletedMsg.value = '';
  unlockedBadgeMsg.value = '';
  await loadSegmentAndSummary(target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleComplete() {
  if (!book.value || !currentSegment.value) return;
  const dayJustRead = displayedDay.value;
  await libraryStore.markSegmentCompleted(book.value.id, dayJustRead);

  // Check and unlock gamification badges (Axe 5)
  const newBadges = await evaluateBadges(libraryStore);
  if (newBadges && newBadges.length > 0) {
    unlockedBadgeMsg.value = `« ${newBadges[0].title} » — ${newBadges[0].description}`;
  }

  if (dayJustRead >= book.value.totalSegments) {
    justCompletedMsg.value = `Félicitations ! Vous avez terminé « ${book.value.title} » !`;
  } else {
    justCompletedMsg.value = `Jour ${dayJustRead} validé ! Votre résumé a été mis à jour pour le jour ${dayJustRead + 1}.`;
    displayedDay.value = dayJustRead + 1;
    await loadSegmentAndSummary(displayedDay.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function handlePostpone() {
  if (!book.value) return;
  await libraryStore.postponeToday(book.value.id);
}

async function onSummaryLengthChange(newLength) {
  settingsStore.summaryLength = newLength;
  await loadSummary(false);
}

function scrollToSummary() {
  summarySectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
</script>

<style scoped>
.reading-prose :deep(.vocab-highlight) {
  background-color: rgba(var(--bs-primary-rgb), 0.14);
  border-bottom: 2px dotted var(--bs-primary);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.reading-prose :deep(.vocab-highlight:hover) {
  background-color: rgba(var(--bs-primary-rgb), 0.28);
}

.reading-surface {
  transition: background-color 0.2s ease, color 0.2s ease;
  border-radius: 12px;
  padding: 8px;
}
</style>
