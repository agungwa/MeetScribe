// MeetScribe Popup Script with Multi-Speaker Support
// ====================================================

// Default prompts
const DEFAULT_PROMPTS = {
  answer: `You are a helpful meeting assistant. Based on the following meeting transcription, provide a concise and relevant answer suggestion to the most recent question or discussion point. Keep your response professional and actionable.

Meeting Transcription:
{transcription}

Answer Recommendation:`,

  autoAi: `You are a helpful meeting assistant. Based on the following meeting transcription, provide a brief summary and suggest any action items or follow-ups.

Meeting Transcription:
{transcription}

Summary and Action Items:`,

  summary: `You are a helpful meeting assistant. Based on the following meeting transcription, provide a concise summary of the key points discussed.

Meeting Transcription:
{transcription}

Summary:`,

  followup: `You are a helpful meeting assistant. Based on the following meeting transcription, suggest 3-5 relevant follow-up questions that would help clarify or advance the discussion.

Meeting Transcription:
{transcription}

Follow-up Questions:`,

  analysis: `You are a helpful meeting assistant. Based on the following meeting transcription, provide an analysis of the discussion, including key topics, decisions made, and any areas that need further discussion.

Meeting Transcription:
{transcription}

Analysis:`
};

// Default settings
const DEFAULT_SETTINGS = {
  // Existing
  apiKey: '',
  customPrompt: '',
  model: 'gemini-2.0-flash',
  displayMode: 'sidepanel',

  // NEW: Transcription
  transcriptionMode: 'web-speech',
  deepgramApiKey: '',
  maxSpeakers: 10,
  speakerConfidence: 0.5,

  // NEW: AI
  aiMode: 'manual',
  autoAiTrigger: 'interval',
  autoAiInterval: 60000, // 60 seconds in ms
  autoAiPrompt: '',
  summaryPrompt: '',
  followUpPrompt: '',

  // Multi-speaker
  speakers: [],
  currentSpeakerId: null,
  viewMode: 'turn-by-turn',
  recommendationType: 'answer'
};

// Current state
let currentTranscription = []; // Array of ConversationTurn
let currentSpeakers = new Map(); // speakerId -> Speaker
let currentSpeakerId = null;
let interimTranscript = '';
let isRecording = false;
let currentSettings = { ...DEFAULT_SETTINGS };
let autoAiTimer = null;
let lastTranscriptionTime = 0;
let turnCount = 0;

// DOM Elements
const elements = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-button'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Status
  statusIndicator: document.getElementById('statusIndicator'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.getElementById('statusText'),

  // Controls
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportBtn: document.getElementById('exportBtn'),
  generateAnswerBtn: document.getElementById('generateAnswer'),

  // Speaker toolbar
  speakerToolbar: document.getElementById('speakerToolbar'),
  currentSpeakerSelect: document.getElementById('currentSpeaker'),
  addSpeakerBtn: document.getElementById('addSpeakerBtn'),
  manageSpeakersBtn: document.getElementById('manageSpeakersBtn'),

  // View mode
  viewModeBtns: document.querySelectorAll('.view-mode-btn'),

  // Transcription
  transcriptionBox: document.getElementById('transcriptionBox'),
  transcriptionPlaceholder: document.getElementById('transcriptionPlaceholder'),
  transcriptionText: document.getElementById('transcriptionText'),
  copyTranscriptionBtn: document.getElementById('copyTranscription'),
  charCounter: document.getElementById('charCounter'),

  // Recommendations
  recommendationBox: document.getElementById('recommendationBox'),
  recommendationPlaceholder: document.getElementById('recommendationPlaceholder'),
  recommendationText: document.getElementById('recommendationText'),
  copyRecommendationBtn: document.getElementById('copyRecommendation'),
  aiModeBadge: document.getElementById('aiModeBadge'),
  autoAiStatus: document.getElementById('autoAiStatus'),
  autoAiStatusText: document.getElementById('autoAiStatusText'),
  recommendationTabs: document.getElementById('recommendationTabs'),

  // Settings - Transcription
  transcriptionModeSelect: document.getElementById('transcriptionMode'),
  deepgramApiKeyGroup: document.getElementById('deepgramApiKeyGroup'),
  deepgramApiKeyInput: document.getElementById('deepgramApiKey'),
  maxSpeakersInput: document.getElementById('maxSpeakers'),

  // Settings - AI
  aiModeSelect: document.getElementById('aiMode'),
  autoAiTriggerGroup: document.getElementById('autoAiTriggerGroup'),
  autoAiTriggerSelect: document.getElementById('autoAiTrigger'),
  autoAiIntervalGroup: document.getElementById('autoAiIntervalGroup'),
  autoAiIntervalInput: document.getElementById('autoAiInterval'),

  // Settings - API
  displayModeSelect: document.getElementById('displayMode'),
  apiKeyInput: document.getElementById('apiKey'),
  customPromptInput: document.getElementById('customPrompt'),
  modelSelect: document.getElementById('modelSelect'),
  saveSettingsBtn: document.getElementById('saveSettings'),
  resetSettingsBtn: document.getElementById('resetSettings'),
  settingsStatus: document.getElementById('settingsStatus'),
  promptPreview: document.getElementById('promptPreview'),

  // Custom prompts
  autoAiPromptInput: document.getElementById('autoAiPrompt'),
  summaryPromptInput: document.getElementById('summaryPrompt'),
  followUpPromptInput: document.getElementById('followUpPrompt'),

  // Modals
  speakerModal: document.getElementById('speakerModal'),
  speakersList: document.getElementById('speakersList'),
  closeSpeakerModal: document.getElementById('closeSpeakerModal'),
  closeSpeakerModalBtn: document.getElementById('closeSpeakerModalBtn'),
  exportModal: document.getElementById('exportModal'),
  closeExportModal: document.getElementById('closeExportModal'),
  closeExportModalBtn: document.getElementById('closeExportModalBtn'),
  exportFormatSelect: document.getElementById('exportFormat'),
  exportTextFormatSelect: document.getElementById('exportTextFormat'),
  doExportBtn: document.getElementById('doExport'),

  // Loading
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeTabs();
  initializeControls();
  await loadSettings();
  setupMessageListener();
  updateUI();
});

