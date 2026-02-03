// Content script for MeetScribe
// Handles audio capture and transcription using multiple providers

console.log('MeetScribe content script loaded');

// State
let currentProvider = null;
let fallbackProvider = null;
let providerManager = null;
let currentSettings = {};
let isProviderActive = false;

// Default settings
const DEFAULT_SETTINGS = {
  transcriptionMode: 'web-speech', // 'web-speech' or 'deepgram'
  deepgramApiKey: '',
  aiMode: 'manual', // 'manual' or 'auto'
  autoAiTrigger: 'interval', // 'interval', 'turn', 'pause'
  autoAiInterval: 60000, // 60 seconds
  maxSpeakers: 10,
  speakerConfidence: 0.5
};

// Initialize
(async function init() {
  try {
    await loadSettings();
    initializeProviders();
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
})();

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    currentSettings = { ...DEFAULT_SETTINGS, ...result };
  } catch (error) {
    console.error('Error loading settings:', error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * Initialize transcription providers
 */
function initializeProviders() {
  // Import providers (they should be loaded as content scripts or inline)
  // For now, we'll use inline implementation

  if (currentSettings.transcriptionMode === 'deepgram' && currentSettings.deepgramApiKey) {
    // Try to use Deepgram with Web Speech fallback
    try {
      const deepgramProvider = createDeepgramProvider();
      const webSpeechProvider = createWebSpeechProvider();

      // Create fallback wrapper
      providerManager = {
        type: 'fallback',
        primary: deepgramProvider,
        fallback: webSpeechProvider,
        start: async function() {
          return await this.primary.start();
        },
        stop: async function() {
          await this.primary.stop();
          await this.fallback.stop();
        },
        destroy: function() {
          this.primary.destroy();
          this.fallback.destroy();
        },
        setHandlers: function(handlers) {
          this.primary.setHandlers(handlers);
          this.fallback.setHandlers(handlers);
        }
      };

      currentProvider = deepgramProvider;
      fallbackProvider = webSpeechProvider;
    } catch (error) {
      console.error('Error creating Deepgram provider, falling back to Web Speech:', error);
      providerManager = createWebSpeechProvider();
      currentProvider = providerManager;
    }
  } else {
    // Use Web Speech API
    providerManager = createWebSpeechProvider();
    currentProvider = providerManager;
  }

  // Set up event handlers
  setupProviderHandlers();
}

/**
 * Create Web Speech Provider
 */
function createWebSpeechProvider() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('Web Speech API not supported');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const provider = {
    type: 'web-speech',
    recognition: recognition,
    isActive: false,

    start: function() {
      return new Promise((resolve, reject) => {
        if (this.isActive) {
          resolve(false);
          return;
        }

        try {
          this.recognition.start();
          resolve(true);
        } catch (error) {
          console.error('Error starting Web Speech:', error);
          reject(error);
        }
      });
    },

    stop: function() {
      return new Promise((resolve) => {
        if (!this.isActive) {
          resolve(false);
          return;
        }

        this.isActive = false;
        try {
          this.recognition.stop();
          resolve(true);
        } catch (error) {
          console.error('Error stopping Web Speech:', error);
          resolve(false);
        }
      });
    },

    setHandlers: function(handlers) {
      this.recognition.onstart = () => {
        this.isActive = true;
        if (handlers.onStatusChange) {
          handlers.onStatusChange('recording');
        }
        console.log('Web Speech: Recognition started');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript && handlers.onInterimResult) {
          handlers.onInterimResult({
            text: interimTranscript,
            provider: 'web-speech',
            timestamp: Date.now()
          });
        }

        if (finalTranscript && handlers.onFinalResult) {
          handlers.onFinalResult({
            text: finalTranscript.trim(),
            provider: 'web-speech',
            timestamp: Date.now()
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Web Speech error:', event.error);

        if (handlers.onError) {
          handlers.onError({
            type: event.error,
            message: getWebSpeechErrorMessage(event.error)
          });
        }

        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          this.isActive = false;
        }
      };

      this.recognition.onend = () => {
        console.log('Web Speech: Recognition ended');

        // Auto-restart if still supposed to be recording
        if (this.isActive) {
          try {
            this.recognition.start();
          } catch (error) {
            console.error('Error restarting Web Speech:', error);
            this.isActive = false;
            if (handlers.onStatusChange) {
              handlers.onStatusChange('stopped');
            }
          }
        } else {
          if (handlers.onStatusChange) {
            handlers.onStatusChange('stopped');
          }
        }
      };
    },

    destroy: function() {
      this.isActive = false;
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore
      }
    }
  };

  return provider;
}

/**
 * Create Deepgram Provider
 */
function createDeepgramProvider() {
  if (!currentSettings.deepgramApiKey) {
    throw new Error('Deepgram API key not configured');
  }

  const provider = {
    type: 'deepgram',
    socket: null,
    mediaRecorder: null,
    isActive: false,

    start: function() {
      return new Promise(async (resolve, reject) => {
        if (this.isActive) {
          resolve(false);
          return;
        }

        try {
          await this.createWebSocket();
          await this.startMediaRecording();
          resolve(true);
        } catch (error) {
          console.error('Error starting Deepgram:', error);
          reject(error);
        }
      });
    },

    stop: function() {
      return new Promise((resolve) => {
        if (!this.isActive) {
          resolve(false);
          return;
        }

        this.isActive = false;

        try {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
          }
          resolve(true);
        } catch (error) {
          console.error('Error stopping Deepgram:', error);
          resolve(false);
        }
      });
    },

    createWebSocket: function() {
      return new Promise((resolve, reject) => {
        const url = new URL('wss://api.deepgram.com/v1/listen');
        url.searchParams.set('model', 'nova-2');
        url.searchParams.set('language', 'en-US');
        url.searchParams.set('smart_format', 'true');
        url.searchParams.set('diarize', 'true');
        url.searchParams.set('diarize_version', '2');
        url.searchParams.set('num_speakers', currentSettings.maxSpeakers.toString());
        url.searchParams.set('interim_results', 'true');

        this.socket = new WebSocket(url.href, ['token', currentSettings.deepgramApiKey]);

        this.socket.onopen = () => {
          console.log('Deepgram: WebSocket connected');
          this.isActive = true;
          if (this.handlers && this.handlers.onStatusChange) {
            this.handlers.onStatusChange('recording');
          }
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.socket.onerror = (error) => {
          console.error('Deepgram: WebSocket error:', error);
          if (this.handlers && this.handlers.onError) {
            this.handlers.onError({ type: 'websocket-error', message: 'WebSocket connection error' });
          }
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('Deepgram: WebSocket closed');
          if (this.isActive && this.handlers && this.handlers.onError) {
            this.handlers.onError({ type: 'connection-lost', message: 'Connection to Deepgram lost' });
          }
          this.isActive = false;
          if (this.handlers && this.handlers.onStatusChange) {
            this.handlers.onStatusChange('stopped');
          }
        };
      });
    },

    handleMessage: function(data) {
      if (!this.handlers) return;

      if (data.channel && data.channel.alternatives) {
        const alternative = data.channel.alternatives[0];

        if (alternative.words) {
          const isFinal = data.is_final === true;
          const speakerSegments = this.groupWordsBySpeaker(alternative.words);

          speakerSegments.forEach(segment => {
            const resultData = {
              text: segment.text,
              provider: 'deepgram',
              timestamp: Date.now(),
              isInterim: !isFinal
            };

            if (segment.speaker !== null) {
              resultData.speaker = {
                id: `speaker_${segment.speaker}`,
                number: segment.speaker,
                confidence: segment.confidence || 1.0
              };
            }

            if (isFinal && this.handlers.onFinalResult) {
              this.handlers.onFinalResult(resultData);
            } else if (!isFinal && this.handlers.onInterimResult) {
              this.handlers.onInterimResult(resultData);
            }
          });
        }
      }
    },

    groupWordsBySpeaker: function(words) {
      const segments = [];
      let currentSegment = null;

      words.forEach(word => {
        const speaker = word.speaker || 0;
        const confidence = word.confidence || 1.0;

        if (!currentSegment || currentSegment.speaker !== speaker) {
          if (currentSegment) {
            segments.push(currentSegment);
          }

          currentSegment = {
            speaker: speaker,
            confidence: confidence,
            text: word.punctuated_word || word.word,
            startTime: word.start,
            endTime: word.end
          };
        } else {
          const text = word.punctuated_word !== word.word ?
            word.punctuated_word.substring(word.word.length) : '';
          currentSegment.text += ' ' + word.word + text;
          currentSegment.endTime = word.end;
        }
      });

      if (currentSegment) {
        segments.push(currentSegment);
      }

      return segments;
    },

    startMediaRecording: async function() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start(250);
        console.log('Deepgram: Media recording started');
      } catch (error) {
        console.error('Deepgram: Error starting media recording:', error);
        if (this.handlers && this.handlers.onError) {
          this.handlers.onError({ type: 'mic-error', message: error.message });
        }
        throw error;
      }
    },

    setHandlers: function(handlers) {
      this.handlers = handlers;
    },

    destroy: function() {
      this.isActive = false;
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (error) {
          // Ignore
        }
      }
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.close();
        } catch (error) {
          // Ignore
        }
      }
    }
  };

  return provider;
}

