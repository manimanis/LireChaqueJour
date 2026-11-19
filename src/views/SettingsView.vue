<template>
  <div class="container py-4" style="max-width: 820px">
    <div class="mb-4">
      <h1 class="h3 fw-bold mb-1">Paramètres</h1>
      <p class="text-body-secondary mb-0">
        Personnalisez votre confort de lecture, vos notifications et vos sauvegardes locales
      </p>
    </div>

    <!-- Lecture -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-4">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-book text-primary me-2"></i>Lecture & Affichage
        </h5>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Police</label>
            <select v-model="settingsStore.fontFamily" class="form-select">
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Merriweather">Merriweather</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold">Thème</label>
            <select v-model="settingsStore.theme" class="form-select">
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="auto">Automatique (système)</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold">
              Taille du texte : {{ settingsStore.fontSize }} px
            </label>
            <input
              v-model.number="settingsStore.fontSize"
              type="range"
              min="12"
              max="32"
              step="1"
              class="form-range"
            />
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold">
              Interligne : {{ settingsStore.lineHeight }}
            </label>
            <input
              v-model.number="settingsStore.lineHeight"
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              class="form-range"
            />
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold">Longueur du résumé par défaut</label>
            <select v-model="settingsStore.summaryLength" class="form-select">
              <option value="short">Court (~50 mots)</option>
              <option value="medium">Moyen (~100 mots)</option>
              <option value="long">Long (~200 mots)</option>
            </select>
          </div>
        </div>

        <div class="p-3 rounded border bg-body-tertiary">
          <div class="small text-body-secondary mb-1">Aperçu :</div>
          <p
            class="mb-0"
            :style="{
              fontFamily: `'${settingsStore.fontFamily}', serif`,
              fontSize: `${settingsStore.fontSize}px`,
              lineHeight: settingsStore.lineHeight,
            }"
          >
            Edmond Dantès aperçut les remparts du Château d'If se découper dans la lumière du soir.
          </p>
        </div>
      </div>
    </div>

    <!-- Rythme par défaut -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-4">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-speedometer2 text-primary me-2"></i>Rythme par défaut (nouveaux livres)
        </h5>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Mots par jour (100 – 5000)</label>
            <input
              v-model.number="settingsStore.defaultWordsPerDay"
              type="number"
              min="100"
              max="5000"
              step="25"
              class="form-control"
            />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Tolérance (± mots)</label>
            <input
              v-model.number="settingsStore.defaultTolerance"
              type="number"
              min="0"
              max="100"
              step="5"
              class="form-control"
            />
          </div>
          <div class="col-12">
            <div class="form-check form-switch">
              <input
                id="defaultWeekends"
                v-model="settingsStore.defaultReadWeekends"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="defaultWeekends">
                Lecture le week-end par défaut
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dictionnaire & Définitions -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-book-half text-primary me-2"></i>Dictionnaire & Définition de mots
          </h5>
          <div class="form-check form-switch mb-0">
            <input
              id="dictSwitch"
              v-model="settingsStore.dictionaryEnabled"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label fw-semibold" for="dictSwitch">
              {{ settingsStore.dictionaryEnabled ? 'Activé' : 'Désactivé' }}
            </label>
          </div>
        </div>

        <p class="small text-body-secondary mb-3">
          Obtenez la définition instantanée de tout mot sélectionné au cours de votre lecture grâce à une API de dictionnaire publique.
        </p>

        <div v-if="settingsStore.dictionaryEnabled" class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Fournisseur d'API Dictionnaire</label>
            <select v-model="settingsStore.dictionaryProvider" class="form-select">
              <option
                v-for="prov in DICTIONARY_PROVIDERS"
                :key="prov.id"
                :value="prov.id"
              >
                {{ prov.name }} ({{ prov.language }})
              </option>
            </select>
            <div class="form-text small">
              {{ selectedProviderDescription }}
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label fw-semibold">Mode de déclenchement</label>
            <select v-model="settingsStore.dictionaryAutoOpen" class="form-select">
              <option :value="false">Bouton discret « Définir » sur sélection (Recommandé)</option>
              <option :value="true">Ouverture automatique immédiate</option>
            </select>
            <div class="form-text small">
              Le bouton discret évite les ouvertures intempestives pendant la lecture.
            </div>
          </div>

          <!-- Highlight & Audio Switches -->
          <div class="col-md-6">
            <div class="form-check form-switch mt-2">
              <input
                id="highlightVocabSwitch"
                v-model="settingsStore.highlightVocabularyWords"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label fw-semibold" for="highlightVocabSwitch">
                Surligner les mots du carnet dans la lecture
              </label>
              <div class="form-text small">
                Souligne discrètement les mots déjà consultés pour faciliter leur réactivation mémorielle.
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="form-check form-switch mt-2">
              <input
                id="speechSynthesisSwitch"
                v-model="settingsStore.speechSynthesisEnabled"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label fw-semibold" for="speechSynthesisSwitch">
                Prononciation vocale automatique
              </label>
              <div class="form-text small">
                Utilise la synthèse vocale française du navigateur si aucun fichier audio n'est fourni.
              </div>
            </div>
          </div>

          <!-- URL personnalisée si custom -->
          <div v-if="settingsStore.dictionaryProvider === 'custom'" class="col-12">
            <label class="form-label fw-semibold">Modèle d'URL API personnalisée</label>
            <input
              v-model="settingsStore.dictionaryCustomUrl"
              type="url"
              class="form-control"
              placeholder="https://api.monsite.org/definition/{word}"
            />
            <div class="form-text small">
              Insérez la variable <code>{word}</code> qui sera remplacée par le mot recherché.
            </div>
          </div>

          <!-- Test en direct -->
          <div class="col-12 mt-3">
            <div class="p-3 rounded border bg-body-tertiary">
              <label class="form-label fw-semibold small mb-2">
                <i class="bi bi-play-circle text-primary me-1"></i>Tester l'API sélectionnée
              </label>
              <div class="input-group input-group-sm mb-2" style="max-width: 460px">
                <input
                  v-model="testWord"
                  type="text"
                  class="form-control"
                  placeholder="Ex : livre, aventure, courage..."
                  @keyup.enter="runTestQuery"
                />
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="testLoading || !testWord.trim()"
                  @click="runTestQuery"
                >
                  <span v-if="testLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-search me-1"></i>Tester
                </button>
              </div>

              <div v-if="testResult" class="alert alert-success py-2 px-3 small mb-0">
                <strong>{{ testResult.word }}</strong>
                <span v-if="testResult.pronunciation" class="text-body-secondary ms-2 font-monospace">
                  {{ testResult.pronunciation }}
                </span>
                <span v-if="testResult.entries?.[0]?.partOfSpeech" class="badge text-bg-light border ms-2">
                  {{ testResult.entries[0].partOfSpeech }}
                </span>
                <div class="mt-1 text-break">
                  {{ testResult.entries?.[0]?.definitions?.[0] }}
                </div>
              </div>

              <div v-else-if="testError" class="alert alert-warning py-2 px-3 small mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ testError }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications locales -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body p-4">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-bell text-primary me-2"></i>Notifications locales
        </h5>

        <div class="form-check form-switch mb-3">
          <input
            id="notifSwitch"
            v-model="settingsStore.notificationsEnabled"
            class="form-check-input"
            type="checkbox"
            @change="onToggleNotifications"
          />
          <label class="form-check-label fw-semibold" for="notifSwitch">
            Activer le rappel quotidien (« Votre lecture du jour est disponible. »)
          </label>
        </div>

        <div class="row g-3 align-items-end">
          <div class="col-sm-4">
            <label class="form-label small fw-semibold">Heure de notification</label>
            <input
              v-model="settingsStore.notificationTime"
              type="time"
              class="form-control"
              :disabled="!settingsStore.notificationsEnabled"
            />
          </div>
          <div class="col-sm-8 d-flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              @click="requestPerm"
            >
              Autoriser les notifications ({{ permissionLabel }})
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="testNotification"
            >
              Tester maintenant
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sauvegardes -->
    <div class="card shadow-sm border-0">
      <div class="card-body p-4">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-hdd text-primary me-2"></i>Sauvegardes locales
        </h5>
        <p class="small text-body-secondary mb-3">
          Exportez ou restaurez l'ensemble de votre bibliothèque, progression et statistiques au format JSON, sans connexion Internet.
        </p>

        <div class="d-flex flex-wrap gap-2 mb-3">
          <button type="button" class="btn btn-outline-primary" @click="handleExport">
            <i class="bi bi-download me-2"></i>Exporter une sauvegarde
          </button>

          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="backupInput?.click()"
          >
            <i class="bi bi-upload me-2"></i>Importer une sauvegarde
          </button>
          <input
            ref="backupInput"
            type="file"
            accept=".json,application/json"
            class="d-none"
            @change="handleImport"
          />

          <button
            type="button"
            class="btn btn-outline-warning"
            @click="settingsStore.resetToDefaults()"
          >
            Réinitialiser les préférences
          </button>

          <button
            type="button"
            class="btn btn-outline-danger ms-auto"
            @click="handleClearAll"
          >
            <i class="bi bi-trash me-1"></i>Tout effacer
          </button>
        </div>

        <div v-if="backupMsg" class="alert alert-info py-2 px-3 small mb-0">
          {{ backupMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore.js';
import { useLibraryStore } from '@/stores/libraryStore.js';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showLocalNotification,
} from '@/services/notifications.js';
import {
  DICTIONARY_PROVIDERS,
  fetchWordDefinition,
} from '@/services/dictionaryService.js';

const settingsStore = useSettingsStore();
const libraryStore = useLibraryStore();

const testWord = ref('lecture');
const testLoading = ref(false);
const testResult = ref(null);
const testError = ref(null);

const selectedProviderDescription = computed(() => {
  const prov = DICTIONARY_PROVIDERS.find(p => p.id === settingsStore.dictionaryProvider);
  return prov?.description || '';
});

async function runTestQuery() {
  if (!testWord.value.trim()) return;
  testLoading.value = true;
  testResult.value = null;
  testError.value = null;

  try {
    const res = await fetchWordDefinition(testWord.value, {
      provider: settingsStore.dictionaryProvider,
      customUrl: settingsStore.dictionaryCustomUrl,
    });
    testResult.value = res;
  } catch (err) {
    testError.value = err.message || 'Erreur lors de la recherche.';
  } finally {
    testLoading.value = false;
  }
}

const backupInput = ref(null);
const backupMsg = ref('');
const permissionState = ref(getNotificationPermission());

const permissionLabel = computed(() => {
  if (permissionState.value === 'granted') return 'Autorisé';
  if (permissionState.value === 'denied') return 'Refusé';
  if (permissionState.value === 'unsupported') return 'Non supporté';
  return 'À demander';
});

async function requestPerm() {
  permissionState.value = await requestNotificationPermission();
}

async function onToggleNotifications() {
  if (settingsStore.notificationsEnabled && permissionState.value === 'default') {
    await requestPerm();
  }
}

function testNotification() {
  const ok = showLocalNotification(
    'Lire chaque jour',
    'Votre lecture du jour est disponible.'
  );
  if (!ok) {
    alert("Veuillez d'abord autoriser les notifications dans votre navigateur.");
  }
}

async function handleExport() {
  const json = await libraryStore.exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lire-chaque-jour-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  backupMsg.value = 'Sauvegarde exportée avec succès.';
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    await libraryStore.importBackup(text);
    backupMsg.value = 'Sauvegarde importée avec succès.';
  } catch (err) {
    backupMsg.value = err?.message || "Erreur lors de l'import de la sauvegarde.";
  } finally {
    if (backupInput.value) backupInput.value.value = '';
  }
}

async function handleClearAll() {
  if (confirm('Supprimer tous les livres, progressions et statistiques ? Cette action est irréversible.')) {
    await libraryStore.clearAllData();
    backupMsg.value = 'Toutes les données locales ont été effacées.';
  }
}
</script>
