/**
 * Speaker Manager Module
 * Handles speaker detection, identification, and metadata management
 */

class SpeakerManager {
  constructor() {
    this.speakers = new Map(); // speakerId -> Speaker object
    this.currentSpeakerId = null;
    this.speakerCounter = 0;
    this.colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#ff9a9e', '#fecfef',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    this.colorIndex = 0;
  }

  /**
   * Initialize speaker manager from storage
   */
  async initialize() {
    try {
      const result = await chrome.storage.local.get(['speakers', 'currentSpeakerId', 'speakerCounter']);
      if (result.speakers) {
        result.speakers.forEach(speaker => {
          this.speakers.set(speaker.id, speaker);
        });
      }
      this.currentSpeakerId = result.currentSpeakerId || null;
      this.speakerCounter = result.speakerCounter || 0;
    } catch (error) {
      console.error('Error initializing speaker manager:', error);
    }
  }

  /**
   * Save speakers to storage
   */
  async save() {
    try {
      const speakersArray = Array.from(this.speakers.values());
      await chrome.storage.local.set({
        speakers: speakersArray,
        currentSpeakerId: this.currentSpeakerId,
        speakerCounter: this.speakerCounter
      });
    } catch (error) {
      console.error('Error saving speakers:', error);
    }
  }

  /**
   * Get the next available color
   */
  getNextColor() {
    const color = this.colors[this.colorIndex % this.colors.length];
    this.colorIndex++;
    return color;
  }

  /**
   * Create a new speaker
   */
  createSpeaker(options = {}) {
    const speakerId = options.speakerId || `speaker_${Date.now()}_${this.speakerCounter++}`;
    const speaker = {
      id: speakerId,
      name: options.name || `Speaker ${this.speakers.size + 1}`,
      color: options.color || this.getNextColor(),
      customName: options.customName || null,
      detectedName: options.detectedName || null,
      confidence: options.confidence || 1.0,
      turnCount: 0,
      createdAt: Date.now()
    };

    this.speakers.set(speakerId, speaker);
    return speaker;
  }

  /**
   * Get a speaker by ID
   */
  getSpeaker(speakerId) {
    return this.speakers.get(speakerId);
  }

  /**
   * Get all speakers
   */
  getAllSpeakers() {
    return Array.from(this.speakers.values());
  }

  /**
   * Update a speaker
   */
  updateSpeaker(speakerId, updates) {
    const speaker = this.speakers.get(speakerId);
    if (!speaker) return null;

    const updated = { ...speaker, ...updates };
    this.speakers.set(speakerId, updated);
    return updated;
  }

  /**
   * Delete a speaker
   */
  deleteSpeaker(speakerId) {
    return this.speakers.delete(speakerId);
  }

  /**
   * Merge two speakers
   */
  mergeSpeakers(fromSpeakerId, toSpeakerId) {
    const fromSpeaker = this.speakers.get(fromSpeakerId);
    const toSpeaker = this.speakers.get(toSpeakerId);

    if (!fromSpeaker || !toSpeaker) return false;

    // Update turn count
    toSpeaker.turnCount += fromSpeaker.turnCount;

    // Delete the old speaker
    this.speakers.delete(fromSpeakerId);

    return true;
  }

  /**
   * Set the current speaker
   */
  setCurrentSpeaker(speakerId) {
    this.currentSpeakerId = speakerId;
  }

  /**
   * Get the current speaker
   */
  getCurrentSpeaker() {
    if (!this.currentSpeakerId) return null;
    return this.speakers.get(this.currentSpeakerId);
  }

  /**
   * Get or create a speaker for a transcription
   * For manual mode: uses current speaker or creates new one
   * For auto mode: matches by detected name or creates new one
   */
  getOrCreateSpeaker(options = {}) {
    let speaker;

    // If a specific speaker ID is provided, use it
    if (options.speakerId) {
      speaker = this.speakers.get(options.speakerId);
      if (speaker) return speaker;
    }

    // For automatic detection, try to match by detected name
    if (options.detectedName && options.mode === 'deepgram') {
      speaker = this.findSpeakerByDetectedName(options.detectedName);
      if (speaker) {
        // Update confidence
        this.updateSpeaker(speaker.id, { confidence: options.confidence || 1.0 });
        return speaker;
      }
    }

    // Create new speaker
    speaker = this.createSpeaker({
      name: options.name || undefined,
      detectedName: options.detectedName || undefined,
      confidence: options.confidence || 1.0
    });

    return speaker;
  }

  /**
   * Find a speaker by detected name
   */
  findSpeakerByDetectedName(detectedName) {
    for (const speaker of this.speakers.values()) {
      if (speaker.detectedName === detectedName) {
        return speaker;
      }
    }
    return null;
  }

  /**
   * Increment turn count for a speaker
   */
  incrementTurnCount(speakerId) {
    const speaker = this.speakers.get(speakerId);
    if (speaker) {
      speaker.turnCount++;
    }
  }

  /**
   * Reset all speakers
   */
  reset() {
    this.speakers.clear();
    this.currentSpeakerId = null;
    this.speakerCounter = 0;
    this.colorIndex = 0;
  }

  /**
   * Export speakers data
   */
  export() {
    return {
      speakers: Array.from(this.speakers.values()),
      currentSpeakerId: this.currentSpeakerId,
      speakerCounter: this.speakerCounter
    };
  }

  /**
   * Import speakers data
   */
  import(data) {
    if (!data) return;

    if (data.speakers) {
      this.speakers.clear();
      data.speakers.forEach(speaker => {
        this.speakers.set(speaker.id, speaker);
      });
    }

    if (data.currentSpeakerId) {
      this.currentSpeakerId = data.currentSpeakerId;
    }

    if (data.speakerCounter !== undefined) {
      this.speakerCounter = data.speakerCounter;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpeakerManager;
}
