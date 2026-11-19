<template>
  <div v-if="show">
    <!-- Backdrop -->
    <div class="modal-backdrop fade show" style="z-index: 1090" @click="closeModal"></div>

    <!-- Modal Dialog -->
    <div
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="z-index: 1095"
      @keydown.esc="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered" style="max-width: 520px">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <!-- Header -->
          <div class="modal-header border-0 pb-1 pt-3 px-4">
            <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
              <i class="bi bi-card-image text-primary"></i>
              <span>Générateur de Citation</span>
            </h5>
            <button type="button" class="btn-close" aria-label="Fermer" @click="closeModal"></button>
          </div>

          <!-- Body -->
          <div class="modal-body px-4 py-3">
            <!-- Theme picker -->
            <div class="d-flex align-items-center justify-content-between mb-3">
              <span class="small fw-semibold text-body-secondary">Style visuel :</span>
              <div class="btn-group btn-group-sm">
                <button
                  v-for="th in themes"
                  :key="th.id"
                  type="button"
                  class="btn"
                  :class="activeTheme.id === th.id ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="activeTheme = th"
                >
                  {{ th.name }}
                </button>
              </div>
            </div>

            <!-- Visual Preview Card -->
            <div
              ref="cardPreviewRef"
              class="quote-card-preview p-4 rounded-4 shadow-sm text-center d-flex flex-column justify-content-between position-relative overflow-hidden"
              :style="{
                background: activeTheme.gradient,
                color: activeTheme.textColor,
                minHeight: '260px',
              }"
            >
              <!-- Decorative quote icon -->
              <div class="quote-deco-mark opacity-25 mb-1" :style="{ color: activeTheme.accentColor }">
                <i class="bi bi-quote fs-1"></i>
              </div>

              <!-- Quote text -->
              <p
                class="fst-italic fw-medium px-2 mb-3 lh-base"
                style="font-family: 'Merriweather', Georgia, serif; font-size: 1.05rem;"
              >
                « {{ quoteText }} »
              </p>

              <!-- Book details & branding footer -->
              <div class="mt-auto pt-2 border-top border-white border-opacity-10">
                <div class="fw-bold small text-truncate" :style="{ color: activeTheme.accentColor }">
                  {{ bookTitle || 'Livre' }}
                </div>
                <div class="small opacity-75 text-truncate" style="font-size: 0.8rem">
                  {{ author || 'Auteur inconnu' }}
                </div>
                <div class="d-flex align-items-center justify-content-center gap-1 mt-2 opacity-50" style="font-size: 0.7rem">
                  <i class="bi bi-book-half"></i>
                  <span>Lire chaque jour</span>
                </div>
              </div>
            </div>

            <!-- Hidden Canvas for export -->
            <canvas ref="exportCanvasRef" width="1080" height="1080" style="display: none;"></canvas>
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer border-0 pt-0 px-4 pb-3 d-flex justify-content-between">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="copyText">
              <i class="bi" :class="copied ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
              <span class="ms-1">{{ copied ? 'Copié !' : 'Copier texte' }}</span>
            </button>

            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeModal">
                Annuler
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 shadow-sm"
                :disabled="exporting"
                @click="downloadImage"
              >
                <i class="bi bi-download"></i>
                <span>{{ exporting ? 'Génération…' : 'Télécharger l\'image' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  quoteText: { type: String, default: '' },
  bookTitle: { type: String, default: '' },
  author: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const exportCanvasRef = ref(null);
const copied = ref(false);
const exporting = ref(false);

const themes = [
  {
    id: 'indigo',
    name: 'Aurore',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
    bgStart: '#1e1b4b',
    bgEnd: '#4338ca',
    textColor: '#ffffff',
    accentColor: '#fde047',
  },
  {
    id: 'sepia',
    name: 'Sépia',
    gradient: 'linear-gradient(135deg, #fcf6e8 0%, #faedd3 60%, #eeddbb 100%)',
    bgStart: '#fcf6e8',
    bgEnd: '#eeddbb',
    textColor: '#382b1c',
    accentColor: '#b45309',
  },
  {
    id: 'night',
    name: 'Nuit',
    gradient: 'linear-gradient(135deg, #090d16 0%, #0f172a 60%, #1e293b 100%)',
    bgStart: '#090d16',
    bgEnd: '#1e293b',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
  },
  {
    id: 'emerald',
    name: 'Émeraude',
    gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)',
    bgStart: '#022c22',
    bgEnd: '#047857',
    textColor: '#ffffff',
    accentColor: '#a7f3d0',
  },
];

const activeTheme = ref(themes[0]);

function closeModal() {
  emit('close');
}

async function copyText() {
  const full = `« ${props.quoteText} »\n— ${props.author || ''}, ${props.bookTitle || ''}`;
  try {
    await navigator.clipboard.writeText(full);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // fallback
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  lines.forEach((l, i) => {
    ctx.fillText(l.trim(), x, y + (i * lineHeight));
  });

  return lines.length * lineHeight;
}

function downloadImage() {
  exporting.value = true;
  try {
    const canvas = exportCanvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;

    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, activeTheme.value.bgStart);
    grad.addColorStop(1, activeTheme.value.bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative border
    ctx.strokeStyle = activeTheme.value.accentColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, width - 120, height - 120);
    ctx.globalAlpha = 1.0;

    // Draw giant decorative quotation mark
    ctx.fillStyle = activeTheme.value.accentColor;
    ctx.globalAlpha = 0.2;
    ctx.font = 'bold 220px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('“', width / 2, 280);
    ctx.globalAlpha = 1.0;

    // Draw quote text
    ctx.fillStyle = activeTheme.value.textColor;
    ctx.font = 'italic 42px "Merriweather", Georgia, serif';
    ctx.textAlign = 'center';
    wrapText(ctx, `« ${props.quoteText} »`, width / 2, 420, 840, 68);

    // Book Title & Author
    ctx.fillStyle = activeTheme.value.accentColor;
    ctx.font = 'bold 36px "Open Sans", sans-serif';
    ctx.fillText(props.bookTitle || 'Livre', width / 2, 860);

    ctx.fillStyle = activeTheme.value.textColor;
    ctx.globalAlpha = 0.75;
    ctx.font = '30px "Open Sans", sans-serif';
    ctx.fillText(props.author || 'Auteur inconnu', width / 2, 915);

    // App Branding Footer
    ctx.globalAlpha = 0.5;
    ctx.font = '22px "Open Sans", sans-serif';
    ctx.fillText('Lire chaque jour • Lecture quotidienne d\'EPUB', width / 2, 980);
    ctx.globalAlpha = 1.0;

    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `citation-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.quote-card-preview {
  transition: all 0.25s ease-in-out;
}
</style>
