import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getLocalIsoDate, toLocalIsoDate } from '../src/utils/dateUtils.js';
import {
  escapeHtml,
  renderHighlightedParagraph,
  filterSearchSegments,
} from '../src/utils/readerHelpers.js';

// In-memory Dexie-like mock for testing libraryStore without IndexedDB
const mockTables = vi.hoisted(() => {
  const createTable = (keyField = 'id') => {
    let rows = [];
    return {
      _rows: () => rows,
      _reset: () => {
        rows = [];
      },
      toArray: vi.fn(async () => [...rows]),
      orderBy: vi.fn(() => ({
        reverse: () => ({
          toArray: async () => [...rows].reverse(),
        }),
      })),
      get: vi.fn(async (key) => rows.find((r) => r[keyField] === key)),
      put: vi.fn(async (item) => {
        const idx = rows.findIndex((r) => r[keyField] === item[keyField]);
        if (idx >= 0) rows[idx] = { ...item };
        else rows.push({ ...item });
        return item[keyField];
      }),
      add: vi.fn(async (item) => {
        const id = item[keyField] ?? rows.length + 1;
        rows.push({ ...item, [keyField]: id });
        return id;
      }),
      bulkPut: vi.fn(async (items) => {
        for (const item of items) {
          const idx = rows.findIndex((r) => r[keyField] === item[keyField]);
          if (idx >= 0) rows[idx] = { ...item };
          else rows.push({ ...item });
        }
      }),
      delete: vi.fn(async (key) => {
        rows = rows.filter((r) => r[keyField] !== key);
      }),
      clear: vi.fn(async () => {
        rows = [];
      }),
      where: vi.fn((field) => ({
        equals: (val) => ({
          delete: async () => {
            rows = rows.filter((r) => r[field] !== val);
          },
          sortBy: async () => rows.filter((r) => r[field] === val),
          first: async () => rows.find((r) => r[field] === val),
          filter: (fn) => ({
            first: async () => rows.filter((r) => r[field] === val).find(fn),
          }),
        }),
        between: ([bId, minDay], [, maxDay]) => ({
          toArray: async () =>
            rows.filter(
              (r) =>
                r.bookId === bId &&
                r.dayNumber >= minDay &&
                r.dayNumber <= maxDay
            ),
        }),
      })),
      toCollection: vi.fn(() => ({
        sortBy: async () => [...rows],
      })),
    };
  };

  return {
    books: createTable('id'),
    segments: createTable('id'),
    progress: createTable('bookId'),
    summaries: createTable('id'),
    sessions: createTable('id'),
    vocabulary: createTable('id'),
    highlights: createTable('id'),
    badges: createTable('id'),
    transaction: vi.fn(async (...args) => {
      const fn = args[args.length - 1];
      return await fn();
    }),
  };
});

vi.mock('@/db/database.js', () => ({
  default: mockTables,
  db: mockTables,
}));

import { useLibraryStore } from '../src/stores/libraryStore.js';

describe('dateUtils', () => {
  it('formats local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 10, 5, 23, 45, 0); // Nov 5, 2026 23:45 local
    expect(getLocalIsoDate(d)).toBe('2026-11-05');
  });

  it('preserves plain YYYY-MM-DD strings and converts Date objects', () => {
    expect(toLocalIsoDate('2026-03-15')).toBe('2026-03-15');
    expect(toLocalIsoDate(new Date(2026, 0, 9, 1, 0, 0))).toBe('2026-01-09');
    expect(toLocalIsoDate(null)).toBe('');
    expect(toLocalIsoDate('invalid-date')).toBe('');
  });
});

