/**
 * Transcription Providers Module
 * Pluggable backends for speech-to-text transcription
 */

/**
 * Base Transcription Provider Class
 */
class BaseTranscriptionProvider {
  constructor(config = {}) {
    this.config = config;
    this.isRecording = false;
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  /**
   * Start recording
   * @returns {Promise<boolean>}
   */
  async start() {
    throw new Error('start() must be implemented by subclass');
  }

  /**
   * Stop recording
   * @returns {Promise<boolean>}
   */
  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }

  /**
   * Check if provider is available
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers) {
    if (handlers.onInterimResult) this.onInterimResult = handlers.onInterimResult;
    if (handlers.onFinalResult) this.onFinalResult = handlers.onFinalResult;
    if (handlers.onError) this.onError = handlers.onError;
    if (handlers.onStatusChange) this.onStatusChange = handlers.onStatusChange;
  }

  /**
   * Emit interim result
   */
  emitInterimResult(data) {
    if (this.onInterimResult) {
      this.onInterimResult(data);
    }
  }

  /**
   * Emit final result
   */
  emitFinalResult(data) {
    if (this.onFinalResult) {
      this.onFinalResult(data);
    }
  }

  /**
   * Emit error
   */
  emitError(error) {
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Emit status change
   */
  emitStatus(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
}

/**
 * Web Speech API Provider
 * Uses browser's built-in Web Speech API (free, manual speaker tagging)
 */
class WebSpeechProvider extends BaseTranscriptionProvider {
  constructor(config = {}) {
    super(config);
    this.recognition = null;
    this.lang = config.lang || 'en-US';
    this.continuous = config.continuous !== false;
    this.interimResults = config.interimResults !== false;
  }

  /**
   * Check if Web Speech API is available
   */
  isAvailable() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize speech recognition
   */
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!this.isAvailable()) {
      throw new Error('Web Speech API not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.lang;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.emitStatus('recording');
      console.log('Web Speech API: Recognition started');
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

      // Emit interim results
      if (interimTranscript) {
        this.emitInterimResult({
          text: interimTranscript,
          provider: 'web-speech',
          timestamp: Date.now()
        });
      }

      // Emit final results
      if (finalTranscript) {
        this.emitFinalResult({
          text: finalTranscript.trim(),
          provider: 'web-speech',
          timestamp: Date.now()
        });
      }

      console.log('Web Speech API: Final:', finalTranscript, 'Interim:', interimTranscript);
    };

    this.recognition.onerror = (event) => {
      console.error('Web Speech API error:', event.error);
      this.emitError({ type: event.error, message: this.getErrorMessage(event.error) });

      if (event.error === 'not-allowed') {
        this.stop();
      } else if (event.error === 'no-speech') {
        // Don't stop on no-speech, just log
        console.log('Web Speech API: No speech detected');
      } else if (event.error === 'audio-capture') {
        this.stop();
      }
    };

    this.recognition.onend = () => {
      console.log('Web Speech API: Recognition ended');

      // Auto-restart if we're still supposed to be recording
      if (this.isRecording) {
        console.log('Web Speech API: Restarting recognition...');
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Web Speech API: Error restarting:', error);
          this.isRecording = false;
          this.emitStatus('stopped');
          this.emitError({ type: 'restart-failed', message: error.message });
        }
      } else {
        this.emitStatus('stopped');
      }
    };
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
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
  async start() {
    if (this.isRecording) {
      console.log('Web Speech API: Already recording');
      return false;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Web Speech API: Error starting:', error);
      this.emitError({ type: 'start-failed', message: error.message });
      return false;
    }
  }

  /**
   * Stop recording
   */
  async stop() {
    if (!this.isRecording || !this.recognition) {
      console.log('Web Speech API: Not recording');
      return false;
    }

    try {
      this.isRecording = false; // Prevent auto-restart
      this.recognition.stop();
      return true;
    } catch (error) {
      console.error('Web Speech API: Error stopping:', error);
      this.emitError({ type: 'stop-failed', message: error.message });
      return false;
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.recognition) {
      this.isRecording = false;
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }
  }
}

/**
 * Deepgram Provider
 * Uses Deepgram API for transcription with automatic speaker detection (paid)
 */
class DeepgramProvider extends BaseTranscriptionProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.model = config.model || 'nova-2';
    this.language = config.language || 'en-US';
    this.smartFormat = config.smartFormat !== false;
    this.detectSpeaker = config.detectSpeaker !== false;
    this.maxSpeakers = config.maxSpeakers || 10;
    this.speakerConfidence = config.speakerConfidence || 0.5;

