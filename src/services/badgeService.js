/**
 * Badge & Gamification Service for Lire chaque jour
 */

export const BADGES_CATALOG = [
  {
    id: 'first_step',
    title: 'Premier pas',
    description: 'Avoir validé votre premier segment de lecture quotidienne.',
    icon: 'bi-flag-fill',
    color: '#0d6efd',
    category: 'Habitude',
  },
  {
    id: 'streak_3',
    title: 'Flamme naissante',
    description: '3 jours consécutifs de lecture suivis avec assiduité.',
    icon: 'bi-fire',
    color: '#fd7e14',
    category: 'Régularité',
  },
  {
    id: 'streak_7',
    title: 'Habitude d’or',
    description: 'Une semaine complète sans manquer une seule journée.',
    icon: 'bi-trophy-fill',
    color: '#ffc107',
    category: 'Régularité',
  },
  {
    id: 'streak_30',
    title: 'Maître du rituel',
    description: '30 jours consécutifs de lecture quotidienne !',
    icon: 'bi-award-fill',
    color: '#6f42c1',
    category: 'Régularité',
  },
  {
    id: 'first_book',
    title: 'Premier grand voyage',
    description: 'Avoir terminé votre tout premier livre dans l’application.',
    icon: 'bi-book-half',
    color: '#198754',
    category: 'Livres',
  },
  {
    id: 'book_worm',
    title: 'Dévoreur d’histoires',
    description: '3 livres entiers menés à leur terme.',
    icon: 'bi-journal-check',
    color: '#20c997',
    category: 'Livres',
  },
  {
    id: 'night_owl',
    title: 'Lecteur nocturne',
    description: 'Avoir complété une lecture paisible après 21h00.',
    icon: 'bi-moon-stars-fill',
    color: '#0dcaf0',
    category: 'Moments',
  },
  {
    id: 'early_bird',
    title: 'Éveil de l’esprit',
    description: 'Avoir terminé votre lecture matinale avant 08h00.',
    icon: 'bi-sunrise-fill',
    color: '#eab308',
    category: 'Moments',
  },
  {
    id: 'scholar',
    title: 'Érudit curieux',
    description: 'Avoir recherché 10 définitions de mots dans le dictionnaire.',
    icon: 'bi-lightbulb-fill',
    color: '#f43f5e',
    category: 'Vocabulaire',
  },
  {
    id: 'flashcard_master',
    title: 'Mémoire d’éléphant',
    description: 'Avoir révisé 20 fois vos fiches en mode Flashcards.',
    icon: 'bi-card-checklist',
    color: '#8b5cf6',
    category: 'Vocabulaire',
  },
];

/**
 * Check badge criteria against current user statistics
 * @param {Object} libraryStore
 * @returns {Promise<Array<Object>>} newly unlocked badge objects
 */
export async function evaluateBadges(libraryStore) {
  const newlyUnlocked = [];
  if (!libraryStore) return newlyUnlocked;

  const unlockedMap = await libraryStore.getUnlockedBadges();

  const streak = libraryStore.consecutiveDaysStreak || 0;
  const now = new Date();
  const currentHour = now.getHours();

  // 1. First step
  if (!unlockedMap['first_step']) {
    let anyCompleted = false;
    Object.values(libraryStore.progressMap || {}).forEach((p) => {
      if (p.completedSegments && p.completedSegments.length > 0) anyCompleted = true;
    });
    if (anyCompleted) {
      if (await libraryStore.unlockBadge('first_step')) {
        newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'first_step'));
      }
    }
  }

  // 2. Streaks
  if (!unlockedMap['streak_3'] && streak >= 3) {
    if (await libraryStore.unlockBadge('streak_3')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'streak_3'));
    }
  }
  if (!unlockedMap['streak_7'] && streak >= 7) {
    if (await libraryStore.unlockBadge('streak_7')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'streak_7'));
    }
  }
  if (!unlockedMap['streak_30'] && streak >= 30) {
    if (await libraryStore.unlockBadge('streak_30')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'streak_30'));
    }
  }

  // 3. Finished books
  let finishedCount = 0;
  Object.values(libraryStore.progressMap || {}).forEach((p) => {
    if (p.completion >= 100) finishedCount++;
  });

  if (!unlockedMap['first_book'] && finishedCount >= 1) {
    if (await libraryStore.unlockBadge('first_book')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'first_book'));
    }
  }
  if (!unlockedMap['book_worm'] && finishedCount >= 3) {
    if (await libraryStore.unlockBadge('book_worm')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'book_worm'));
    }
  }

  // 4. Time of day checks
  if (!unlockedMap['night_owl'] && currentHour >= 21) {
    if (await libraryStore.unlockBadge('night_owl')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'night_owl'));
    }
  }
  if (!unlockedMap['early_bird'] && currentHour < 8) {
    if (await libraryStore.unlockBadge('early_bird')) {
      newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'early_bird'));
    }
  }

  // 5. Vocabulary lookups
  if (!unlockedMap['scholar']) {
    const vocab = await libraryStore.getVocabulary();
    if (vocab.length >= 10) {
      if (await libraryStore.unlockBadge('scholar')) {
        newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'scholar'));
      }
    }
  }

  // 6. Flashcard reviews
  if (!unlockedMap['flashcard_master']) {
    const vocab = await libraryStore.getVocabulary();
    const reviewedCount = vocab.filter(v => (v.masteryLevel || 0) > 0 || v.lastReviewedAt).length;
    if (reviewedCount >= 20) {
      if (await libraryStore.unlockBadge('flashcard_master')) {
        newlyUnlocked.push(BADGES_CATALOG.find(b => b.id === 'flashcard_master'));
      }
    }
  }

  return newlyUnlocked;
}
