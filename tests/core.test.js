import { describe, it, expect } from 'vitest';
import {
  countWords,
  estimateReadingMinutes,
  segmentText,
} from '../src/services/segmenter.js';
import { generateLocalSummary } from '../src/services/summarizer.js';

describe('segmenter', () => {
  it('estimates 2 minutes for 400 words', () => {
    expect(estimateReadingMinutes(400)).toBe(2);
  });

  it('prefers paragraph boundaries within tolerance', () => {
    const para1 = Array(390).fill('mot').join(' ') + '.';
    const para2 = Array(405).fill('autre').join(' ') + '.';
    const text = `${para1}\n\n${para2}`;

    const segments = segmentText('book-1', text, {
      wordsPerDay: 400,
      tolerance: 20,
    });

    expect(segments).toHaveLength(2);
    expect(segments[0].wordCount).toBe(390);
    expect(segments[1].wordCount).toBe(405);
    expect(segments[0].content.endsWith('mot.')).toBe(true);
  });

  it('prefers sentence boundaries when no paragraph break is in range', () => {
    const firstPart = Array(385).fill('alpha').join(' ') + '.';
    const secondPart = Array(100).fill('beta').join(' ') + '.';
    const text = `${firstPart} ${secondPart}`;

    const segments = segmentText('book-2', text, {
      wordsPerDay: 400,
      tolerance: 20,
    });

    expect(segments).toHaveLength(2);
    expect(segments[0].wordCount).toBe(385);
    expect(segments[0].content.endsWith('alpha.')).toBe(true);
  });

  it('segments a 120,000-word book into ~300 days quickly', () => {
    const sentence = 'Edmond Dantès attendait patiemment dans sa cellule du Château d’If.';
    const paragraph = Array(8).fill(sentence).join(' ');
    const fullText = Array(1500).fill(paragraph).join('\n\n');
    const total = countWords(fullText);

    const start = performance.now();
    const segments = segmentText('book-large', fullText, {
      wordsPerDay: 400,
      tolerance: 20,
    });
    const elapsed = performance.now() - start;

    expect(total).toBeGreaterThan(100000);
    expect(segments.length).toBeGreaterThan(250);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('summarizer', () => {
  it('generates short, medium, and long summaries strictly from provided text', () => {
    const sentences = [
      'Edmond Dantès arrive à Marseille à bord du navire le Pharaon.',
      'Il est nommé capitaine par son armateur Monsieur Morrel.',
      'Danglars et Fernand complotent secrètement contre le jeune marin.',
      'Le jour de ses fiançailles avec Mercédès, Edmond est arrêté.',
      'Le substitut Villefort l’envoie sans jugement au Château d’If.',
      'Dans sa prison sombre, Edmond fait la rencontre de l’abbé Faria.',
      'L’abbé Faria lui enseigne les sciences, les langues et l’histoire.',
      'Avant de mourir, l’abbé révèle l’existence d’un fabuleux trésor sur l’île de Monte-Cristo.',
      'Edmond réussit à s’évader en prenant la place du défunt dans le sac mortuaire.',
      'Recueilli par des contrebandiers, il rejoint enfin l’île de Monte-Cristo.',
      'Il découvre la grotte secrète remplie d’or, de diamants et de pierres précieuses.',
      'Devenu immensément riche, le comte de Monte-Cristo prépare sa vengeance à Paris.',
    ];
    const readText = Array(4).fill(sentences.join(' ')).join('\n\n');

    const shortSum = generateLocalSummary(readText, 'short');
    const mediumSum = generateLocalSummary(readText, 'medium');
    const longSum = generateLocalSummary(readText, 'long');

    expect(countWords(shortSum)).toBeGreaterThan(15);
    expect(countWords(shortSum)).toBeLessThanOrEqual(75);
    expect(countWords(mediumSum)).toBeGreaterThan(40);
    expect(countWords(longSum)).toBeGreaterThan(80);
    expect(shortSum).not.toContain('SPOILER_FUTUR');
  });

  it('returns empty string for empty read text', () => {
    expect(generateLocalSummary('', 'medium')).toBe('');
  });
});
