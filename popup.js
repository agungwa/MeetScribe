// Default system prompt for meeting assistance
const DEFAULT_PROMPT = `You are a helpful meeting assistant. Based on the following meeting transcription, provide a concise and relevant answer suggestion to the most recent question or discussion point. Keep your response professional and actionable.

Meeting Transcription:
{transcription}

Answer Recommendation:`;

// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  customPrompt: '',
  model: 'gemini-2.0-flash'
};

// Current state
let currentTranscription = '';
let interimTranscript = '';
let isRecording = false;
let currentSettings = { ...DEFAULT_SETTINGS };

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
  generateAnswerBtn: document.getElementById('generateAnswer'),

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

  // Settings
  apiKeyInput: document.getElementById('apiKey'),
  customPromptInput: document.getElementById('customPrompt'),
  modelSelect: document.getElementById('modelSelect'),
  saveSettingsBtn: document.getElementById('saveSettings'),
  resetSettingsBtn: document.getElementById('resetSettings'),
  settingsStatus: document.getElementById('settingsStatus'),
  promptPreview: document.getElementById('promptPreview'),

  // Loading
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeControls();
  loadSettings();
  setupMessageListener();
});

// Tab Navigation
function initializeTabs() {
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      // Update active tab button
      elements.tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active tab content
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
  elements.startBtn.addEventListener('click', startRecording);
  elements.stopBtn.addEventListener('click', stopRecording);
  elements.clearBtn.addEventListener('click', clearTranscription);
  elements.generateAnswerBtn.addEventListener('click', generateAnswer);
  elements.copyTranscriptionBtn.addEventListener('click', copyTranscription);
  elements.copyRecommendationBtn.addEventListener('click', copyRecommendation);

  // Settings
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.resetSettingsBtn.addEventListener('click', resetSettings);

  // Update preview when custom prompt changes
  elements.customPromptInput.addEventListener('input', updatePromptPreview);
  elements.modelSelect.addEventListener('change', updatePromptPreview);
}

// Settings Management
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['apiKey', 'customPrompt', 'model']);

    currentSettings = {
      apiKey: result.apiKey || DEFAULT_SETTINGS.apiKey,
      customPrompt: result.customPrompt || DEFAULT_SETTINGS.customPrompt,
      model: result.model || DEFAULT_SETTINGS.model
    };

    // Update form fields
    elements.apiKeyInput.value = currentSettings.apiKey;
    elements.customPromptInput.value = currentSettings.customPrompt;
    elements.modelSelect.value = currentSettings.model;

    // Mask API key display (show only last 4 chars if exists)
    if (currentSettings.apiKey) {
      const maskedKey = currentSettings.apiKey.length > 4
        ? `${'•'.repeat(currentSettings.apiKey.length - 4)}${currentSettings.apiKey.slice(-4)}`
        : currentSettings.apiKey;
      elements.apiKeyInput.value = maskedKey;
    }

    updatePromptPreview();
  } catch (error) {
    showSettingsStatus('Error loading settings', 'error');
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  const apiKey = elements.apiKeyInput.value.trim();
  const customPrompt = elements.customPromptInput.value.trim();
  const model = elements.modelSelect.value;

  // Check if user entered masked key (no change to API key)
  const isNewKey = !apiKey.includes('•');

  // Validate API key only if user entered a new one
  if (isNewKey) {
    if (!apiKey) {
      showSettingsStatus('Please enter your Gemini API key', 'error');
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      showSettingsStatus('Invalid API key format. It should start with "AIza"', 'error');
      return;
    }
  } else if (!currentSettings.apiKey) {
    // User has masked key displayed but no actual key saved
    showSettingsStatus('Please enter your Gemini API key', 'error');
    return;
  }

  currentSettings = {
    apiKey: isNewKey ? apiKey : currentSettings.apiKey,
    customPrompt,
    model
  };

  try {
    await chrome.storage.local.set(currentSettings);
    showSettingsStatus('Settings saved successfully!', 'success');

    // Update generate button state
    updateGenerateButtonState();

    // Mask the API key in display
    if (isNewKey) {
      const maskedKey = apiKey.length > 4
        ? `${'•'.repeat(apiKey.length - 4)}${apiKey.slice(-4)}`
        : apiKey;
      elements.apiKeyInput.value = maskedKey;
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

    elements.apiKeyInput.value = '';
    elements.customPromptInput.value = '';
    elements.modelSelect.value = DEFAULT_SETTINGS.model;

    updatePromptPreview();
    showSettingsStatus('Settings reset to default', 'success');

    setTimeout(() => {
      elements.settingsStatus.style.display = 'none';
    }, 3000);
  } catch (error) {
    showSettingsStatus('Error resetting settings', 'error');
    console.error('Error resetting settings:', error);
  }
}

function showSettingsStatus(message, type) {
  elements.settingsStatus.textContent = message;
  elements.settingsStatus.className = `settings-status ${type}`;
  elements.settingsStatus.style.display = 'block';
}

function updatePromptPreview() {
  const prompt = currentSettings.customPrompt || DEFAULT_PROMPT;
  const preview = prompt.replace('{transcription}', '[Meeting transcription will appear here...]');
  elements.promptPreview.textContent = preview;
}

// Recording Controls
async function startRecording() {
  try {
    // Check if we have an API key configured
    if (!currentSettings.apiKey) {
      alert('Please configure your Gemini API key in Settings first.');
      switchToSettingsTab();
      return;
    }

    // Send message to background script to start recording
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'START_RECORDING' });

    if (response && response.success) {
      isRecording = true;
      updateRecordingState(true);
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
  currentTranscription = '';
  interimTranscript = '';
  elements.transcriptionText.textContent = '';
  elements.transcriptionPlaceholder.style.display = 'block';
  elements.recommendationText.textContent = '';
  elements.recommendationPlaceholder.style.display = 'block';
  elements.copyRecommendationBtn.style.display = 'none';
  updateCharCounter();
  updateGenerateButtonState();
}

function copyTranscription() {
  const text = elements.transcriptionText.textContent;
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

// Message Listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRANSCRIPTION_UPDATE') {
      handleTranscriptionUpdate(message.text, message.isInterim);
    }
  });
}