/**
 * Set up provider event handlers
 */
function setupProviderHandlers() {
  if (!providerManager) return;

  providerManager.setHandlers({
    onInterimResult: handleInterimResult,
    onFinalResult: handleFinalResult,
    onError: handleError,
    onStatusChange: handleStatusChange
  });
}

/**
 * Handle interim transcription results
 */
function handleInterimResult(data) {
  // Send message to popup/sidepanel
  chrome.runtime.sendMessage({
    action: 'TRANSCRIPTION_UPDATE',
    text: data.text,
    isInterim: true,
    provider: data.provider,
    speaker: data.speaker || null,
    timestamp: data.timestamp
  }).catch(error => {
    console.error('Error sending interim transcription:', error);
  });
}

/**
 * Handle final transcription results
 */
function handleFinalResult(data) {
  // Send message to popup/sidepanel
  chrome.runtime.sendMessage({
    action: 'TRANSCRIPTION_UPDATE',
    text: data.text,
    isInterim: false,
    provider: data.provider,
    speaker: data.speaker || null,
    timestamp: data.timestamp
  }).catch(error => {
    console.error('Error sending final transcription:', error);
  });
}

/**
 * Handle provider errors
 */
function handleError(error) {
  console.error('Provider error:', error);

  // Send error message to popup/sidepanel
  chrome.runtime.sendMessage({
    action: 'TRANSCRIPTION_ERROR',
    error: error
  }).catch(err => {
    console.error('Error sending error message:', err);
  });

  // If Deepgram fails and we have a fallback provider, switch to it
  if (error.type === 'websocket-error' || error.type === 'connection-lost') {
    if (currentProvider && currentProvider.type === 'deepgram' && fallbackProvider) {
      console.log('Falling back to Web Speech API');

      // Stop current provider
      if (currentProvider.isActive) {
        currentProvider.stop();
      }

      // Switch to fallback
      currentProvider = fallbackProvider;
      providerManager = fallbackProvider;

      // Set up handlers
      setupProviderHandlers();

      // Notify user
      chrome.runtime.sendMessage({
        action: 'PROVIDER_SWITCH',
        from: 'deepgram',
        to: 'web-speech',
        reason: 'connection-error'
      }).catch(err => {
        console.error('Error sending provider switch message:', err);
      });

      // Restart with fallback provider
      if (isProviderActive) {
        currentProvider.start();
      }
    }
  }
}

