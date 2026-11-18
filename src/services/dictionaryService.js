/**
 * Dictionary Service for LireChaqueJour
 * Provides word definitions from public APIs configurable by user
 */

export const DICTIONARY_PROVIDERS = [
  {
    id: 'wiktionary_fr',
    name: 'Wiktionnaire (Français)',
    description: 'Dictionnaire libre et collaboratif en langue française. Définitions complètes, grammaire, prononciation et étymologie.',
    language: 'Français',
    url: 'https://fr.wiktionary.org',
  },
  {
    id: 'wikipedia_fr',
    name: 'Wikipédia (Français)',
    description: 'Encyclopédie libre. Idéal pour les noms propres, concepts historiques, personnages, lieux et culture générale.',
    language: 'Français',
    url: 'https://fr.wikipedia.org',
  },
  {
    id: 'dictionary_api_en',
    name: 'Free Dictionary API (Anglais)',
    description: 'Dictionnaire anglophone complet avec prononciation phonétique, lecteur audio et exemples.',
    language: 'Anglais',
    url: 'https://dictionaryapi.dev',
  },
  {
    id: 'wiktionary_en',
    name: 'Wiktionary International (Multilingue / EN)',
    description: 'API officielle Wikimedia Wiktionary en anglais, documentant les termes de toutes langues.',
    language: 'Multilingue',
    url: 'https://en.wiktionary.org',
  },
  {
    id: 'custom',
    name: 'API personnalisée',
    description: 'URL personnalisée utilisant {word} comme variable (ex: https://mon-api.org/definition/{word}).',
    language: 'Personnalisé',
    url: '',
  },
];

// In-memory cache to avoid duplicate network queries
const definitionCache = new Map();

/**
 * Clean and isolate a word from punctuation, quotes, brackets, and French elisions
 * @param {string} raw
 * @returns {string}
 */
