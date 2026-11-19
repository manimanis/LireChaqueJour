/**
 * Smart text segmentation service for Lire chaque jour.
 * Splits book text into daily segments respecting word, sentence, and paragraph boundaries.
 */

const SENTENCE_END_RE = /[.!?…][»”"')\]\u00BB]*$/;
const ABBREVIATION_RE = /^(?:M|Mr|Mme|Mlle|Dr|Pr|Prof|St|Ste|etc|cf|ex|vol|ch|p|pp|n°)\.$/i;

/**
 * Count words in a string.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Estimate reading time in minutes (default 200 words/min).
 * @param {number} wordCount
 * @param {number} [wpm=200]
 * @returns {number}
 */
export function estimateReadingMinutes(wordCount, wpm = 200) {
  if (!wordCount || wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / wpm));
}

/**
 * Tokenize text into word tokens while preserving paragraph and sentence boundary flags
 * and exact character offsets in the normalized text.
 * @param {string} rawText
 * @returns {{ normalizedText: string, tokens: Array<{ start: number, end: number, isSentenceEnd: boolean, isParagraphEnd: boolean }> }}
 */
function tokenizeText(rawText) {
  const paragraphs = rawText
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const normalizedText = paragraphs.join('\n\n');
  const tokens = [];

  let cursor = 0;
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx];
    const wordRe = /\S+/g;
    let match;
    let lastParaTokenIndex = -1;

    while ((match = wordRe.exec(para)) !== null) {
      const word = match[0];
      const start = cursor + match.index;
      const end = start + word.length;
      const isSentenceEnd =
        SENTENCE_END_RE.test(word) && !ABBREVIATION_RE.test(word);

      tokens.push({
        start,
        end,
        isSentenceEnd,
        isParagraphEnd: false,
      });
      lastParaTokenIndex = tokens.length - 1;
    }

    if (lastParaTokenIndex >= 0) {
      tokens[lastParaTokenIndex].isParagraphEnd = true;
      tokens[lastParaTokenIndex].isSentenceEnd = true;
    }

    cursor += para.length + 2; // +2 for '\n\n'
  }

  return { normalizedText, tokens };
}

/**
 * Find the best cut index within [minIdx, maxIdx] closest to targetIdx.
 * Priority: paragraph end > sentence end > targetIdx (word boundary).
 * @param {Array} tokens
 * @param {number} minIdx
 * @param {number} targetIdx
 * @param {number} maxIdx
 * @returns {number}
 */
function findBestCutIndex(tokens, minIdx, targetIdx, maxIdx) {
  let bestParaIdx = -1;
  let bestParaDist = Infinity;
  let bestSentIdx = -1;
  let bestSentDist = Infinity;

  for (let i = minIdx; i <= maxIdx; i++) {
    const dist = Math.abs(i - targetIdx);
    if (tokens[i].isParagraphEnd && dist < bestParaDist) {
      bestParaDist = dist;
      bestParaIdx = i;
    }
    if (tokens[i].isSentenceEnd && dist < bestSentDist) {
      bestSentDist = dist;
      bestSentIdx = i;
    }
  }

  if (bestParaIdx !== -1) return bestParaIdx;
  if (bestSentIdx !== -1) return bestSentIdx;
  return targetIdx;
}

/**
 * Segment full book text into daily reading segments.
 *
 * @param {string} bookId
 * @param {string} fullText
 * @param {Object} [options]
 * @param {number} [options.wordsPerDay=400]
 * @param {number} [options.tolerance=20]
 * @returns {Array<{ id: string, bookId: string, dayNumber: number, wordCount: number, startPosition: number, endPosition: number, content: string }>}
 */
export function segmentText(bookId, fullText, options = {}) {
  if (!fullText || typeof fullText !== 'string') return [];

  const targetWords = Math.min(5000, Math.max(100, Number(options.wordsPerDay) || 400));
  const tolerance = Math.min(
    Math.floor(targetWords / 2),
    Math.max(0, Number(options.tolerance ?? 20))
  );

  const minWords = Math.max(1, targetWords - tolerance);
  const maxWords = targetWords + tolerance;

  const { normalizedText, tokens } = tokenizeText(fullText);
  const totalWords = tokens.length;
  if (totalWords === 0) return [];

  const segments = [];
  let idx = 0;
  let dayNumber = 1;

  while (idx < totalWords) {
    const remaining = totalWords - idx;
    let cutIdx;

    if (remaining <= maxWords) {
      cutIdx = totalWords - 1;
    } else {
      const minIdx = Math.min(totalWords - 1, idx + minWords - 1);
      const targetIdx = Math.min(totalWords - 1, idx + targetWords - 1);
      const maxIdx = Math.min(totalWords - 1, idx + maxWords - 1);
      cutIdx = findBestCutIndex(tokens, minIdx, targetIdx, maxIdx);
    }

    const content = normalizedText.slice(tokens[idx].start, tokens[cutIdx].end).trim();
    const wordCount = cutIdx - idx + 1;

    segments.push({
      id: `${bookId}_seg_${dayNumber}`,
      bookId,
      dayNumber,
      wordCount,
      startPosition: idx,
      endPosition: cutIdx + 1,
      content,
    });

    idx = cutIdx + 1;
    dayNumber += 1;
  }

  return segments;
}
