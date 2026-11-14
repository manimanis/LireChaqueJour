import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import db from '@/db/database.js';
import { parseEpubFile } from '@/services/epubParser.js';
import { segmentText, estimateReadingMinutes } from '@/services/segmenter.js';
import { generateLocalSummary } from '@/services/summarizer.js';
import { useSettingsStore } from './settingsStore.js';

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const useLibraryStore = defineStore('library', () => {
  const books = ref([]);
  const progressMap = ref({});
  const sessions = ref([]);
  const isLoaded = ref(false);

  const settingsStore = useSettingsStore();

  const activeBook = computed(() => {
    if (books.value.length === 0) return null;
    if (settingsStore.currentBookId) {
      const found = books.value.find((b) => b.id === settingsStore.currentBookId);
      if (found) return found;
    }
    return books.value[0];
  });

  async function loadLibrary() {
    const [allBooks, allProgress, allSessions] = await Promise.all([
      db.books.orderBy('createdAt').reverse().toArray(),
      db.progress.toArray(),
      db.sessions.orderBy('date').reverse().toArray(),
    ]);

    books.value = allBooks;
    const pMap = {};
    for (const p of allProgress) {
      pMap[p.bookId] = p;
    }
    progressMap.value = pMap;
    sessions.value = allSessions;
    isLoaded.value = true;

    if (!settingsStore.currentBookId && allBooks.length > 0) {
      settingsStore.currentBookId = allBooks[0].id;
    }
  }

  function getProgress(bookId) {
    return (
      progressMap.value[bookId] || {
        bookId,
        currentSegment: 1,
        currentPosition: 0,
        finishedSegments: 0,
        completion: 0,
        completedSegments: [],
        lastReadingDate: null,
        postponedDate: null,
      }
    );
  }

  async function importBook(file, customOptions = {}, onProgress) {
    const wordsPerDay =
      customOptions.wordsPerDay ?? settingsStore.defaultWordsPerDay;
    const tolerance =
      customOptions.tolerance ?? settingsStore.defaultTolerance;
    const readWeekends =
      customOptions.readWeekends ?? settingsStore.defaultReadWeekends;

    const parsed = await parseEpubFile(file, onProgress);
    const bookId = crypto.randomUUID();
    const segments = segmentText(bookId, parsed.fullText, {
      wordsPerDay,
      tolerance,
    });

    const bookRecord = {
      id: bookId,
      title: parsed.title,
      author: parsed.author,
      cover: parsed.cover,
      chapters: parsed.chapters,
      fullText: parsed.fullText,
      totalWords: parsed.totalWords,
      totalSegments: segments.length,
      wordsPerDay,
      tolerance,
      readWeekends,
      createdAt: new Date().toISOString(),
    };

    const progressRecord = {
      bookId,
      currentSegment: 1,
      currentPosition: 0,
      finishedSegments: 0,
      completion: 0,
      completedSegments: [],
      lastReadingDate: null,
      postponedDate: null,
    };

    await db.transaction('rw', db.books, db.segments, db.progress, async () => {
      await db.books.put(bookRecord);
      await db.segments.bulkPut(segments);
      await db.progress.put(progressRecord);
    });

    books.value.unshift(bookRecord);
    progressMap.value = {
      ...progressMap.value,
      [bookId]: progressRecord,
    };
    settingsStore.currentBookId = bookId;

    onProgress?.(100, 'Livre importé !');
    return bookRecord;
  }

  async function getBookSegments(bookId) {
    return await db.segments
      .where('[bookId+dayNumber]')
      .between([bookId, 0], [bookId, Infinity])
      .toArray();
  }

  async function getSegment(bookId, dayNumber) {
    return await db.segments
      .where('[bookId+dayNumber]')
      .equals([bookId, dayNumber])
      .first();
  }

  async function updateBookRhythm(bookId, { wordsPerDay, tolerance, readWeekends }) {
    const book = await db.books.get(bookId);
    if (!book) return;

    const existingProgress = getProgress(bookId);
    const currentWordPos = existingProgress.currentPosition || 0;

    const newSegments = segmentText(bookId, book.fullText, {
      wordsPerDay,
      tolerance,
    });

    // Preserve user's word position in the re-segmented book
    let newCurrentSegment = 1;
    const newCompletedSegments = [];
    for (const seg of newSegments) {
      if (seg.endPosition <= currentWordPos) {
        newCompletedSegments.push(seg.dayNumber);
        newCurrentSegment = Math.min(newSegments.length, seg.dayNumber + 1);
      } else if (
        currentWordPos >= seg.startPosition &&
        currentWordPos < seg.endPosition
      ) {
        newCurrentSegment = seg.dayNumber;
        break;
      }
    }

    const finishedSegments = newCompletedSegments.length;
    const completion =
      newSegments.length > 0
        ? Math.min(100, Number(((finishedSegments / newSegments.length) * 100).toFixed(1)))
        : 0;

    const updatedBook = {
      ...book,
      wordsPerDay,
      tolerance,
      readWeekends,
      totalSegments: newSegments.length,
    };

    const updatedProgress = {
      ...existingProgress,
      currentSegment: newCurrentSegment,
      finishedSegments,
      completion,
      completedSegments: newCompletedSegments,
    };

    await db.transaction(
      'rw',
      db.books,
      db.segments,
      db.progress,
      db.summaries,
      async () => {
        await db.books.put(updatedBook);
        await db.segments.where('bookId').equals(bookId).delete();
        await db.segments.bulkPut(newSegments);
        await db.progress.put(updatedProgress);
        await db.summaries.where('bookId').equals(bookId).delete();
      }
    );

    const idx = books.value.findIndex((b) => b.id === bookId);
    if (idx !== -1) books.value[idx] = updatedBook;
    progressMap.value = {
      ...progressMap.value,
      [bookId]: updatedProgress,
    };
  }

  async function markSegmentCompleted(bookId, segmentNumber) {
    const book = books.value.find((b) => b.id === bookId);
    if (!book) return;

    const segment = await getSegment(bookId, segmentNumber);
    if (!segment) return;

    const prev = getProgress(bookId);
    const completedSet = new Set(prev.completedSegments || []);
    const alreadyCompleted = completedSet.has(segmentNumber);
    completedSet.add(segmentNumber);

    const completedSegments = Array.from(completedSet).sort((a, b) => a - b);
    const finishedSegments = completedSegments.length;
    const completion =
      book.totalSegments > 0
        ? Math.min(100, Number(((finishedSegments / book.totalSegments) * 100).toFixed(1)))
        : 0;

    const nextSegment =
      segmentNumber < book.totalSegments ? segmentNumber + 1 : book.totalSegments;

    const updatedProgress = {
      ...prev,
      bookId,
      currentSegment: nextSegment,
      currentPosition: Math.max(prev.currentPosition || 0, segment.endPosition),
      finishedSegments,
      completion,
      completedSegments,
      lastReadingDate: new Date().toISOString(),
      postponedDate: null,
    };

    await db.progress.put(updatedProgress);
    progressMap.value = {
      ...progressMap.value,
      [bookId]: updatedProgress,
    };

    if (!alreadyCompleted) {
      const sessionRecord = {
        bookId,
        bookTitle: book.title,
        segmentNumber,
        wordCount: segment.wordCount,
        durationMinutes: estimateReadingMinutes(segment.wordCount),
        date: new Date().toISOString(),
      };
      const id = await db.sessions.add(sessionRecord);
      sessions.value.unshift({ ...sessionRecord, id });
    }
  }

  async function postponeToday(bookId) {
    const prev = getProgress(bookId);
    const updatedProgress = {
      ...prev,
      bookId,
      postponedDate: getTodayIso(),
    };
    await db.progress.put(updatedProgress);
    progressMap.value = {
      ...progressMap.value,
      [bookId]: updatedProgress,
    };
  }

  async function resetProgress(bookId) {
    const resetRecord = {
      bookId,
      currentSegment: 1,
      currentPosition: 0,
      finishedSegments: 0,
      completion: 0,
      completedSegments: [],
      lastReadingDate: null,
      postponedDate: null,
    };

    await db.transaction('rw', db.progress, db.summaries, async () => {
      await db.progress.put(resetRecord);
      await db.summaries.where('bookId').equals(bookId).delete();
    });

    progressMap.value = {
      ...progressMap.value,
      [bookId]: resetRecord,
    };
  }

  async function deleteBook(bookId) {
    await db.transaction(
      'rw',
      db.books,
      db.segments,
      db.progress,
      db.summaries,
      async () => {
        await db.books.delete(bookId);
        await db.segments.where('bookId').equals(bookId).delete();
        await db.progress.delete(bookId);
        await db.summaries.where('bookId').equals(bookId).delete();
      }
    );

    books.value = books.value.filter((b) => b.id !== bookId);
    const nextMap = { ...progressMap.value };
    delete nextMap[bookId];
    progressMap.value = nextMap;

    if (settingsStore.currentBookId === bookId) {
      settingsStore.currentBookId = books.value[0]?.id || null;
    }
  }

  /**
   * Retrieve cached summary or generate a new one strictly from already-read segments.
   */
  async function getOrGenerateSummary(
    bookId,
    currentSegmentNumber,
    length = 'medium',
    forceRegenerate = false
  ) {
    const prog = getProgress(bookId);
    const completedBefore = (prog.completedSegments || []).filter(
      (n) => n < currentSegmentNumber
    );

    if (completedBefore.length === 0) {
      return '';
    }

    const cacheId = `${bookId}_${currentSegmentNumber}_${length}`;
    if (!forceRegenerate) {
      const cached = await db.summaries.get(cacheId);
      if (cached?.content) {
        return cached.content;
      }
    }

    // Strictly load ONLY already-read segments (never future segments)
    const readSegments = await db.segments
      .where('[bookId+dayNumber]')
      .between([bookId, 1], [bookId, currentSegmentNumber - 1], true, true)
      .toArray();

    const readText = readSegments.map((s) => s.content).join('\n\n');
    const summaryContent = generateLocalSummary(readText, length);

    await db.summaries.put({
      id: cacheId,
      bookId,
      segmentNumber: currentSegmentNumber,
      length,
      content: summaryContent,
      generatedAt: new Date().toISOString(),
    });

    return summaryContent;
  }

  // Global statistics
  const totalWordsRead = computed(() =>
    sessions.value.reduce((sum, s) => sum + (s.wordCount || 0), 0)
  );

  const totalMinutesRead = computed(() =>
    sessions.value.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  );

  const consecutiveDaysStreak = computed(() => {
    if (sessions.value.length === 0) return 0;
    const uniqueDays = new Set(
      sessions.value.map((s) => (s.date || '').slice(0, 10)).filter(Boolean)
    );
    if (uniqueDays.size === 0) return 0;

    let streak = 0;
    const cursor = new Date();
    const todayStr = cursor.toISOString().slice(0, 10);

    // If user hasn't read today yet, allow streak starting from yesterday
    if (!uniqueDays.has(todayStr)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  });

  const hasPendingReadingToday = computed(() => {
    const book = activeBook.value;
    if (!book) return false;
    const prog = getProgress(book.id);
    if (prog.completion >= 100) return false;
    const today = getTodayIso();
    if (prog.lastReadingDate?.slice(0, 10) === today) return false;
    if (prog.postponedDate === today) return false;
    if (!book.readWeekends) {
      const day = new Date().getDay();
      if (day === 0 || day === 6) return false;
    }
    return true;
  });

  async function exportBackup() {
    const [allBooks, allSegments, allProgress, allSummaries, allSessions] =
      await Promise.all([
        db.books.toArray(),
        db.segments.toArray(),
        db.progress.toArray(),
        db.summaries.toArray(),
        db.sessions.toArray(),
      ]);

    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        books: allBooks,
        segments: allSegments,
        progress: allProgress,
        summaries: allSummaries,
        sessions: allSessions,
      },
      null,
      2
    );
  }

  async function importBackup(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.books)) {
      throw new Error('Format de sauvegarde invalide.');
    }

    await db.transaction(
      'rw',
      db.books,
      db.segments,
      db.progress,
      db.summaries,
      db.sessions,
      async () => {
        if (data.books?.length) await db.books.bulkPut(data.books);
        if (data.segments?.length) await db.segments.bulkPut(data.segments);
        if (data.progress?.length) await db.progress.bulkPut(data.progress);
        if (data.summaries?.length) await db.summaries.bulkPut(data.summaries);
        if (data.sessions?.length) await db.sessions.bulkPut(data.sessions);
      }
    );

    await loadLibrary();
  }

  async function clearAllData() {
    await db.transaction(
      'rw',
      db.books,
      db.segments,
      db.progress,
      db.summaries,
      db.sessions,
      async () => {
        await db.books.clear();
        await db.segments.clear();
        await db.progress.clear();
        await db.summaries.clear();
        await db.sessions.clear();
      }
    );
    books.value = [];
    progressMap.value = {};
    sessions.value = [];
    settingsStore.currentBookId = null;
  }

  return {
    books,
    progressMap,
    sessions,
    isLoaded,
    activeBook,
    totalWordsRead,
    totalMinutesRead,
    consecutiveDaysStreak,
    hasPendingReadingToday,
    loadLibrary,
    getProgress,
    importBook,
    getBookSegments,
    getSegment,
    updateBookRhythm,
    markSegmentCompleted,
    postponeToday,
    resetProgress,
    deleteBook,
    getOrGenerateSummary,
    exportBackup,
    importBackup,
    clearAllData,
  };
});