export function cleanSelectedWord(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let str = raw.trim();

  // Strip enclosing quotes, dashes, brackets, and punctuation
  str = str.replace(/^[«»"“‘'(\[{–—\s]+|[»«"”'’)}\].,;:!?–—\s]+$/g, '').trim();

  // Strip French elision prefixes (e.g. l'aventure -> aventure, d'or -> or, qu'il -> il)
  const elisionMatch = str.match(/^(?:[ldjcstnmLDJCSTNM]['’]|qu['’]|QU['’])(.+)$/);
  if (elisionMatch && elisionMatch[1].length >= 2) {
    str = elisionMatch[1];
  }

  // Strip trailing punctuation again if leftover
  str = str.replace(/[»«"”'’)}\].,;:!?–—\s]+$/g, '').trim();

  return str;
}

/**
 * Detect if a definition text is a cross-reference to another word (lemma, base verb, etc.)
 * e.g. "Féminin singulier de débordant." -> "débordant"
 * e.g. "Pluriel de livre." -> "livre"
 * e.g. "Deuxième personne... du verbe livrer." -> "livrer"
 * @param {string} text
 * @returns {string|null}
 */
export function detectReferenceWord(text) {
  if (!text || typeof text !== 'string') return null;

  // Remove parenthesized content like (ouvrage qu'on lit) or (Grammaire)
  const clean = text.replace(/\s*\([^)]*\)/g, '').trim().replace(/[.,;!?]+$/, '');

  // Pattern 1: ... du verbe / au verbe <mot>
  let m = clean.match(/(?:du verbe|au verbe|de l[’']infinitif|à l[’']infinitif)\s+([a-zA-ZÀ-ÿœæÇç-]+)/i);
  if (m) return m[1];

  // Pattern 2: (Féminin|Masculin|Pluriel|Singulier...) [singulier|pluriel] de <mot>
  m = clean.match(/^(?:féminin|masculin|pluriel|singulier|forme|comparatif|superlatif)(?:\s+(?:singulier|pluriel|identique|invariable))?\s+de\s+([a-zA-ZÀ-ÿœæÇç-]+)/i);
  if (m) return m[1];

  // Pattern 3: Participe (passé|présent) ... de <mot>
  m = clean.match(/^participe\s+(?:passé|présent)(?:\s+[a-zA-ZÀ-ÿœæÇç-]+){0,4}\s+de\s+([a-zA-ZÀ-ÿœæÇç-]+)/i);
  if (m) return m[1];

  // Pattern 4: (Première|Deuxième|Troisième|1re|2e|3e) personne ... de <mot> (e.g. de manger)
  m = clean.match(/personne\s+du\s+(?:singulier|pluriel)[\s\S]+?\s+de\s+([a-zA-ZÀ-ÿœæÇç-]+)$/i);
  if (m) return m[1];

  // Pattern 5: Variante/Synonyme/Antonyme de <mot>
  m = clean.match(/^(?:variante|synonyme|antonyme|diminutif|forme collatérale|équivalent)(?:\s+[a-zA-ZÀ-ÿœæÇç-]+)?\s+de\s+([a-zA-ZÀ-ÿœæÇç-]+)/i);
  if (m) return m[1];

  // Pattern 6: Voir (aussi)? <mot>
  m = clean.match(/^(?:voir(?:\s+aussi)?|consulter|renvoie? à|→\s*voir)\s+([a-zA-ZÀ-ÿœæÇç-]+)/i);
  if (m) return m[1];

  // Pattern 7: Generic fallback for grammatical definitions ending with ' de <mot>'
  m = clean.match(/^(?:féminin|masculin|pluriel|singulier|troisième|deuxième|première|participe)[\s\S]+?\s+de\s+([a-zA-ZÀ-ÿœæÇç-]+)$/i);
  if (m) return m[1];

  return null;
}

/**
 * Parse MediaWiki extracts plain text into structured dictionary entries
 * @param {string} title
 * @param {string} text
 * @returns {object|null}
 */
export function parseWiktionaryExtract(title, text) {
  if (!text) return null;

  // Isolate French section if multiple languages are present
  let frText = text;
  const frSectionMatch = text.match(/==\s*Français\s*==([\s\S]*?)(?=\n==\s*[^=]+?\s*==|$)/i);
  if (frSectionMatch) {
    frText = frSectionMatch[1];
  }

  // Split into sections by === Section Name ===
  const rawSections = frText.split(/(?=\n===\s*[^=]+?\s*===)/);
  const entries = [];
  let etymology = '';
  let pronunciation = '';
  const globalRefWords = new Set();

  for (const sec of rawSections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^===\s*([^=]+?)\s*===/);
    if (!headerMatch) continue;

    const header = headerMatch[1].trim();
    const body = trimmed.slice(headerMatch[0].length).trim();

    if (/étymologie/i.test(header)) {
      if (!etymology) {
        const firstLine = body.split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
        etymology = firstLine;
      }
      continue;
    }

    if (/prononciation/i.test(header)) {
      const pronMatch = body.match(/\\([^\\]+)\\/);
      if (pronMatch && !pronunciation) {
        pronunciation = `\\${pronMatch[1]}\\`;
      }
      continue;
    }

    // Skip non-definition sections
    if (/synonymes|antonymes|traductions|dérivés|apparentés|vocabulaire|proverbes|anagrammes|voir aussi|références|paronymes/i.test(header)) {
      continue;
    }

    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    const defs = [];
    const defItems = [];
    const examples = [];
    let posDetails = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('====') || line.startsWith('===') || line.startsWith('==')) break;

      const linePronMatch = line.match(/\\([^\\]+)\\/);
      if (linePronMatch && !pronunciation) {
        pronunciation = `\\${linePronMatch[1]}\\`;
      }

      if (i === 0 && (linePronMatch || /masculin|féminin|invariable|intransitif|transitif/i.test(line))) {
        posDetails = line;
        continue;
      }

      // Check if line is a quotation or example
      if (line.includes(' — (') || line.startsWith('—') || line.startsWith('Exemple :')) {
        if (examples.length < 3) {
          examples.push(line.replace(/^[—\s]+/, ''));
        }
        continue;
      }

      // Standalone definition line
      const cleanLine = line.replace(/^[#*0-9.]+\s*/, '').trim();
      if (cleanLine.length > 3 && !cleanLine.startsWith('—') && !cleanLine.startsWith('Note :')) {
        const refWord = detectReferenceWord(cleanLine);
        if (refWord && refWord.toLowerCase() !== title.toLowerCase()) {
          globalRefWords.add(refWord);
        }
        defs.push(cleanLine);
        defItems.push({
          text: cleanLine,
          referenceWord: refWord,
        });
      }
    }

    if (defs.length > 0) {
      entries.push({
        partOfSpeech: header,
        details: posDetails,
        definitions: defs.slice(0, 5),
        definitionItems: defItems.slice(0, 5),
        examples: examples.slice(0, 2),
      });
    }
  }

  // Also check if etymology refers to a word like "→ voir déborder"
  if (etymology) {
    const etymRef = detectReferenceWord(etymology);
    if (etymRef && etymRef.toLowerCase() !== title.toLowerCase()) {
      globalRefWords.add(etymRef);
    }
  }

  return {
    word: title,
    pronunciation,
    etymology,
    entries: entries.slice(0, 6),
    referenceWords: Array.from(globalRefWords),
  };
}

/**
 * Fetch definition from French Wiktionary (MediaWiki API)
 */
async function fetchFromWiktionaryFr(word) {
  const tryQuery = async (term) => {
    const url = `https://fr.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(term)}&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur réseau Wiktionnaire (${res.status})`);
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined || !page.extract) {
      return null;
    }
    return page;
  };

  // Try exact term, then lowercase as fallback (Wiktionary is case sensitive for nouns)
  let page = await tryQuery(word);
  if (!page && word.toLowerCase() !== word) {
    page = await tryQuery(word.toLowerCase());
  }

  if (!page) {
    throw new Error(`Aucune définition trouvée pour « ${word} » sur le Wiktionnaire.`);
  }

  const parsed = parseWiktionaryExtract(page.title, page.extract);
  if (!parsed || parsed.entries.length === 0) {
    throw new Error(`Définition introuvable ou non analysable pour « ${word} ».`);
  }

  return {
    word: parsed.word,
    query: word,
    provider: 'wiktionary_fr',
    providerName: 'Wiktionnaire (Français)',
    pronunciation: parsed.pronunciation,
    audioUrl: null,
    etymology: parsed.etymology,
    sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(parsed.word)}`,
    entries: parsed.entries,
    referenceWords: parsed.referenceWords || [],
  };
}

/**
 * Fetch definition from French Wikipedia (REST API)
 */
async function fetchFromWikipediaFr(word) {
  const trySummary = async (term) => {
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Erreur réseau Wikipédia (${res.status})`);
    return await res.json();
  };

  let data = await trySummary(word);
  // Try capitalized first letter if lowercase didn't find anything
  if (!data && word.length > 1) {
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
    data = await trySummary(capitalized);
  }

  if (!data || !data.extract) {
    throw new Error(`Aucun article Wikipédia trouvé pour « ${word} ».`);
  }

  return {
    word: data.title,
    query: word,
    provider: 'wikipedia_fr',
    providerName: 'Wikipédia (Français)',
    pronunciation: '',
    thumbnail: data.thumbnail?.source || null,
    audioUrl: null,
    etymology: '',
    sourceUrl: data.content_urls?.desktop?.page || `https://fr.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
    entries: [
      {
        partOfSpeech: data.description || 'Notice encyclopédique',
        details: '',
        definitions: [data.extract],
        examples: [],
      },
    ],
  };
}

/**
 * Fetch definition from Free Dictionary API (English)
 */
async function fetchFromDictionaryApiEn(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
  const res = await fetch(url);
  if (res.status === 404) {
    throw new Error(`No definition found for "${word}" on Free Dictionary API.`);
  }
  if (!res.ok) throw new Error(`Dictionary API error (${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Invalid response for "${word}".`);
  }

  const first = data[0];
  let audioUrl = null;
  let phoneticText = first.phonetic || '';

  if (Array.isArray(first.phonetics)) {
    for (const p of first.phonetics) {
      if (p.text && !phoneticText) phoneticText = p.text;
      if (p.audio && !audioUrl) audioUrl = p.audio;
    }
  }

  const entries = [];
  if (Array.isArray(first.meanings)) {
    for (const m of first.meanings) {
      const defs = (m.definitions || []).map(d => d.definition).filter(Boolean).slice(0, 4);
      const examples = (m.definitions || []).map(d => d.example).filter(Boolean).slice(0, 2);
      if (defs.length > 0) {
        entries.push({
          partOfSpeech: m.partOfSpeech || 'General',
          details: '',
          definitions: defs,
          examples,
        });
      }
    }
  }

  return {
    word: first.word,
    query: word,
    provider: 'dictionary_api_en',
    providerName: 'Free Dictionary API (Anglais)',
    pronunciation: phoneticText,
    audioUrl,
    etymology: '',
    sourceUrl: first.sourceUrls?.[0] || `https://en.wiktionary.org/wiki/${encodeURIComponent(first.word)}`,
    entries,
  };
}

/**
 * Fetch definition from English Wiktionary (REST API definition endpoint)
 */
async function fetchFromWiktionaryEn(word) {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LireChaqueJour/1.0' },
  });
  if (res.status === 404) {
    throw new Error(`Aucune définition trouvée pour « ${word} » sur Wiktionary.`);
  }
  if (!res.ok) throw new Error(`Erreur Wiktionary (${res.status})`);

  const data = await res.json();
  // Check available languages (prefer fr, en, or first available)
  const langKey = data.fr ? 'fr' : data.en ? 'en' : Object.keys(data)[0];
  const items = data[langKey];

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error(`Définition non disponible pour « ${word} ».`);
  }

  const stripHtml = (html) => html.replace(/<[^>]+>/g, '').trim();

  const entries = items.map((item) => ({
    partOfSpeech: `${item.partOfSpeech} (${item.language || langKey})`,
    details: '',
    definitions: (item.definitions || []).map(d => stripHtml(d.definition)).filter(Boolean).slice(0, 4),
    examples: [],
  })).filter(e => e.definitions.length > 0);

  return {
    word,
    query: word,
    provider: 'wiktionary_en',
    providerName: 'Wiktionary International',
    pronunciation: '',
    audioUrl: null,
    etymology: '',
    sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    entries: entries.slice(0, 5),
  };
}

