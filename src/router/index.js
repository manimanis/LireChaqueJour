import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import LibraryView from '@/views/LibraryView.vue';
import BookDetailView from '@/views/BookDetailView.vue';
import TodayView from '@/views/TodayView.vue';
import StatsView from '@/views/StatsView.vue';
import SettingsView from '@/views/SettingsView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Accueil' },
  },
  {
    path: '/library',
    name: 'library',
    component: LibraryView,
    meta: { title: 'Bibliothèque' },
  },
  {
    path: '/book/:id',
    name: 'book-detail',
    component: BookDetailView,
    meta: { title: 'Détail du livre' },
  },
  {
    path: '/today/:bookId?',
    name: 'today',
    component: TodayView,
    meta: { title: "Aujourd'hui" },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
    meta: { title: 'Statistiques' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Paramètres' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const pageTitle = to.meta?.title ? `${to.meta.title} — Daily Reader` : 'Daily Reader';
  document.title = pageTitle;
});

export default router;