function handleTranscriptionUpdate(text, isInterim = false) {
  if (!text) return;

  // Update display
  elements.transcriptionPlaceholder.style.display = 'none';

  if (isInterim) {
    // Store interim text and display it with visual indicator
    interimTranscript = text;
    elements.transcriptionText.innerHTML = `${currentTranscription}<span class="interim-text">${interimTranscript}</span>`;
  } else {
    // Append final text to permanent transcription
    currentTranscription += (currentTranscription ? ' ' : '') + text;
    interimTranscript = '';
    elements.transcriptionText.textContent = currentTranscription;
  }

  // Update character counter (only count final transcription)
  updateCharCounter();

  // Scroll to bottom
  elements.transcriptionBox.scrollTop = elements.transcriptionBox.scrollHeight;

  // Update generate button state
  updateGenerateButtonState();
}

function updateGenerateButtonState() {
  const hasTranscription = currentTranscription.trim().length > 0;
  const hasApiKey = currentSettings.apiKey && currentSettings.apiKey.length > 0;
  elements.generateAnswerBtn.disabled = !(hasTranscription && hasApiKey);
}

function updateCharCounter() {
  const charCount = currentTranscription.length;
  elements.charCounter.textContent = `${charCount.toLocaleString()} char${charCount !== 1 ? 's' : ''}`;
}

// AI Answer Generation
async function generateAnswer() {
  if (!currentTranscription.trim()) {
    alert('No transcription to generate answer from. Please start recording first.');
    return;
  }

  if (!currentSettings.apiKey) {
    alert('Please configure your Gemini API key in Settings.');
    switchToSettingsTab();
    return;
  }

  showLoading('Generating AI recommendation...');

  try {
    // Build prompt
    const prompt = buildPrompt();

    // Call Gemini API
    const response = await callGeminiAPI(prompt);

    // Display response
    displayRecommendation(response);
  } catch (error) {
    console.error('Error generating answer:', error);
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
  } finally {
    hideLoading();
  }
}

function buildPrompt() {
  const basePrompt = currentSettings.customPrompt || DEFAULT_PROMPT;
  return basePrompt.replace('{transcription}', currentTranscription);
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

  // Extract the text from Gemini response
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

function switchToSettingsTab() {
  elements.tabButtons.forEach(btn => {
    if (btn.dataset.tab === 'settings') {
      btn.click();
    }
  });
}

// Loading Overlay
function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('active');
}