/**
 * Fetch definition from a custom user-configured API URL
 */
async function fetchFromCustomApi(word, customUrl) {
  if (!customUrl || !customUrl.includes('{word}')) {
    throw new Error('L\'URL d\'API personnalisée doit contenir le paramètre {word} (ex: https://api.mon-site.com/def/{word})');
  }

  const endpoint = customUrl.replace('{word}', encodeURIComponent(word));
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`L'API personnalisée a retourné une erreur (${res.status})`);

  const data = await res.json();

  // Try to intelligently interpret response structure
  let defs = [];
  if (typeof data === 'string') {
    defs = [data];
  } else if (Array.isArray(data)) {
    defs = data.map(item => (typeof item === 'string' ? item : item.definition || item.text || JSON.stringify(item)));
  } else if (typeof data === 'object' && data !== null) {
    if (data.definition) defs = Array.isArray(data.definition) ? data.definition : [data.definition];
    else if (data.definitions) defs = data.definitions.map(d => (typeof d === 'string' ? d : d.definition || JSON.stringify(d)));
    else if (data.extract) defs = [data.extract];
    else defs = [JSON.stringify(data, null, 2)];
  }

  return {
    word,
    query: word,
    provider: 'custom',
    providerName: 'API personnalisée',
    pronunciation: '',
    audioUrl: null,
    etymology: '',
    sourceUrl: endpoint,
    entries: [
      {
        partOfSpeech: 'Définition',
        details: '',
        definitions: defs.slice(0, 5),
        examples: [],
      },
    ],
  };
}