/**
 * Handle status changes
 */
function handleStatusChange(status) {
  console.log('Provider status:', status);

  chrome.runtime.sendMessage({
    action: 'RECORDING_STATUS',
    status: status
  }).catch(error => {
    console.error('Error sending status:', error);
  });
}

/**
 * Get Web Speech API error message
 */
function getWebSpeechErrorMessage(error) {
  const messages = {
    'not-allowed': 'Microphone permission denied. Please allow microphone access.',
    'no-speech': 'No speech detected.',
    'audio-capture': 'No microphone device found.',
    'network': 'Network error occurred.',
    'aborted': 'Recognition was aborted.'
  };
  return messages[error] || `Unknown error: ${error}`;
}

/**
 * Start recording
 */
async function startRecording() {
  if (isProviderActive) {
    console.log('Already recording');
    return { success: false, message: 'Already recording' };
  }

  if (!providerManager) {
    initializeProviders();
  }

  try {
    const success = await providerManager.start();
    if (success) {
      isProviderActive = true;
      return { success: true };
    } else {
      return { success: false, message: 'Failed to start recording' };
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Stop recording
 */
async function stopRecording() {
  if (!isProviderActive) {
    console.log('Not recording');
    return { success: false, message: 'Not recording' };
  }

  try {
    const success = await providerManager.stop();
    isProviderActive = false;
    return { success: true };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Reload settings and reinitialize providers
 */
async function reloadSettings() {
  await loadSettings();
  if (isProviderActive) {
    await stopRecording();
  }
  if (providerManager) {
    providerManager.destroy();
  }
  initializeProviders();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);

  if (message.action === 'START_RECORDING') {
    startRecording().then(result => sendResponse(result));
    return true;
  } else if (message.action === 'STOP_RECORDING') {
    stopRecording().then(result => sendResponse(result));
    return true;
  } else if (message.action === 'RELOAD_SETTINGS') {
    reloadSettings().then(() => sendResponse({ success: true }));
    return true;
  }

  return true;
});

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  if (isProviderActive && providerManager) {
    providerManager.stop();
    providerManager.destroy();
  }
});

// Handle visibility change (pause recording when tab is hidden to save resources)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isProviderActive && currentSettings.transcriptionMode === 'deepgram') {
    // Optionally pause Deepgram to save API costs
    console.log('Tab hidden, consider pausing expensive transcription');
  }
});
