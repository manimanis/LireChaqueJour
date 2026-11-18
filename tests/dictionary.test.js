import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanSelectedWord,
  parseWiktionaryExtract,
  fetchWordDefinition,
  detectReferenceWord,
  DICTIONARY_PROVIDERS,
} from '../src/services/dictionaryService.js';

describe('dictionaryService', () => {
  describe('cleanSelectedWord', () => {
    it('trims whitespace and punctuation', () => {
      expect(cleanSelectedWord('  livre.  ')).toBe('livre');
      expect(cleanSelectedWord('«roman»')).toBe('roman');
      expect(cleanSelectedWord('"mot",')).toBe('mot');
      expect(cleanSelectedWord('(inopiné) !')).toBe('inopiné');
    });

    it('strips French elisions', () => {
      expect(cleanSelectedWord("l'aventure")).toBe('aventure');
      expect(cleanSelectedWord("d'or")).toBe('or');
      expect(cleanSelectedWord("c'est")).toBe('est');
      expect(cleanSelectedWord("qu'on")).toBe('on');
      expect(cleanSelectedWord("l’imagination")).toBe('imagination');
    });

    it('returns empty string on empty/invalid inputs', () => {
      expect(cleanSelectedWord('')).toBe('');
      expect(cleanSelectedWord('   ')).toBe('');
      expect(cleanSelectedWord(null)).toBe('');
    });
  });

  describe('parseWiktionaryExtract', () => {
    it('extracts definitions and pronunciation from Wiktionary text', () => {
      const mockExtract = `
== Français ==

=== Étymologie ===
Du latin liber.

=== Nom commun 1 ===
livre \\livʁ\\ masculin
Assemblage de feuilles imprimées ou manuscrites.
Ouvrage relié formant un volume.
— (Voltaire, Zadig)

=== Forme de verbe ===
livre \\livʁ\\
Première personne du singulier du présent de l'indicatif de livrer.
`;

      const result = parseWiktionaryExtract('livre', mockExtract);
      expect(result).not.toBeNull();
      expect(result.word).toBe('livre');
      expect(result.pronunciation).toBe('\\livʁ\\');
      expect(result.etymology).toBe('Du latin liber.');
      expect(result.entries.length).toBeGreaterThanOrEqual(1);
      expect(result.entries[0].partOfSpeech).toBe('Nom commun 1');
      expect(result.entries[0].definitions).toContain('Assemblage de feuilles imprimées ou manuscrites.');
    });
  });

  describe('providers list', () => {
    it('lists required public providers', () => {
      const providerIds = DICTIONARY_PROVIDERS.map((p) => p.id);
      expect(providerIds).toContain('wiktionary_fr');
      expect(providerIds).toContain('wikipedia_fr');
      expect(providerIds).toContain('dictionary_api_en');
      expect(providerIds).toContain('custom');
    });
  });

  describe('fetchWordDefinition with mock fetch', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches and normalizes Wikipedia summary', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          title: 'Lecture',
          description: 'Activité cognitive',
          extract: 'La lecture est une activité cognitive complexe.',
          content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/Lecture' } },
        }),
      });

      const res = await fetchWordDefinition('lecture', { provider: 'wikipedia_fr' });
      expect(res.word).toBe('Lecture');
      expect(res.provider).toBe('wikipedia_fr');
      expect(res.entries[0].definitions[0]).toContain('activité cognitive');
    });

    it('fetches and normalizes Free Dictionary API (English)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            word: 'book',
            phonetic: '/bʊk/',
            phonetics: [{ text: '/bʊk/', audio: 'https://audio.url/book.mp3' }],
            meanings: [
              {
                partOfSpeech: 'noun',
                definitions: [{ definition: 'A written or printed work consisting of pages.' }],
              },
            ],
          },
        ],
      });

      const res = await fetchWordDefinition('book', { provider: 'dictionary_api_en' });
      expect(res.word).toBe('book');
      expect(res.pronunciation).toBe('/bʊk/');
      expect(res.audioUrl).toBe('https://audio.url/book.mp3');
      expect(res.entries[0].definitions[0]).toBe('A written or printed work consisting of pages.');
    });
  });

  describe('vocabulary filtering and sorting logic', () => {
    const mockWords = [
      {
        id: 1,
        word: 'roman',
        bookId: 'book-1',
        bookTitle: 'Le Comte de Monte-Cristo',
        lookupCount: 1,
        lookedUpAt: '2026-11-10T10:00:00.000Z',
      },
      {
        id: 2,
        word: 'aventure',
        bookId: 'book-2',
        bookTitle: 'Les Misérables',
        lookupCount: 3,
        lookedUpAt: '2026-11-12T10:00:00.000Z',
      },
      {
        id: 3,
        word: 'abnégation',
        bookId: 'book-1',
        bookTitle: 'Le Comte de Monte-Cristo',
        lookupCount: 2,
        lookedUpAt: '2026-11-14T10:00:00.000Z',
      },
    ];

    it('filters vocabulary by specific bookId', () => {
      const book1Words = mockWords.filter((w) => w.bookId === 'book-1');
      expect(book1Words).toHaveLength(2);
      expect(book1Words.map((w) => w.word)).toEqual(['roman', 'abnégation']);
    });

    it('returns all words when filter is "all"', () => {
      const allFilter = (filterBookId) =>
        filterBookId === 'all' ? mockWords : mockWords.filter((w) => w.bookId === filterBookId);

      expect(allFilter('all')).toHaveLength(3);
      expect(allFilter('book-2')).toHaveLength(1);
    });

    it('sorts alphabetically and by lookup frequency', () => {
      const alphaSorted = [...mockWords].sort((a, b) =>
        a.word.localeCompare(b.word, 'fr')
      );
      expect(alphaSorted.map((w) => w.word)).toEqual(['abnégation', 'aventure', 'roman']);

      const frequencySorted = [...mockWords].sort((a, b) => b.lookupCount - a.lookupCount);
      expect(frequencySorted.map((w) => w.word)).toEqual(['aventure', 'abnégation', 'roman']);
    });
  });

  describe('detectReferenceWord', () => {
    it('detects feminine / masculine / plural cross-references', () => {
      expect(detectReferenceWord('Féminin singulier de débordant.')).toBe('débordant');
      expect(detectReferenceWord('Pluriel de livre (ouvrage qu’on lit).')).toBe('livre');
      expect(detectReferenceWord('Masculin pluriel de beau.')).toBe('beau');
    });

    it('detects conjugated verbs references', () => {
      expect(detectReferenceWord('Deuxième personne du singulier du présent de l’indicatif du verbe livrer.')).toBe('livrer');
      expect(detectReferenceWord('Troisième personne du singulier de l’imparfait de l’indicatif de manger.')).toBe('manger');
      expect(detectReferenceWord('Participe présent de déborder.')).toBe('déborder');
    });

    it('detects variants and synonyms', () => {
      expect(detectReferenceWord('Variante de clé.')).toBe('clé');
      expect(detectReferenceWord('Synonyme de courage.')).toBe('courage');
      expect(detectReferenceWord('→ voir déborder')).toBe('déborder');
    });

    it('returns null for standalone definitions', () => {
      expect(detectReferenceWord('Assemblage de feuilles manuscrites ou imprimées.')).toBeNull();
      expect(detectReferenceWord('')).toBeNull();
    });

    it('extracts referenceWords in parseWiktionaryExtract', () => {
      const mockFlex = `
== Français ==

=== Forme d’adjectif ===
débordante \\de.bɔʁ.dɑ̃t\\

Féminin singulier de débordant.
`;
      const parsed = parseWiktionaryExtract('débordante', mockFlex);
      expect(parsed.referenceWords).toContain('débordant');
      expect(parsed.entries[0].definitionItems[0].referenceWord).toBe('débordant');
    });
  });
});
