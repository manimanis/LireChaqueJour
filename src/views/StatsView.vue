<template>
  <div class="container py-4">
    <div class="mb-4">
      <h1 class="h3 fw-bold mb-1">Statistiques de lecture</h1>
      <p class="text-body-secondary mb-0">
        Suivi de vos habitudes et historique de vos sessions
      </p>
    </div>

    <!-- Global KPI Cards (Section 8) -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-body-secondary small fw-semibold">Livres</span>
              <i class="bi bi-book text-primary fs-5"></i>
            </div>
            <div class="fs-3 fw-bold">{{ libraryStore.books.length }}</div>
            <div class="small text-body-secondary">dans la bibliothèque</div>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-body-secondary small fw-semibold">Lecture</span>
              <i class="bi bi-fire text-warning fs-5"></i>
            </div>
            <div class="fs-3 fw-bold">{{ libraryStore.consecutiveDaysStreak }}</div>
            <div class="small text-body-secondary">jours consécutifs</div>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-body-secondary small fw-semibold">Mots lus</span>
              <i class="bi bi-fonts text-success fs-5"></i>
            </div>
            <div class="fs-3 fw-bold">{{ libraryStore.totalWordsRead.toLocaleString('fr-FR') }}</div>
            <div class="small text-body-secondary">total cumulé</div>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-body-secondary small fw-semibold">Temps de lecture</span>
              <i class="bi bi-clock-history text-info fs-5"></i>
            </div>
            <div class="fs-3 fw-bold">{{ formattedTime }}</div>
            <div class="small text-body-secondary">total estimé</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Badges & Trophées (Axe 5) -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 class="fw-bold mb-1 d-flex align-items-center gap-2">
              <i class="bi bi-trophy-fill text-warning"></i>
              <span>Succès & Trophées de lecture</span>
            </h5>
            <p class="small text-body-secondary mb-0">
              Débloquez des badges bienveillants pour célébrer votre régularité et vos étapes de lecture.
            </p>
          </div>
          <span class="badge rounded-pill text-bg-warning-subtle text-warning-emphasis border border-warning-subtle fs-6 px-3 py-2">
            {{ unlockedCount }} / {{ BADGES_CATALOG.length }} débloqués
          </span>
        </div>

        <div class="row g-3">
          <div
            v-for="badge in BADGES_CATALOG"
            :key="badge.id"
            class="col-12 col-sm-6 col-lg-4"
          >
            <div
              class="p-3 rounded-4 border h-100 d-flex align-items-start gap-3 transition-all"
              :class="unlockedBadges[badge.id] ? 'bg-body border-primary-subtle shadow-sm' : 'bg-body-tertiary border-dashed opacity-60'"
            >
              <div
                class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                :style="{
                  width: '46px',
                  height: '46px',
                  backgroundColor: unlockedBadges[badge.id] ? badge.color : '#94a3b8',
                  color: '#ffffff',
                }"
              >
                <i class="bi fs-5" :class="badge.icon"></i>
              </div>

              <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-items-center gap-1">
                  <span class="fw-bold small text-truncate">{{ badge.title }}</span>
                  <i
                    v-if="unlockedBadges[badge.id]"
                    class="bi bi-check-circle-fill text-success small"
                    title="Obtenu !"
                  ></i>
                </div>
                <div class="small text-body-secondary lh-sm mb-1" style="font-size: 0.78rem">
                  {{ badge.description }}
                </div>
                <div v-if="unlockedBadges[badge.id]" class="text-success small fw-semibold" style="font-size: 0.7rem">
                  <i class="bi bi-calendar-check me-1"></i>Débloqué le {{ new Date(unlockedBadges[badge.id]).toLocaleDateString('fr-FR') }}
                </div>
                <div v-else class="text-body-tertiary small" style="font-size: 0.7rem">
                  <i class="bi bi-lock me-1"></i>À débloquer
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts (Chart.js) -->
    <div class="row g-4 mb-4">
      <div class="col-lg-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <h6 class="fw-bold mb-3">Mots lus par semaine</h6>
            <div style="height: 240px">
              <canvas ref="weeklyCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <h6 class="fw-bold mb-3">Progression mensuelle (segments lus)</h6>
            <div style="height: 240px">
              <canvas ref="monthlyCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h6 class="fw-bold mb-3">Régularité sur les 14 derniers jours</h6>
            <div style="height: 200px">
              <canvas ref="streakCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session History -->
    <div class="card shadow-sm border-0">
      <div class="card-body">
        <h6 class="fw-bold mb-3">Historique des sessions</h6>

        <div v-if="libraryStore.sessions.length === 0" class="text-body-secondary small py-3">
          Aucune session de lecture enregistrée pour le moment.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead>
              <tr>
                <th>Date</th>
                <th>Livre</th>
                <th>Jour</th>
                <th>Mots</th>
                <th>Durée estimée</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in libraryStore.sessions.slice(0, 30)" :key="s.id">
                <td>{{ new Date(s.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}</td>
                <td class="fw-semibold">{{ s.bookTitle }}</td>
                <td>Jour {{ s.segmentNumber }}</td>
                <td>{{ s.wordCount }}</td>
                <td>{{ s.durationMinutes }} min</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from 'chart.js';
import { useLibraryStore } from '@/stores/libraryStore.js';
import { BADGES_CATALOG, evaluateBadges } from '@/services/badgeService.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler
);

const libraryStore = useLibraryStore();

const unlockedBadges = ref({});
const unlockedCount = computed(() => Object.keys(unlockedBadges.value).length);

async function loadBadges() {
  await evaluateBadges(libraryStore);
  unlockedBadges.value = await libraryStore.getUnlockedBadges();
}

const weeklyCanvas = ref(null);
const monthlyCanvas = ref(null);
const streakCanvas = ref(null);

let weeklyChart = null;
let monthlyChart = null;
let streakChart = null;

const formattedTime = computed(() => {
  const mins = libraryStore.totalMinutesRead;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
});

function buildWeeklyData() {
  const labels = [];
  const data = [];
  const now = new Date();

  for (let w = 5; w >= 0; w--) {
    const end = new Date(now);
    end.setDate(now.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const words = libraryStore.sessions
      .filter((s) => {
        const d = (s.date || '').slice(0, 10);
        return d >= startStr && d <= endStr;
      })
      .reduce((sum, s) => sum + (s.wordCount || 0), 0);

    labels.push(`S-${w === 0 ? 'actuelle' : w}`);
    data.push(words);
  }
  return { labels, data };
}

function buildMonthlyData() {
  const labels = [];
  const data = [];
  const now = new Date();

  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = libraryStore.sessions.filter((s) =>
      (s.date || '').startsWith(ym)
    ).length;

    labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
    data.push(count);
  }
  return { labels, data };
}

function buildStreakData() {
  const labels = [];
  const data = [];
  const now = new Date();

  for (let d = 13; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(now.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    const words = libraryStore.sessions
      .filter((s) => (s.date || '').startsWith(iso))
      .reduce((sum, s) => sum + (s.wordCount || 0), 0);

    labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
    data.push(words);
  }
  return { labels, data };
}

function renderCharts() {
  weeklyChart?.destroy();
  monthlyChart?.destroy();
  streakChart?.destroy();

  if (weeklyCanvas.value) {
    const w = buildWeeklyData();
    weeklyChart = new Chart(weeklyCanvas.value, {
      type: 'bar',
      data: {
        labels: w.labels,
        datasets: [
          {
            label: 'Mots lus',
            data: w.data,
            backgroundColor: 'rgba(13, 110, 253, 0.7)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  if (monthlyCanvas.value) {
    const m = buildMonthlyData();
    monthlyChart = new Chart(monthlyCanvas.value, {
      type: 'line',
      data: {
        labels: m.labels,
        datasets: [
          {
            label: 'Segments lus',
            data: m.data,
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.15)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  if (streakCanvas.value) {
    const s = buildStreakData();
    streakChart = new Chart(streakCanvas.value, {
      type: 'bar',
      data: {
        labels: s.labels,
        datasets: [
          {
            label: 'Mots lus',
            data: s.data,
            backgroundColor: 'rgba(13, 202, 240, 0.7)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}

onMounted(async () => {
  renderCharts();
  await loadBadges();
});
watch(() => libraryStore.sessions.length, renderCharts);

onUnmounted(() => {
  weeklyChart?.destroy();
  monthlyChart?.destroy();
  streakChart?.destroy();
});
</script>
