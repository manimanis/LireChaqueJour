import { describe, it, expect, beforeEach } from 'vitest';
import { AudioReader } from '../src/services/audioReaderService.js';
import { BADGES_CATALOG, evaluateBadges } from '../src/services/badgeService.js';

describe('AudioReader Service', () => {
  let reader;

  beforeEach(() => {
    reader = new AudioReader();
  });

  it('splits paragraphs into coherent sequential sentences', () => {
    const paragraphs = [
      'Il était une fois un livre merveilleux. Chaque jour, le lecteur lisait une page !',
      'Le soleil se levait tôt. Était-ce déjà le matin ?',
    ];

    reader.loadContent(paragraphs, 'fr-FR');
    expect(reader.sentences.length).toBe(4);
    expect(reader.sentences[0].text).toContain('Il était une fois');
    expect(reader.sentences[0].pIdx).toBe(0);
    expect(reader.sentences[1].pIdx).toBe(0);
    expect(reader.sentences[2].pIdx).toBe(1);
    expect(reader.sentences[3].pIdx).toBe(1);
  });

  it('bounds rate speed between 0.5 and 2.5', () => {
    reader.setRate(0.2);
    expect(reader.rate).toBe(0.5);

    reader.setRate(3.0);
    expect(reader.rate).toBe(2.5);

    reader.setRate(1.25);
    expect(reader.rate).toBe(1.25);
  });

  it('handles empty or malformed paragraphs gracefully', () => {
    reader.loadContent(['', '   ', null, 'Un mot.'], 'fr-FR');
    expect(reader.sentences.length).toBe(1);
    expect(reader.sentences[0].text).toBe('Un mot.');
  });
});

describe('Badge & Gamification Service', () => {
  it('contains 10 structured badges with descriptions and icons', () => {
    expect(BADGES_CATALOG.length).toBe(10);
    BADGES_CATALOG.forEach((badge) => {
      expect(badge.id).toBeTruthy();
      expect(badge.title).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
      expect(badge.category).toBeTruthy();
    });
  });

  it('evaluates streak badges correctly', async () => {
    const mockStore = {
      consecutiveDaysStreak: 7,
      progressMap: {
        'b1': { completedSegments: [1, 2, 3] },
      },
      async getUnlockedBadges() {
        return {};
      },
      async unlockBadge() {
        return true;
      },
      async getVocabulary() {
        return [];
      },
    };

    const unlocked = await evaluateBadges(mockStore);
    const ids = unlocked.map(u => u.id);
    expect(ids).toContain('first_step');
    expect(ids).toContain('streak_3');
    expect(ids).toContain('streak_7');
    expect(ids).not.toContain('streak_30');
  });
});
