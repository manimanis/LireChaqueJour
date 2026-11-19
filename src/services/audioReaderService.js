/**
 * Audio Reader Service for Lire chaque jour
 * Continuous Web Speech Synthesis text-to-speech with sentence-by-sentence tracking
 */

export class AudioReader {
  constructor() {
    this.sentences = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.lang = 'fr-FR';
    this.onSentenceChange = null;
    this.onStateChange = null;
    this.onEnd = null;
    this.currentUtterance = null;
  }

  /**
   * Split prose text or paragraphs into sequential sentences for playback
   * @param {string[]} paragraphs
   */
  loadContent(paragraphs, lang = 'fr-FR') {
    this.stop();
    this.lang = lang;
    this.sentences = [];
    this.currentIndex = -1;

    paragraphs.forEach((para, pIdx) => {
      if (!para || typeof para !== 'string') return;
      const cleanPara = para.trim();
      if (!cleanPara) return;

      // Split into sentences using punctuation boundaries
      const rawSentences = cleanPara.match(/[^.!?…\n]+(?:[.!?…]+["»'”\s]*|$)/g) || [cleanPara];
      rawSentences.forEach((s) => {
        const text = s.trim();
        if (text.length >= 2) {
          this.sentences.push({
            pIdx,
            text,
          });
        }
      });
    });

    this.notifyState();
  }

  /**
   * Play from current or given sentence index
   * @param {number} [index]
   */
  play(index = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    if (this.isPaused && index === null) {
      window.speechSynthesis.resume();
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyState();
      return true;
    }

    if (index !== null) {
      this.currentIndex = Math.max(0, Math.min(index, this.sentences.length - 1));
    } else if (this.currentIndex === -1 || this.currentIndex >= this.sentences.length) {
      this.currentIndex = 0;
    }

    this.speakCurrent();
    return true;
  }

  pause() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.isPlaying = false;
    this.isPaused = true;
    this.notifyState();
  }

  resume() {
    if (this.isPaused) {
      this.play();
    }
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = -1;
    this.currentUtterance = null;
    this.notifyState();
    this.notifySentence();
  }

  next() {
    if (this.currentIndex < this.sentences.length - 1) {
      this.currentIndex++;
      this.speakCurrent();
    } else {
      this.stop();
      this.onEnd?.();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.speakCurrent();
    } else {
      this.currentIndex = 0;
      this.speakCurrent();
    }
  }

  setRate(newRate) {
    this.rate = Math.max(0.5, Math.min(newRate, 2.5));
    if (this.isPlaying) {
      // Re-trigger current sentence with updated rate
      this.speakCurrent();
    }
  }

  speakCurrent() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.currentIndex < 0 || this.currentIndex >= this.sentences.length) {
      this.stop();
      this.onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const sentenceObj = this.sentences[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(sentenceObj.text);
    utterance.lang = this.lang;
    utterance.rate = this.rate;

    // Pick best natural French voice if available
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => (v.lang === 'fr-FR' || v.lang.startsWith('fr')) && (v.name.includes('Natural') || v.name.includes('Google') || v.default));
    if (frVoice) {
      utterance.voice = frVoice;
    }

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.next();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        this.isPlaying = false;
        this.notifyState();
      }
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState();
    this.notifySentence();

    window.speechSynthesis.speak(utterance);
  }

  notifyState() {
    this.onStateChange?.({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalSentences: this.sentences.length,
      rate: this.rate,
    });
  }

  notifySentence() {
    this.onSentenceChange?.(
      this.currentIndex >= 0 && this.currentIndex < this.sentences.length
        ? this.sentences[this.currentIndex]
        : null
    );
  }
}

export const globalAudioReader = new AudioReader();