    this.socket = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Check if Deepgram API key is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Create WebSocket connection to Deepgram
   */
  createWebSocket() {
    const url = new URL('wss://api.deepgram.com/v1/listen');
    url.searchParams.set('model', this.model);
    url.searchParams.set('language', this.language);
    url.searchParams.set('smart_format', this.smartFormat.toString());

    if (this.detectSpeaker) {
      url.searchParams.set('diarize', 'true');
      url.searchParams.set('diarize_version', '2');
      url.searchParams.set('num_speakers', this.maxSpeakers.toString());
    }

    url.searchParams.set('interim_results', 'true');
    url.searchParams.set('filler_words', 'false');

    this.socket = new WebSocket(url.href, ['token', this.apiKey]);

    this.socket.onopen = () => {
      console.log('Deepgram: WebSocket connected');
      this.isRecording = true;
      this.emitStatus('recording');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onerror = (error) => {
      console.error('Deepgram: WebSocket error:', error);
      this.emitError({ type: 'websocket-error', message: 'WebSocket connection error' });
    };

    this.socket.onclose = (event) => {
      console.log('Deepgram: WebSocket closed:', event.code, event.reason);

      if (this.isRecording) {
        // Unexpected close
        this.emitError({ type: 'connection-lost', message: 'Connection to Deepgram lost' });
        this.isRecording = false;
        this.emitStatus('stopped');
      } else {
        this.emitStatus('stopped');
      }
    };
  }

  /**
   * Handle message from Deepgram
   */
  handleMessage(data) {
    if (data.speech_started) {
      console.log('Deepgram: Speech started');
    }

    if (data.speech_final) {
      console.log('Deepgram: Speech finalized');
    }

    if (data.channel && data.channel.alternatives) {
      const alternative = data.channel.alternatives[0];

      if (alternative.words) {
        // Process word-level results for speaker diarization
        const words = alternative.words;

        // Check if this is a final or interim result
        const isFinal = data.is_final === true;

        // Group words by speaker
        const speakerSegments = this.groupWordsBySpeaker(words);

        speakerSegments.forEach(segment => {
          const resultData = {
            text: segment.text,
            provider: 'deepgram',
            timestamp: Date.now(),
            isInterim: !isFinal
          };

          // Add speaker information if available
          if (this.detectSpeaker && segment.speaker !== null) {
            resultData.speaker = {
              id: `speaker_${segment.speaker}`,
              number: segment.speaker,
              confidence: segment.confidence || 1.0
            };
          }

          if (isFinal) {
            this.emitFinalResult(resultData);
          } else {
            this.emitInterimResult(resultData);
          }
        });
      }
    }
  }

  /**
   * Group words by speaker
   */
  groupWordsBySpeaker(words) {
    const segments = [];
    let currentSegment = null;

    words.forEach(word => {
      const speaker = this.detectSpeaker ? word.speaker : 0;
      const confidence = word.confidence || 1.0;

      if (!currentSegment ||
          currentSegment.speaker !== speaker ||
          currentSegment.confidence < this.speakerConfidence) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment);
        }

        currentSegment = {
          speaker: speaker,
          confidence: confidence,
          text: word.word + (word.punctuated_word !== word.word ? word.punctuated_word.substring(word.word.length) : ''),
          startTime: word.start,
          endTime: word.end
        };
      } else {
        // Append to current segment
        const punctuation = word.punctuated_word !== word.word ?
          word.punctuated_word.substring(word.word.length) : '';
        currentSegment.text += ' ' + word.word + punctuation;
        currentSegment.endTime = word.end;
      }
    });

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Start media recording
   */
  async startMediaRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start(250); // Send data every 250ms
      console.log('Deepgram: Media recording started');
    } catch (error) {
      console.error('Deepgram: Error starting media recording:', error);
      this.emitError({ type: 'mic-error', message: error.message });
      throw error;
    }
  }

  /**
   * Start recording
   */
  async start() {
    if (this.isRecording) {
      console.log('Deepgram: Already recording');
      return false;
    }

    if (!this.apiKey) {
      this.emitError({ type: 'no-api-key', message: 'Deepgram API key not configured' });
      return false;
    }

    try {
      this.createWebSocket();
      await this.startMediaRecording();
      return true;
    } catch (error) {
      console.error('Deepgram: Error starting:', error);
      return false;
    }
  }

  /**
   * Stop recording
   */
  async stop() {
    if (!this.isRecording) {
      console.log('Deepgram: Not recording');
      return false;
    }

    try {
      this.isRecording = false;

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }

      return true;
    } catch (error) {
      console.error('Deepgram: Error stopping:', error);
      this.emitError({ type: 'stop-failed', message: error.message });
      return false;
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    this.socket = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

/**
 * Provider Factory
 * Creates transcription provider instances based on configuration
 */
function createTranscriptionProvider(type, config = {}) {
  switch (type) {
    case 'web-speech':
      return new WebSpeechProvider(config);
    case 'deepgram':
      return new DeepgramProvider(config);
    default:
      throw new Error(`Unknown transcription provider type: ${type}`);
  }
}

/**
 * Fallback Provider Wrapper
 * Automatically falls back to Web Speech API if primary provider fails
 */
class FallbackProvider extends BaseTranscriptionProvider {
  constructor(primaryProvider, fallbackProvider) {
    super();
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
    this.currentProvider = null;
    this.fallbackTriggered = false;

    // Forward events from current provider
    this.setupProviderForwarding();
  }

  setupProviderForwarding() {
    const forwardEvents = (provider) => {
      provider.setHandlers({
        onInterimResult: (data) => this.emitInterimResult({ ...data, fallback: this.fallbackTriggered }),
        onFinalResult: (data) => this.emitFinalResult({ ...data, fallback: this.fallbackTriggered }),
        onError: (error) => this.handleProviderError(error),
        onStatusChange: (status) => this.emitStatus(status)
      });
    };

    forwardEvents(this.primaryProvider);
    forwardEvents(this.fallbackProvider);
  }

  handleProviderError(error) {
    console.error('Provider error:', error);

    // If primary provider fails and hasn't triggered fallback yet
    if (this.currentProvider === this.primaryProvider && !this.fallbackTriggered) {
      const shouldFallback = error.type === 'no-api-key' ||
                            error.type === 'websocket-error' ||
                            error.type === 'connection-lost';

      if (shouldFallback) {
        console.log('Falling back to Web Speech API');
        this.fallbackTriggered = true;
        this.currentProvider = this.fallbackProvider;
        this.emitError({ type: 'fallback-triggered', message: 'Falling back to free transcription mode' });

        // Start fallback provider
        this.fallbackProvider.start();
        return;
      }
    }

    this.emitError(error);
  }

  async start() {
    this.currentProvider = this.primaryProvider;
    this.fallbackTriggered = false;

    // Check if primary provider is available
    if (this.primaryProvider.isAvailable()) {
      return await this.primaryProvider.start();
    } else {
      // Primary not available, use fallback immediately
      this.fallbackTriggered = true;
      this.currentProvider = this.fallbackProvider;
      return await this.fallbackProvider.start();
    }
  }

  async stop() {
    if (this.currentProvider) {
      return await this.currentProvider.stop();
    }
    return false;
  }

  isAvailable() {
    return this.primaryProvider.isAvailable() || this.fallbackProvider.isAvailable();
  }

  destroy() {
    this.primaryProvider.destroy();
    this.fallbackProvider.destroy();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BaseTranscriptionProvider,
    WebSpeechProvider,
    DeepgramProvider,
    createTranscriptionProvider,
    FallbackProvider
  };
}