describe('readerHelpers', () => {
  it('escapes HTML entities safely', () => {
    expect(escapeHtml('<script>"alert"</script>')).toBe(
      '&lt;script&gt;&quot;alert&quot;&lt;/script&gt;'
    );
  });

  it('renders user highlights for the active day without corrupting vocab marks', () => {
    const html = renderHighlightedParagraph(
      'Le capitaine Dantès regarde la mer.',
      0,
      {
        displayedDay: 2,
        highlights: [
          { id: 42, dayNumber: 2, text: 'capitaine Dantès', color: 'green' },
          { id: 99, dayNumber: 3, text: 'regarde la mer', color: 'pink' },
        ],
        knownWords: new Set(['capitaine']),
        highlightVocabularyWords: true,
      }
    );

    expect(html).toContain('class="user-highlight user-highlight-green"');
    expect(html).toContain('data-highlight-id="42"');
    expect(html).not.toContain('data-highlight-id="99"');
    expect(html).toContain('<mark class="vocab-highlight" data-word="capitaine"');
  });

  it('filters search results strictly up to maxAllowedDay (anti-spoiler)', () => {
    const segments = [
      { dayNumber: 1, content: 'Edmond arrive à Marseille.' },
      { dayNumber: 2, content: 'Il rencontre Mercédès.' },
      { dayNumber: 3, content: 'SPOILER: Edmond découvre le trésor.' },
    ];

    const hits = filterSearchSegments(segments, 'Edmond', 2);
    expect(hits).toHaveLength(1);
    expect(hits[0].dayNumber).toBe(1);
  });
});

describe('libraryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(mockTables).forEach((t) => t._reset?.());
    vi.clearAllMocks();
  });

  it('exports and imports a complete backup including highlights and badges', async () => {
    await mockTables.books.put({
      id: 'b1',
      title: 'Monte-Cristo',
      totalSegments: 10,
      createdAt: '2026-11-01T10:00:00.000Z',
    });
    await mockTables.highlights.add({
      id: 1,
      bookId: 'b1',
      dayNumber: 1,
      text: 'Passage marquant',
      color: 'yellow',
    });
    await mockTables.badges.put({
      id: 'first_step',
      unlockedAt: '2026-11-01T10:05:00.000Z',
    });

    const store = useLibraryStore();
    const json = await store.exportBackup();
    const parsed = JSON.parse(json);

    expect(parsed.books).toHaveLength(1);
    expect(parsed.highlights).toHaveLength(1);
    expect(parsed.badges).toHaveLength(1);

    await store.clearAllData();
    expect(mockTables.books._rows()).toHaveLength(0);
    expect(mockTables.highlights._rows()).toHaveLength(0);

    await store.importBackup(json);
    expect(store.books).toHaveLength(1);
    expect(mockTables.highlights._rows()).toHaveLength(1);
    expect(mockTables.badges._rows()).toHaveLength(1);
  });

  it('deletes highlights along with the book in deleteBook', async () => {
    await mockTables.books.put({
      id: 'b1',
      title: 'Livre 1',
      createdAt: '2026-11-01T10:00:00.000Z',
    });
    await mockTables.highlights.add({
      id: 1,
      bookId: 'b1',
      dayNumber: 1,
      text: 'À supprimer',
    });
    await mockTables.highlights.add({
      id: 2,
      bookId: 'b2',
      dayNumber: 1,
      text: 'À conserver',
    });

    const store = useLibraryStore();
    await store.loadLibrary();
    await store.deleteBook('b1');

    expect(store.books).toHaveLength(0);
    expect(mockTables.highlights._rows()).toHaveLength(1);
    expect(mockTables.highlights._rows()[0].bookId).toBe('b2');
  });

  it('computes consecutiveDaysStreak using local dates', async () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    await mockTables.sessions.add({
      id: 1,
      bookId: 'b1',
      date: today.toISOString(),
      wordCount: 400,
    });
    await mockTables.sessions.add({
      id: 2,
      bookId: 'b1',
      date: yesterday.toISOString(),
      wordCount: 400,
    });

    const store = useLibraryStore();
    await store.loadLibrary();
    expect(store.consecutiveDaysStreak).toBe(2);
  });
});
