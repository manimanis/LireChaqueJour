import { countWords } from './segmenter.js';

export const SUMMARY_LENGTH_TARGETS = {
  short: 50,
  medium: 100,
  long: 200,
};

const STOP_WORDS = new Set([
  // French
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou', 'où',
  'mais', 'donc', 'or', 'ni', 'car', 'à', 'au', 'aux', 'en', 'dans', 'par',
  'pour', 'avec', 'sans', 'sous', 'sur', 'chez', 'vers', 'entre', 'ce', 'cet',
  'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
  'notre', 'votre', 'leur', 'nos', 'vos', 'leurs', 'je', 'tu', 'il', 'elle',
  'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'lui', 'y', 'en',
  'qui', 'que', 'quoi', 'dont', 'ne', 'pas', 'plus', 'jamais', 'rien', 'tout',
  'tous', 'toute', 'toutes', 'est', 'sont', 'était', 'étaient', 'a', 'ont',
  'avait', 'avaient', 'être', 'avoir', 'faire', 'fait', 'dit', 'comme', 'si',
  'bien', 'très', 'aussi', 'même', 'encore', 'alors', 'ainsi', 'après', 'avant',
  'depuis', 'pendant', 'quand', 'lorsque', 'puis', 'c', 'j', 'l', 'm', 'n', 's', 't', 'qu',
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'i',
  'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'not', 'no', 'so', 'if', 'then', 'than', 'when', 'while', 'as', 'there',
]);

/**
 * Split text into clean sentences.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const raw = normalized.match(/[^.!?…]+[.!?…]+[»”"')\]\u00BB]*/g);
  if (!raw) return [normalized];

  return raw
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 4);
}

/**
 * Extract normalized content keywords from a sentence.
 * @param {string} sentence
 * @returns {Set<string>}
 */
function extractKeywords(sentence) {
  const words = sentence
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return new Set(words);
}

/**
 * Compute normalized overlap similarity between two keyword sets.
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number}
 */
function sentenceSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  if (intersection === 0) return 0;
  const norm = Math.log(setA.size + 1) + Math.log(setB.size + 1);
  return norm > 0 ? intersection / norm : 0;
}

/**
 * Generate a local offline extractive summary using TextRank.
 * Strictly analyzes the provided `readText` (already-read segments only).
 *
 * @param {string} readText
 * @param {'short'|'medium'|'long'} [length='medium']
 * @returns {string}
 */
export function generateLocalSummary(readText, length = 'medium') {
  if (!readText || !readText.trim()) {
    return '';
  }

  const targetWords = SUMMARY_LENGTH_TARGETS[length] || SUMMARY_LENGTH_TARGETS.medium;
  const totalWords = countWords(readText);

  if (totalWords <= targetWords + 15) {
    return readText.replace(/\s+/g, ' ').trim();
  }

  let sentences = splitSentences(readText);
  if (sentences.length === 0) {
    return readText.split(/\s+/).slice(0, targetWords).join(' ') + '…';
  }

  // Keep computation fast (<100ms) on very large books by sampling evenly + keeping recent context
  if (sentences.length > 160) {
    const recentCount = 80;
    const olderPool = sentences.slice(0, sentences.length - recentCount);
    const step = Math.max(1, Math.floor(olderPool.length / 80));
    const sampledOlder = olderPool.filter((_, idx) => idx % step === 0).slice(0, 80);
    sentences = [...sampledOlder, ...sentences.slice(-recentCount)];
  }

  const n = sentences.length;
  if (n <= 2) {
    return sentences.join(' ');
  }

  const keywordSets = sentences.map(extractKeywords);
  const weights = Array.from({ length: n }, () => new Float64Array(n));
  const rowSums = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = sentenceSimilarity(keywordSets[i], keywordSets[j]);
      if (sim > 0) {
        weights[i][j] = sim;
        weights[j][i] = sim;
        rowSums[i] += sim;
        rowSums[j] += sim;
      }
    }
  }

  // PageRank iterations
  const damping = 0.85;
  let scores = new Float64Array(n).fill(1 / n);

  for (let iter = 0; iter < 20; iter++) {
    const nextScores = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && rowSums[j] > 0) {
          sum += (weights[j][i] / rowSums[j]) * scores[j];
        }
      }
      // Slight recency boost (up to +15%) so recent plot events stay well represented
      const recencyBoost = 1 + 0.15 * (i / Math.max(1, n - 1));
      nextScores[i] = ((1 - damping) / n + damping * sum) * recencyBoost;
    }
    scores = nextScores;
  }

  // Rank sentences by score, then pick until word budget is reached
  const rankedIndices = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => scores[b] - scores[a]
  );

  const selectedIndices = [];
  let accumulatedWords = 0;
  const maxBudget = Math.round(targetWords * 1.25);

  for (const idx of rankedIndices) {
    const sWords = countWords(sentences[idx]);
    if (selectedIndices.length === 0 || accumulatedWords + sWords <= maxBudget) {
      selectedIndices.push(idx);
      accumulatedWords += sWords;
    }
    if (accumulatedWords >= targetWords) break;
  }

  // Restore original chronological narrative order
  selectedIndices.sort((a, b) => a - b);

  return selectedIndices.map((idx) => sentences[idx]).join(' ');
}