/**
 * Main function to fetch definition for a word using chosen provider
 * @param {string} rawWord
 * @param {object} options
 * @param {string} [options.provider='wiktionary_fr']
 * @param {string} [options.customUrl='']
 * @returns {Promise<object>}
 */
export async function fetchWordDefinition(rawWord, options = {}) {
  const word = cleanSelectedWord(rawWord);
  if (!word) {
    throw new Error('Aucun mot valide sélectionné.');
  }

  const provider = options.provider || 'wiktionary_fr';
  const customUrl = options.customUrl || '';
  const cacheKey = `${provider}:${customUrl}:${word.toLowerCase()}`;

  if (definitionCache.has(cacheKey)) {
    return definitionCache.get(cacheKey);
  }

  let result;
  switch (provider) {
    case 'wiktionary_fr':
      result = await fetchFromWiktionaryFr(word);
      break;
    case 'wikipedia_fr':
      result = await fetchFromWikipediaFr(word);
      break;
    case 'dictionary_api_en':
      result = await fetchFromDictionaryApiEn(word);
      break;
    case 'wiktionary_en':
      result = await fetchFromWiktionaryEn(word);
      break;
    case 'custom':
      result = await fetchFromCustomApi(word, customUrl);
      break;
    default:
      result = await fetchFromWiktionaryFr(word);
      break;
  }

  // Cache successful result
  definitionCache.set(cacheKey, result);
  return result;
}