// Tab Navigation
function initializeTabs() {
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      elements.tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      elements.tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}Tab`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Initialize Controls
function initializeControls() {
  // Recording controls
  elements.startBtn.addEventListener('click', startRecording);
  elements.stopBtn.addEventListener('click', stopRecording);
  elements.clearBtn.addEventListener('click', clearTranscription);
  elements.exportBtn.addEventListener('click', openExportModal);
  elements.generateAnswerBtn.addEventListener('click', generateAnswer);
  elements.copyTranscriptionBtn.addEventListener('click', copyTranscription);
  elements.copyRecommendationBtn.addEventListener('click', copyRecommendation);

  // Speaker management
  elements.currentSpeakerSelect.addEventListener('change', handleSpeakerChange);
  elements.addSpeakerBtn.addEventListener('click', addNewSpeaker);
  elements.manageSpeakersBtn.addEventListener('click', openSpeakerModal);

  // View mode
  elements.viewModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.viewModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.viewMode = btn.dataset.view;
      renderTranscription();
      chrome.storage.local.set({ viewMode: btn.dataset.view });
    });
  });

  // Recommendation tabs
  const recTabs = elements.recommendationTabs.querySelectorAll('.rec-tab-btn');
  recTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      recTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.recommendationType = btn.dataset.type;
      updateGenerateButton();
    });
  });

  // Settings
  elements.displayModeSelect.addEventListener('change', handleDisplayModeChange);
  elements.transcriptionModeSelect.addEventListener('change', handleTranscriptionModeChange);
  elements.aiModeSelect.addEventListener('change', handleAiModeChange);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.resetSettingsBtn.addEventListener('click', resetSettings);

  // Update preview when prompts change
  elements.customPromptInput.addEventListener('input', updatePromptPreview);
  elements.modelSelect.addEventListener('change', updatePromptPreview);

  // Modal close buttons
  elements.closeSpeakerModal.addEventListener('click', closeModals);
  elements.closeSpeakerModalBtn.addEventListener('click', closeModals);
  elements.closeExportModal.addEventListener('click', closeModals);
  elements.closeExportModalBtn.addEventListener('click', closeModals);

  // Export button
  elements.doExportBtn.addEventListener('click', exportTranscription);
}

// Settings Management
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));

    // Merge with defaults
    currentSettings = { ...DEFAULT_SETTINGS, ...result };

    // Load speakers from storage if available
    if (currentSettings.speakers && Array.isArray(currentSettings.speakers)) {
      currentSettings.speakers.forEach(speaker => {
        currentSpeakers.set(speaker.id, speaker);
      });
    }

    // Update form fields
    elements.displayModeSelect.value = currentSettings.displayMode;
    elements.transcriptionModeSelect.value = currentSettings.transcriptionMode;
    elements.aiModeSelect.value = currentSettings.aiMode;
    elements.autoAiTriggerSelect.value = currentSettings.autoAiTrigger;
    elements.autoAiIntervalInput.value = currentSettings.autoAiInterval / 1000; // Convert to seconds
    elements.maxSpeakersInput.value = currentSettings.maxSpeakers;
    elements.modelSelect.value = currentSettings.model;

    // Mask and set API keys
    if (currentSettings.apiKey) {
      const maskedKey = currentSettings.apiKey.length > 4
        ? `${'•'.repeat(currentSettings.apiKey.length - 4)}${currentSettings.apiKey.slice(-4)}`
        : currentSettings.apiKey;
      elements.apiKeyInput.value = maskedKey;
    }

    if (currentSettings.deepgramApiKey) {
      const maskedKey = currentSettings.deepgramApiKey.length > 4
        ? `${'•'.repeat(currentSettings.deepgramApiKey.length - 4)}${currentSettings.deepgramApiKey.slice(-4)}`
        : currentSettings.deepgramApiKey;
      elements.deepgramApiKeyInput.value = maskedKey;
    }

    // Set prompts
    elements.customPromptInput.value = currentSettings.customPrompt || '';
    elements.autoAiPromptInput.value = currentSettings.autoAiPrompt || '';
    elements.summaryPromptInput.value = currentSettings.summaryPrompt || '';
    elements.followUpPromptInput.value = currentSettings.followUpPrompt || '';

    // Update UI based on settings
    handleTranscriptionModeChange();
    handleAiModeChange();
    updatePromptPreview();
    updateSpeakerSelector();
    updateAiModeBadge();

    // Set view mode
    if (currentSettings.viewMode) {
      elements.viewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentSettings.viewMode);
      });
    }

    // Set recommendation type
    if (currentSettings.recommendationType) {
      const recTabs = elements.recommendationTabs.querySelectorAll('.rec-tab-btn');
      recTabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === currentSettings.recommendationType);
      });
    }

  } catch (error) {
    showSettingsStatus('Error loading settings', 'error');
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  const displayMode = elements.displayModeSelect.value;
  const transcriptionMode = elements.transcriptionModeSelect.value;
  const aiMode = elements.aiModeSelect.value;
  const autoAiTrigger = elements.autoAiTriggerSelect.value;
  const autoAiInterval = parseInt(elements.autoAiIntervalInput.value) * 1000; // Convert to ms
  const maxSpeakers = parseInt(elements.maxSpeakersInput.value);
  const model = elements.modelSelect.value;

  const apiKey = elements.apiKeyInput.value.trim();
  const deepgramApiKey = elements.deepgramApiKeyInput.value.trim();
  const customPrompt = elements.customPromptInput.value.trim();
  const autoAiPrompt = elements.autoAiPromptInput.value.trim();
  const summaryPrompt = elements.summaryPromptInput.value.trim();
  const followUpPrompt = elements.followUpPromptInput.value.trim();

  // Check if user entered masked key
  const isNewApiKey = !apiKey.includes('•');
  const isNewDeepgramKey = !deepgramApiKey.includes('•');

  // Validate Gemini API key
  if (isNewApiKey) {
    if (!apiKey) {
      showSettingsStatus('Please enter your Gemini API key', 'error');
      return;
    }
    if (!apiKey.startsWith('AIza')) {
      showSettingsStatus('Invalid API key format. It should start with "AIza"', 'error');
      return;
    }
  } else if (!currentSettings.apiKey) {
    showSettingsStatus('Please enter your Gemini API key', 'error');
    return;
  }

  // Validate Deepgram API key if Deepgram mode is selected
  if (transcriptionMode === 'deepgram' && isNewDeepgramKey && deepgramApiKey && !deepgramApiKey.startsWith('dg_')) {
    showSettingsStatus('Invalid Deepgram API key format', 'error');
    return;
  }

  currentSettings = {
    ...currentSettings,
    displayMode,
    transcriptionMode,
    aiMode,
    autoAiTrigger,
    autoAiInterval,
    maxSpeakers,
    model,
    apiKey: isNewApiKey ? apiKey : currentSettings.apiKey,
    deepgramApiKey: isNewDeepgramKey ? deepgramApiKey : currentSettings.deepgramApiKey,
    customPrompt,
    autoAiPrompt,
    summaryPrompt,
    followUpPrompt
  };

  try {
    // Save speakers array
    currentSettings.speakers = Array.from(currentSpeakers.values());

    await chrome.storage.local.set(currentSettings);
    showSettingsStatus('Settings saved successfully!', 'success');

    // Reload content script settings
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'RELOAD_SETTINGS' }).catch(() => {});

    // Update button state
    updateGenerateButton();

    // Mask API keys in display
    if (isNewApiKey) {
      const maskedKey = apiKey.length > 4
        ? `${'•'.repeat(apiKey.length - 4)}${apiKey.slice(-4)}`
        : apiKey;
      elements.apiKeyInput.value = maskedKey;
    }

    if (isNewDeepgramKey && deepgramApiKey) {
      const maskedKey = deepgramApiKey.length > 4
        ? `${'•'.repeat(deepgramApiKey.length - 4)}${deepgramApiKey.slice(-4)}`
        : deepgramApiKey;
      elements.deepgramApiKeyInput.value = maskedKey;
    }

    // Clear status after 3 seconds
    setTimeout(() => {
      elements.settingsStatus.style.display = 'none';
    }, 3000);
  } catch (error) {
    showSettingsStatus('Error saving settings', 'error');
    console.error('Error saving settings:', error);
  }
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to default?')) {
    return;
  }

  try {
    await chrome.storage.local.clear();
    currentSettings = { ...DEFAULT_SETTINGS };
    currentSpeakers.clear();
    currentTranscription = [];
    currentSpeakerId = null;

    elements.apiKeyInput.value = '';
    elements.deepgramApiKeyInput.value = '';
    elements.customPromptInput.value = '';
    elements.autoAiPromptInput.value = '';
    elements.summaryPromptInput.value = '';
    elements.followUpPromptInput.value = '';
    elements.modelSelect.value = DEFAULT_SETTINGS.model;
    elements.transcriptionModeSelect.value = DEFAULT_SETTINGS.transcriptionMode;
    elements.aiModeSelect.value = DEFAULT_SETTINGS.aiMode;
    elements.maxSpeakersInput.value = DEFAULT_SETTINGS.maxSpeakers;

    updatePromptPreview();
    updateSpeakerSelector();
    handleTranscriptionModeChange();
    handleAiModeChange();
    showSettingsStatus('Settings reset to default', 'success');

    setTimeout(() => {
      elements.settingsStatus.style.display = 'none';
    }, 3000);
  } catch (error) {
    showSettingsStatus('Error resetting settings', 'error');
    console.error('Error resetting settings:', error);
  }
}

function handleTranscriptionModeChange() {
  const mode = elements.transcriptionModeSelect.value;
  const deepgramGroup = elements.deepgramApiKeyGroup;

  if (mode === 'deepgram') {
    deepgramGroup.style.display = 'block';
  } else {
    deepgramGroup.style.display = 'none';
  }
}

function handleAiModeChange() {
  const mode = elements.aiModeSelect.value;
  const triggerGroup = elements.autoAiTriggerGroup;
  const intervalGroup = elements.autoAiIntervalGroup;

  if (mode === 'auto') {
    triggerGroup.style.display = 'block';
    intervalGroup.style.display = elements.autoAiTriggerSelect.value === 'interval' ? 'block' : 'none';
  } else {
    triggerGroup.style.display = 'none';
    intervalGroup.style.display = 'none';
  }

  updateAiModeBadge();
  updateGenerateButton();
}

function updateAiModeBadge() {
  const badge = elements.aiModeBadge;
  const autoStatus = elements.autoAiStatus;

  if (currentSettings.aiMode === 'auto') {
    badge.textContent = 'Auto';
    badge.classList.add('auto');
    autoStatus.style.display = 'flex';
    const intervalSec = Math.round(currentSettings.autoAiInterval / 1000);
    elements.autoAiStatusText.textContent = `Auto-AI active (${currentSettings.autoAiTrigger}: ${currentSettings.autoAiTrigger === 'interval' ? intervalSec + 's' : currentSettings.autoAiTrigger})`;
  } else {
    badge.textContent = 'Manual';
    badge.classList.remove('auto');
    autoStatus.style.display = 'none';
  }
}

function handleDisplayModeChange() {
  const newMode = elements.displayModeSelect.value;
  const modeName = newMode === 'sidepanel' ? 'Side Panel' : 'Popup';

  if (!confirm(`Switch to ${modeName} mode?\n\nThe extension will now open in ${modeName.toLowerCase()} when you click the extension icon.`)) {
    elements.displayModeSelect.value = currentSettings.displayMode;
    return;
  }

  currentSettings.displayMode = newMode;
  chrome.storage.local.set({ displayMode: newMode });

  showSettingsStatus(`Display mode changed to ${modeName}. Click extension icon to open.`, 'success');

  setTimeout(() => {
    elements.settingsStatus.style.display = 'none';
  }, 3000);
}

function showSettingsStatus(message, type) {
  elements.settingsStatus.textContent = message;
  elements.settingsStatus.className = `settings-status ${type}`;
  elements.settingsStatus.style.display = 'block';
}

function updatePromptPreview() {
  const prompt = getActivePrompt();
  const preview = prompt.replace('{transcription}', '[Meeting transcription will appear here...]');
  elements.promptPreview.textContent = preview;
}

function getActivePrompt() {
  const type = currentSettings.recommendationType || 'answer';

  switch (type) {
    case 'summary':
      return currentSettings.summaryPrompt || DEFAULT_PROMPTS.summary;
    case 'followup':
      return currentSettings.followUpPrompt || DEFAULT_PROMPTS.followup;
    case 'analysis':
      return DEFAULT_PROMPTS.analysis;
    case 'answer':
    default:
      return currentSettings.customPrompt || DEFAULT_PROMPTS.answer;
  }
}

// Recording Controls
async function startRecording() {
  try {
    if (!currentSettings.apiKey) {
      alert('Please configure your Gemini API key in Settings first.');
      switchToSettingsTab();
      return;
    }

    if (currentSettings.transcriptionMode === 'deepgram' && !currentSettings.deepgramApiKey) {
      alert('Please configure your Deepgram API key in Settings first.');
      switchToSettingsTab();
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'START_RECORDING' });

    if (response && response.success) {
      isRecording = true;
      updateRecordingState(true);

      // Start auto-AI if enabled
      if (currentSettings.aiMode === 'auto') {
        startAutoAi();
      }
    } else {
      alert('Could not start recording. Make sure you have granted microphone permissions.');
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Error starting recording. Please refresh the page and try again.');
  }
}

async function stopRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'STOP_RECORDING' });

    isRecording = false;
    updateRecordingState(false);

    // Stop auto-AI
    stopAutoAi();
  } catch (error) {
    console.error('Error stopping recording:', error);
  }
}

function updateRecordingState(recording) {
  elements.startBtn.disabled = recording;
  elements.stopBtn.disabled = !recording;

  if (recording) {
    elements.statusDot.classList.add('recording');
    elements.statusText.textContent = 'Recording';
  } else {
    elements.statusDot.classList.remove('recording');
    elements.statusText.textContent = 'Stopped';
  }
}

function clearTranscription() {
  currentTranscription = [];
  turnCount = 0;
  elements.transcriptionText.innerHTML = '';
  elements.transcriptionPlaceholder.style.display = 'block';
  elements.recommendationText.textContent = '';
  elements.recommendationPlaceholder.style.display = 'block';
  elements.copyRecommendationBtn.style.display = 'none';
  updateCharCounter();
  updateGenerateButton();
}

function copyTranscription() {
  const text = getTranscriptionAsText('flat');
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const originalText = elements.copyTranscriptionBtn.textContent;
    elements.copyTranscriptionBtn.textContent = '✓';
    setTimeout(() => {
      elements.copyTranscriptionBtn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function copyRecommendation() {
  const text = elements.recommendationText.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const originalText = elements.copyRecommendationBtn.textContent;
    elements.copyRecommendationBtn.textContent = '✓';
    setTimeout(() => {
      elements.copyRecommendationBtn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Speaker Management
function updateSpeakerSelector() {
  const select = elements.currentSpeakerSelect;
  select.innerHTML = '<option value="">Select Speaker...</option>';

  currentSpeakers.forEach((speaker, id) => {
    const option = document.createElement('option');
    option.value = speaker.id;
    option.textContent = speaker.customName || speaker.name;
    option.style.backgroundColor = speaker.color;
    select.appendChild(option);
  });

  // Set current speaker
  if (currentSpeakerId && currentSpeakers.has(currentSpeakerId)) {
    select.value = currentSpeakerId;
  }
}

function handleSpeakerChange() {
  currentSpeakerId = elements.currentSpeakerSelect.value || null;
  if (currentSpeakerId) {
    currentSettings.currentSpeakerId = currentSpeakerId;
    chrome.storage.local.set({ currentSpeakerId });
  }
}

function addNewSpeaker() {
  const speaker = {
    id: `speaker_${Date.now()}`,
    name: `Speaker ${currentSpeakers.size + 1}`,
    color: getNextSpeakerColor(),
    customName: null,
    turnCount: 0,
    createdAt: Date.now()
  };

  currentSpeakers.set(speaker.id, speaker);
  updateSpeakerSelector();
  elements.currentSpeakerSelect.value = speaker.id;
  handleSpeakerChange();

  // Save to storage
  saveSpeakers();
}

function getNextSpeakerColor() {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#ffecd2', '#fcb69f', '#ff9a9e', '#fecfef'
  ];
  const usedColors = Array.from(currentSpeakers.values()).map(s => s.color);
  for (const color of colors) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  return colors[currentSpeakers.size % colors.length];
}

async function saveSpeakers() {
  currentSettings.speakers = Array.from(currentSpeakers.values());
  await chrome.storage.local.set({ speakers: currentSettings.speakers });
}

function openSpeakerModal() {
  renderSpeakersList();
  elements.speakerModal.classList.add('active');
}

function renderSpeakersList() {
  const list = elements.speakersList;
  list.innerHTML = '';

  if (currentSpeakers.size === 0) {
    list.innerHTML = '<p style="text-align: center; color: #6b7280;">No speakers yet. Add speakers during transcription.</p>';
    return;
  }

  currentSpeakers.forEach((speaker, id) => {
    const item = document.createElement('div');
    item.className = 'speaker-item';
    item.style.borderLeftColor = speaker.color;

    const initials = (speaker.customName || speaker.name).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    item.innerHTML = `
      <div class="speaker-color-indicator" style="background-color: ${speaker.color}">${initials}</div>
      <div class="speaker-info">
        <div class="speaker-name">${speaker.customName || speaker.name}</div>
        <div class="speaker-stats">${speaker.turnCount || 0} turns</div>
      </div>
      <div class="speaker-actions">
        <button onclick="renameSpeaker('${speaker.id}')" title="Rename">✏️</button>
        <button onclick="deleteSpeaker('${speaker.id}')" title="Delete">🗑</button>
      </div>
    `;

    list.appendChild(item);
  });
}

// Global functions for speaker actions (called from HTML)
window.renameSpeaker = async function(speakerId) {
  const speaker = currentSpeakers.get(speakerId);
  if (!speaker) return;

  const newName = prompt('Enter new name for this speaker:', speaker.customName || speaker.name);
  if (newName && newName.trim()) {
    speaker.customName = newName.trim();
    await saveSpeakers();
    renderSpeakersList();
    updateSpeakerSelector();
  }
};

window.deleteSpeaker = async function(speakerId) {
  if (!confirm('Delete this speaker? Their transcription turns will remain but without speaker attribution.')) {
    return;
  }

  currentSpeakers.delete(speakerId);
  if (currentSpeakerId === speakerId) {
    currentSpeakerId = null;
    elements.currentSpeakerSelect.value = '';
  }

  await saveSpeakers();
  renderSpeakersList();
  updateSpeakerSelector();
};

function closeModals() {
  elements.speakerModal.classList.remove('active');
  elements.exportModal.classList.remove('active');
}

// Export functionality
function openExportModal() {
  if (currentTranscription.length === 0) {
    alert('No transcription to export.');
    return;
  }
  elements.exportModal.classList.add('active');
}

function exportTranscription() {
  const format = elements.exportFormatSelect.value;
  const textFormat = elements.exportTextFormatSelect.value;

  if (format === 'json') {
    exportAsJSON();
  } else {
    exportAsText(textFormat);
  }

  closeModals();
}

function exportAsJSON() {
  const data = {
    exportDate: new Date().toISOString(),
    settings: {
      transcriptionMode: currentSettings.transcriptionMode,
      model: currentSettings.model
    },
    speakers: Array.from(currentSpeakers.values()),
    turns: currentTranscription
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `meetscribe-transcription-${Date.now()}.json`);
}

function exportAsText(format) {
  const text = getTranscriptionAsText(format);
  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, `meetscribe-transcription-${Date.now()}.txt`);
}

function getTranscriptionAsText(format) {
  if (format === 'flat') {
    return currentTranscription.map(turn => {
      const speaker = currentSpeakers.get(turn.speakerId);
      const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
      return `[${speakerName}]: ${turn.text}`;
    }).join('\n\n');
  } else if (format === 'grouped') {
    const grouped = new Map();
    currentTranscription.forEach(turn => {
      if (!grouped.has(turn.speakerId)) {
        grouped.set(turn.speakerId, []);
      }
      grouped.get(turn.speakerId).push(turn);
    });

    const lines = [];
    grouped.forEach((turns, speakerId) => {
      const speaker = currentSpeakers.get(speakerId);
      const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
      lines.push(`[${speakerName}]:`);
      lines.push(turns.map(t => t.text).join(' '));
      lines.push('---');
    });

    return lines.join('\n');
  } else {
    // turn-by-turn with timestamps
    return currentTranscription.map(turn => {
      const speaker = currentSpeakers.get(turn.speakerId);
      const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
      const timestamp = new Date(turn.timestamp).toLocaleTimeString();
      return `[${timestamp}] [${speakerName}]: ${turn.text}`;
    }).join('\n\n');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Message Listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRANSCRIPTION_UPDATE') {
      handleTranscriptionUpdate(message);
    } else if (message.action === 'TRANSCRIPTION_ERROR') {
      handleTranscriptionError(message.error);
    } else if (message.action === 'PROVIDER_SWITCH') {
      handleProviderSwitch(message);
    }
  });
}

function handleTranscriptionUpdate(message) {
  const { text, isInterim, provider, speaker, timestamp } = message;

  if (!text) return;

  lastTranscriptionTime = Date.now();

  if (isInterim) {
    interimTranscript = text;
  } else {
    // Final transcript
    const turn = {
      text,
      timestamp: timestamp || Date.now(),
      isInterim: false,
      provider
    };

    // Determine speaker
    if (provider === 'deepgram' && speaker) {
      // Deepgram detected speaker
      let speakerObj = getOrCreateSpeaker(speaker.id, speaker.number);
      turn.speakerId = speakerObj.id;
      currentSpeakerId = speakerObj.id;
    } else {
      // Web Speech API - use current selected speaker
      if (!currentSpeakerId) {
        // Auto-create speaker if none selected
        if (currentSpeakers.size === 0) {
          addNewSpeaker();
        }
        currentSpeakerId = currentSpeakers.keys().next().value;
      }
      turn.speakerId = currentSpeakerId;
    }

    // Add to transcription
    currentTranscription.push(turn);

    // Update speaker turn count
    const speakerObj = currentSpeakers.get(turn.speakerId);
    if (speakerObj) {
      speakerObj.turnCount = (speakerObj.turnCount || 0) + 1;
    }

    // Increment turn count for auto-AI
    turnCount++;

    interimTranscript = '';

    // Trigger auto-AI if needed
    if (currentSettings.aiMode === 'auto') {
      checkAutoAiTrigger();
    }
  }

  renderTranscription();
  updateCharCounter();
  updateGenerateButton();
}

function getOrCreateSpeaker(speakerId, speakerNumber) {
  if (currentSpeakers.has(speakerId)) {
    return currentSpeakers.get(speakerId);
  }

  const speaker = {
    id: speakerId,
    name: `Speaker ${speakerNumber + 1}`,
    color: getNextSpeakerColor(),
    customName: null,
    turnCount: 0,
    createdAt: Date.now()
  };

  currentSpeakers.set(speakerId, speaker);
  updateSpeakerSelector();
  saveSpeakers();

  return speaker;
}

function handleTranscriptionError(error) {
  console.error('Transcription error:', error);

  let errorMsg = 'Transcription error occurred. ';
  if (error.type === 'websocket-error' || error.type === 'connection-lost') {
    errorMsg += 'Deepgram connection failed. Check your API key.';
  } else if (error.type === 'no-api-key') {
    errorMsg += 'Please configure your Deepgram API key in settings.';
  } else {
    errorMsg += error.message || 'Unknown error.';
  }

  // Show error notification
  showNotification(errorMsg, 'error');
}

function handleProviderSwitch(message) {
  const { from, to, reason } = message;
  showNotification(`Switched from ${from} to ${to}: ${reason}`, 'info');
}

function showNotification(message, type = 'info') {
  // Simple alert for now - could be enhanced with a toast notification
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Auto-AI functionality
function startAutoAi() {
  stopAutoAi(); // Clear any existing timer

  if (currentSettings.aiMode !== 'auto') return;

  const intervalMs = currentSettings.autoAiInterval;

  autoAiTimer = setInterval(() => {
    if (currentSettings.autoAiTrigger === 'interval') {
      generateAnswer();
    }
  }, intervalMs);
}

function stopAutoAi() {
  if (autoAiTimer) {
    clearInterval(autoAiTimer);
    autoAiTimer = null;
  }
}

function checkAutoAiTrigger() {
  if (currentSettings.aiMode !== 'auto') return;

  if (currentSettings.autoAiTrigger === 'turn' && turnCount % 5 === 0) {
    // Trigger every 5 turns
    generateAnswer();
  } else if (currentSettings.autoAiTrigger === 'pause') {
    // Check if there's been a pause in transcription
    const timeSinceLast = Date.now() - lastTranscriptionTime;
    if (timeSinceLast > 5000 && currentTranscription.length > 0) {
      // 5 seconds of silence
      generateAnswer();
    }
  }
}

// Transcription Rendering
function renderTranscription() {
  elements.transcriptionPlaceholder.style.display = 'none';

  const viewMode = currentSettings.viewMode || 'turn-by-turn';

  let html = '';

  if (viewMode === 'turn-by-turn') {
    html = renderTurnByTurn();
  } else if (viewMode === 'grouped') {
    html = renderGrouped();
  } else {
    // flat
    html = renderFlat();
  }

  // Add interim transcript if exists
  if (interimTranscript) {
    const currentSpeaker = currentSpeakers.get(currentSpeakerId);
    const speakerName = currentSpeaker ? (currentSpeaker.customName || currentSpeaker.name) : 'Unknown';
    const speakerColor = currentSpeaker ? currentSpeaker.color : '#6b7280';
    html += `
      <div class="conversation-turn interim">
        <span class="speaker-bubble" style="background-color: ${speakerColor}">
          <span class="speaker-avatar">${speakerName.substring(0, 2).toUpperCase()}</span>
          ${speakerName}
        </span>
        <span class="interim-text">${interimTranscript}</span>
      </div>
    `;
  }

  elements.transcriptionText.innerHTML = html;
  elements.transcriptionBox.scrollTop = elements.transcriptionBox.scrollHeight;
}

function renderTurnByTurn() {
  return currentTranscription.map(turn => {
    const speaker = currentSpeakers.get(turn.speakerId);
    const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
    const speakerColor = speaker ? speaker.color : '#6b7280';
    const initials = speakerName.substring(0, 2).toUpperCase();

    return `
      <div class="conversation-turn" style="border-left-color: ${speakerColor}">
        <span class="speaker-bubble" style="background-color: ${speakerColor}">
          <span class="speaker-avatar">${initials}</span>
          ${speakerName}
        </span>
        <span>${turn.text}</span>
      </div>
    `;
  }).join('');
}

function renderGrouped() {
  const grouped = new Map();

  currentTranscription.forEach(turn => {
    if (!grouped.has(turn.speakerId)) {
      grouped.set(turn.speakerId, []);
    }
    grouped.get(turn.speakerId).push(turn);
  });

  let html = '';

  grouped.forEach((turns, speakerId) => {
    const speaker = currentSpeakers.get(speakerId);
    const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
    const speakerColor = speaker ? speaker.color : '#6b7280';
    const initials = speakerName.substring(0, 2).toUpperCase();

    const text = turns.map(t => t.text).join(' ');

    html += `
      <div class="speaker-group" style="border-left-color: ${speakerColor}">
        <div class="speaker-group-header">
          <span class="speaker-bubble" style="background-color: ${speakerColor}">
            <span class="speaker-avatar">${initials}</span>
            ${speakerName}
          </span>
          <span style="color: #6b7280; font-size: 12px;">(${turns.length} turns)</span>
        </div>
        <div>${text}</div>
      </div>
    `;
  });

  return html;
}

function renderFlat() {
  const text = currentTranscription.map(turn => {
    const speaker = currentSpeakers.get(turn.speakerId);
    const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
    return `<strong>[${speakerName}]:</strong> ${turn.text}`;
  }).join('\n\n');

  return `<div style="white-space: pre-wrap;">${text}</div>`;
}

function updateCharCounter() {
  const charCount = currentTranscription.reduce((count, turn) => count + turn.text.length, 0);
  elements.charCounter.textContent = `${charCount.toLocaleString()} char${charCount !== 1 ? 's' : ''}`;
}

function updateGenerateButton() {
  const hasTranscription = currentTranscription.length > 0;
  const hasApiKey = currentSettings.apiKey && currentSettings.apiKey.length > 0;
  const isManual = currentSettings.aiMode === 'manual';

  elements.generateAnswerBtn.disabled = !(hasTranscription && hasApiKey && isManual);
}

// AI Answer Generation
async function generateAnswer() {
  if (currentTranscription.length === 0) {
    alert('No transcription to generate from. Please start recording first.');
    return;
  }

  if (!currentSettings.apiKey) {
    alert('Please configure your Gemini API key in Settings.');
    switchToSettingsTab();
    return;
  }

  showLoading('Generating AI recommendation...');

  try {
    const prompt = buildPrompt();
    const response = await callGeminiAPI(prompt);
    displayRecommendation(response);
  } catch (error) {
    console.error('Error generating answer:', error);
    handleGenerationError(error);
  } finally {
    hideLoading();
  }
}

function buildPrompt() {
  const basePrompt = getActivePrompt();
  const transcriptionText = getTranscriptionForAI();
  return basePrompt.replace('{transcription}', transcriptionText);
}

function getTranscriptionForAI() {
  // Format transcription for AI - use flat format
  return currentTranscription.map(turn => {
    const speaker = currentSpeakers.get(turn.speakerId);
    const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
    return `[${speakerName}]: ${turn.text}`;
  }).join('\n\n');
}

async function callGeminiAPI(prompt) {
  const apiKey = currentSettings.apiKey;
  const model = currentSettings.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Unexpected API response format');
}

function displayRecommendation(text) {
  elements.recommendationPlaceholder.style.display = 'none';
  elements.recommendationText.textContent = text;
  elements.copyRecommendationBtn.style.display = 'inline-flex';
}

function handleGenerationError(error) {
  let errorMsg = 'Error generating recommendation. ';
  let shouldSwitchToSettings = false;

  if (error.message.includes('401') || error.message.includes('403')) {
    errorMsg += '\n\n❌ Invalid API Key\n\n';
    errorMsg += 'Please check:\n';
    errorMsg += '• API key is correct in Settings\n';
    errorMsg += '• Key starts with "AIza"\n';
    errorMsg += '• Key hasn\'t been revoked\n\n';
    errorMsg += 'Get a new key at: https://aistudio.google.com/app/apikey';
    shouldSwitchToSettings = true;
  } else if (error.message.includes('429')) {
    errorMsg += '\n\n⏱️ Rate Limit Exceeded\n\n';
    errorMsg += 'You\'ve hit the API rate limit.\n\n';
    errorMsg += 'Solutions:\n';
    errorMsg += '• Wait 30-60 seconds before retrying\n';
    errorMsg += '• Use a faster model (2.0 Flash)\n';
    errorMsg += '• Check your usage at: https://aistudio.google.com/app/apikey\n\n';
    errorMsg += 'Free tier limits:\n';
    errorMsg += '• 15 requests/minute\n';
    errorMsg += '• 1,500 requests/day';
  } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
    errorMsg += '\n\n🌐 Network Error\n\n';
    errorMsg += 'Possible issues:\n';
    errorMsg += '• No internet connection\n';
    errorMsg += '• Firewall blocking requests\n';
    errorMsg += '• VPN or proxy interference\n\n';
    errorMsg += 'Try:\n';
    errorMsg += '• Check your internet connection\n';
    errorMsg += '• Disable VPN temporarily\n';
    errorMsg += '• Try a different network';
  } else if (error.message.includes('404')) {
    errorMsg += '\n\n🔍 Model Not Found\n\n';
    errorMsg += 'The selected AI model may not be available.\n\n';
    errorMsg += 'Try:\n';
    errorMsg += '• Select "gemini-flash-latest" in Settings\n';
    errorMsg += '• Or choose "gemini-2.0-flash"\n\n';
    shouldSwitchToSettings = true;
  } else {
    errorMsg += '\n\n⚠️ Unexpected Error\n\n';
    errorMsg += `${error.message}\n\n`;
    errorMsg += 'If this persists:\n';
    errorMsg += '• Try reloading the extension\n';
    errorMsg += '• Check the console for details\n';
    errorMsg += '• Report the issue with your API key redacted';
  }

  alert(errorMsg);

  if (shouldSwitchToSettings) {
    switchToSettingsTab();
  }
}

function switchToSettingsTab() {
  elements.tabButtons.forEach(btn => {
    if (btn.dataset.tab === 'settings') {
      btn.click();
    }
  });
}

function updateUI() {
  updateGenerateButton();
}

// Loading Overlay
function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('active');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  stopAutoAi();
});
