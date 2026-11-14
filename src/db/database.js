import Dexie from 'dexie';

export const db = new Dexie('DailyReaderDB');

db.version(1).stores({
  books: 'id, title, author, createdAt',
  segments: 'id, bookId, [bookId+dayNumber], dayNumber',
  progress: 'bookId, currentSegment, lastReadingDate',
  summaries: 'id, [bookId+segmentNumber+length], bookId, segmentNumber',
  sessions: '++id, bookId, date',
});

export default db;
