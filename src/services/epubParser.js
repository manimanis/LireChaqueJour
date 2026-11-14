import ePub from 'epubjs';
import { countWords } from './segmenter.js';

/**
 * Convert a Blob to a Base64 Data URL for offline IndexedDB persistence.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract clean paragraph-separated text from a DOM Document or Element.
 * @param {Document|Element|string} doc
 * @returns {string}
 */
function extractTextFromSection(doc) {
  if (!doc) return '';

  let root = doc;
  if (typeof doc === 'string') {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(doc, 'text/html');
    root = parsed.body || parsed.documentElement;
  } else if (doc.body) {
    root = doc.body;
  } else if (doc.documentElement) {
    root = doc.documentElement;
  }

  if (!root) return '';

  // Remove script/style/nav noise if present
  const clone = root.cloneNode(true);
  clone.querySelectorAll?.('script, style, noscript, svg').forEach((el) => el.remove());

  const blocks = clone.querySelectorAll?.('p, h1, h2, h3, h4, h5, h6, li, blockquote');
  if (blocks && blocks.length > 0) {
    const paragraphs = [];
    blocks.forEach((el) => {
      // Skip container blocks that wrap other selected blocks to avoid duplication
      if (el.querySelector('p, h1, h2, h3, h4, h5, h6, blockquote')) return;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) paragraphs.push(text);
    });
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
  }

  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a local EPUB File completely offline using epub.js.
 * Extracts title, author, base64 cover, chapters, full text, and word count.
 *
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<{
 *   title: string,
 *   author: string,
 *   cover: string|undefined,
 *   chapters: Array<{ title: string, wordCount: number }>,
 *   fullText: string,
 *   totalWords: number
 * }>}
 */
export async function parseEpubFile(file, onProgress) {
  if (!file) {
    throw new Error('Aucun fichier EPUB sélectionné.');
  }

  onProgress?.(5, 'Lecture du fichier local…');
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(15, 'Analyse de la structure EPUB…');
  const book = ePub(arrayBuffer);

  try {
    await book.ready;
    const metadata = await book.loaded.metadata;
    const navigation = await book.loaded.navigation;

    const title =
      (metadata?.title || '').trim() ||
      file.name.replace(/\.epub$/i, '');
    const author = (metadata?.creator || '').trim() || 'Auteur inconnu';

    // Extract cover as offline Data URL
    let cover;
    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const res = await fetch(coverUrl);
        const blob = await res.blob();
        cover = await blobToDataUrl(blob);
      }
    } catch {
      cover = undefined;
    }

    // Map TOC labels by href for chapter titles
    const tocMap = new Map();
    const flattenToc = (items = []) => {
      for (const item of items) {
        if (item.href && item.label) {
          const cleanHref = item.href.split('#')[0];
          tocMap.set(cleanHref, item.label.trim());
        }
        if (item.subitems?.length) flattenToc(item.subitems);
      }
    };
    flattenToc(navigation?.toc);

    const spineItems = book.spine?.spineItems || [];
    const totalSections = spineItems.length;
    const textParts = [];
    const chapters = [];

    for (let i = 0; i < totalSections; i++) {
      const item = spineItems[i];
      try {
        const loaded = await item.load(book.load.bind(book));
        const sectionText = extractTextFromSection(loaded);
        if (sectionText) {
          textParts.push(sectionText);
          const cleanHref = (item.href || '').split('#')[0];
          const chapterTitle =
            tocMap.get(cleanHref) || `Section ${chapters.length + 1}`;
          chapters.push({
            title: chapterTitle,
            wordCount: countWords(sectionText),
          });
        }
      } catch {
        // Skip unreadable/non-text spine items (e.g., cover image wrappers)
      } finally {
        try {
          item.unload();
        } catch {
          // ignore
        }
      }

      if (totalSections > 0) {
        const pct = 20 + Math.round(((i + 1) / totalSections) * 70);
        onProgress?.(pct, `Extraction du texte (${i + 1}/${totalSections})…`);
      }
    }

    const fullText = textParts.join('\n\n').trim();
    const totalWords = countWords(fullText);

    if (totalWords === 0) {
      throw new Error("Aucun texte exploitable n'a pu être extrait de cet EPUB.");
    }

    onProgress?.(95, 'Finalisation…');
    return {
      title,
      author,
      cover,
      chapters,
      fullText,
      totalWords,
    };
  } finally {
    try {
      book.destroy();
    } catch {
      // ignore
    }
  }
}
