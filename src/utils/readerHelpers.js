import { cleanSelectedWord } from '@/services/dictionaryService.js';

/**
 * Escape HTML special characters before injecting markup.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replace a plain escaped substring only inside text nodes (never inside HTML tags/attributes).
 * @param {string} html
 * @param {string} targetEscaped
 * @param {(match: string) => string} replacer
 * @param {boolean} [firstOnly=false]
 * @returns {string}
 */
function replaceInTextNodes(html, targetEscaped, replacer, firstOnly = false) {
  if (!targetEscaped) return html;
  const parts = html.split(/(<[^>]+>)/);
  let replaced = false;

  return parts
    .map((part) => {
      if (part.startsWith('<')) return part;
      if (firstOnly && replaced) return part;
      if (!part.includes(targetEscaped)) return part;

      if (firstOnly) {
        replaced = true;
        return part.replace(targetEscaped, replacer(targetEscaped));
      }
      return part.split(targetEscaped).join(replacer(targetEscaped));
    })
    .join('');
}

/**
 * Render a paragraph with user highlights, active TTS sentence highlight, and vocabulary highlights.
 * @param {string} para
 * @param {number} pIdx
 * @param {Object} options
 * @param {{ pIdx: number, text: string }|null} [options.activeAudioSentence]
 * @param {Array<{ id?: number|string, dayNumber: number, text: string, color?: string }>} [options.highlights]
 * @param {number} [options.displayedDay]
 * @param {Set<string>} [options.knownWords]
 * @param {boolean} [options.highlightVocabularyWords]
 * @returns {string}
 */
export function renderHighlightedParagraph(para, pIdx, options = {}) {
  const {
    activeAudioSentence = null,
    highlights = [],
    displayedDay = 1,
    knownWords = new Set(),
    highlightVocabularyWords = false,
  } = options;

  let content = escapeHtml(para);

  // 1. User highlights for the currently displayed day
  const dayHighlights = highlights.filter(
    (h) => Number(h.dayNumber) === Number(displayedDay) && h.text
  );
  for (const h of dayHighlights) {
    const escapedTarget = escapeHtml(h.text.trim());
    if (!escapedTarget) continue;
    const safeColor = ['yellow', 'green', 'pink', 'blue'].includes(h.color)
      ? h.color
      : 'yellow';
    const idAttr = h.id !== undefined ? ` data-highlight-id="${escapeHtml(String(h.id))}"` : '';
    content = replaceInTextNodes(
      content,
      escapedTarget,
      (m) =>
        `<mark class="user-highlight user-highlight-${safeColor}"${idAttr} title="Passage surligné (cliquer pour supprimer)">${m}</mark>`,
      true
    );
  }

  // 2. Active TTS sentence highlight
  if (
    activeAudioSentence &&
    activeAudioSentence.pIdx === pIdx &&
    activeAudioSentence.text
  ) {
    const cleanS = escapeHtml(activeAudioSentence.text);
    content = replaceInTextNodes(
      content,
      cleanS,
      (m) => `<span class="tts-active-sentence">${m}</span>`,
      true
    );
  }

  // 3. Vocabulary highlights (only inside text nodes)
  if (highlightVocabularyWords && knownWords.size > 0) {
    const htmlParts = content.split(/(<[^>]+>)/);
    content = htmlParts
      .map((part) => {
        if (part.startsWith('<')) return part;
        const tokens = part.split(/(\b[a-zA-ZÀ-ÿœæÇç-]+\b)/);
        return tokens
          .map((token) => {
            const cleaned = cleanSelectedWord(token).toLowerCase();
            if (cleaned && knownWords.has(cleaned)) {
              return `<mark class="vocab-highlight" data-word="${token}" title="Mot déjà consulté : cliquer pour revoir sa définition">${token}</mark>`;
            }
            return token;
          })
          .join('');
      })
      .join('');
  }

  return content;
}

/**
 * Filter book segments for search, strictly restricting to already-unlocked segments (anti-spoiler).
 * @param {Array<{ dayNumber: number, content: string }>} segments
 * @param {string} query
 * @param {number} maxAllowedDay
 * @param {number} [limit=15]
 * @returns {Array<{ dayNumber: number, snippet: string }>}
 */
export function filterSearchSegments(segments, query, maxAllowedDay, limit = 15) {
  const q = (query || '').trim().toLowerCase();
  if (!q || !Array.isArray(segments)) return [];

  const maxDay = Math.max(1, Number(maxAllowedDay) || 1);
  const hits = [];

  for (const seg of segments) {
    if (seg.dayNumber > maxDay) continue;
    const text = seg.content || '';
    const idx = text.toLowerCase().indexOf(q);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + q.length + 40);
      hits.push({
        dayNumber: seg.dayNumber,
        snippet: text.slice(start, end).replace(/\s+/g, ' ').trim(),
      });
      if (hits.length >= limit) break;
    }
  }

  return hits;
}
