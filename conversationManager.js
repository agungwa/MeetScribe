/**
 * Conversation Manager Module
 * Handles session state, turn tracking, and multiple view formats
 */

class ConversationManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> ConversationSession
    this.currentSessionId = null;
    this.sessionCounter = 0;
  }

  /**
   * Initialize conversation manager from storage
   */
  async initialize() {
    try {
      const result = await chrome.storage.local.get(['sessions', 'currentSessionId', 'sessionCounter']);
      if (result.sessions) {
        result.sessions.forEach(session => {
          this.sessions.set(session.id, session);
        });
      }
      this.currentSessionId = result.currentSessionId || null;
      this.sessionCounter = result.sessionCounter || 0;
    } catch (error) {
      console.error('Error initializing conversation manager:', error);
    }
  }

  /**
   * Save sessions to storage
   */
  async save() {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      await chrome.storage.local.set({
        sessions: sessionsArray,
        currentSessionId: this.currentSessionId,
        sessionCounter: this.sessionCounter
      });
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  /**
   * Create a new session
   */
  createSession(options = {}) {
    const sessionId = options.sessionId || `session_${Date.now()}_${this.sessionCounter++}`;
    const session = {
      id: sessionId,
      mode: options.mode || 'web-speech', // 'web-speech' or 'deepgram'
      speakers: new Map(), // Will be populated with Speaker objects
      turns: [],
      startTime: Date.now(),
      endTime: null,
      metadata: options.metadata || {}
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    return session;
  }

  /**
   * Get the current session
   */
  getCurrentSession() {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId);
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Add a turn to the current session
   */
  addTurn(turn) {
    const session = this.getCurrentSession();
    if (!session) {
      console.warn('No current session to add turn to');
      return null;
    }

    const turnWithTimestamp = {
      ...turn,
      timestamp: turn.timestamp || Date.now()
    };

    session.turns.push(turnWithTimestamp);
    return turnWithTimestamp;
  }

  /**
   * Update the last turn (for interim results)
   */
  updateLastTurn(updates) {
    const session = this.getCurrentSession();
    if (!session || session.turns.length === 0) return null;

    const lastIndex = session.turns.length - 1;
    const lastTurn = session.turns[lastIndex];
    session.turns[lastIndex] = { ...lastTurn, ...updates };

    return session.turns[lastIndex];
  }

  /**
   * Remove the last turn (for interim results that don't finalize)
   */
  removeLastTurn() {
    const session = this.getCurrentSession();
    if (!session || session.turns.length === 0) return null;

    return session.turns.pop();
  }

  /**
   * End the current session
   */
  endCurrentSession() {
    const session = this.getCurrentSession();
    if (!session) return null;

    session.endTime = Date.now();
    this.currentSessionId = null;
    return session;
  }

  /**
   * Clear the current session
   */
  clearCurrentSession() {
    const session = this.getCurrentSession();
    if (!session) return;

    session.turns = [];
    session.startTime = Date.now();
    session.endTime = null;
  }

  /**
   * Get all turns from the current session
   */
  getCurrentTurns() {
    const session = this.getCurrentSession();
    if (!session) return [];
    return session.turns;
  }

  /**
   * Get turns in turn-by-turn format (default)
   */
  getTurnByTurnView() {
    return this.getCurrentTurns();
  }

  /**
   * Get turns grouped by speaker
   */
  getGroupedBySpeakerView() {
    const turns = this.getCurrentTurns();
    const grouped = new Map();

    turns.forEach(turn => {
      if (!grouped.has(turn.speakerId)) {
        grouped.set(turn.speakerId, {
          speakerId: turn.speakerId,
          turns: [],
          text: ''
        });
      }

      const speakerGroup = grouped.get(turn.speakerId);
      speakerGroup.turns.push(turn);
      speakerGroup.text += (speakerGroup.text ? ' ' : '') + turn.text;
    });

    return Array.from(grouped.values());
  }

  /**
   * Get turns in flat format (speaker-prefixed text)
   */
  getFlatView(speakerManager) {
    const turns = this.getCurrentTurns();
    const flatText = turns.map(turn => {
      const speaker = speakerManager ? speakerManager.getSpeaker(turn.speakerId) : null;
      const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
      return `[${speakerName}]: ${turn.text}`;
    }).join('\n\n');

    return flatText;
  }

  /**
   * Get formatted transcription based on view mode
   */
  getFormattedTranscription(viewMode, speakerManager) {
    switch (viewMode) {
      case 'turn-by-turn':
        return this.getTurnByTurnView();
      case 'grouped':
        return this.getGroupedBySpeakerView();
      case 'flat':
        return this.getFlatView(speakerManager);
      default:
        return this.getTurnByTurnView();
    }
  }

  /**
   * Get character count for current session
   */
  getCharacterCount() {
    const turns = this.getCurrentTurns();
    return turns.reduce((count, turn) => {
      if (!turn.isInterim) {
        return count + turn.text.length;
      }
      return count;
    }, 0);
  }

  /**
   * Get character count per speaker
   */
  getCharacterCountBySpeaker() {
    const turns = this.getCurrentTurns();
    const counts = new Map();

    turns.forEach(turn => {
      if (!turn.isInterim) {
        const currentCount = counts.get(turn.speakerId) || 0;
        counts.set(turn.speakerId, currentCount + turn.text.length);
      }
    });

    return counts;
  }

  /**
   * Export current session to JSON
   */
  exportToJSON(speakerManager) {
    const session = this.getCurrentSession();
    if (!session) return null;

    const speakers = speakerManager ? speakerManager.getAllSpeakers() : [];

    return JSON.stringify({
      sessionId: session.id,
      mode: session.mode,
      startTime: session.startTime,
      endTime: session.endTime,
      speakers: speakers,
      turns: session.turns,
      metadata: session.metadata
    }, null, 2);
  }

  /**
   * Export current session to plain text
   */
  exportToText(speakerManager, format = 'flat') {
    const session = this.getCurrentSession();
    if (!session) return '';

    const speakers = speakerManager ? speakerManager.getAllSpeakers() : [];
    const speakerMap = new Map(speakers.map(s => [s.id, s]));

    let text = '';

    if (format === 'flat') {
      text = session.turns.map(turn => {
        const speaker = speakerMap.get(turn.speakerId);
        const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
        const timestamp = new Date(turn.timestamp).toLocaleTimeString();
        return `[${timestamp}] [${speakerName}]: ${turn.text}`;
      }).join('\n\n');
    } else if (format === 'grouped') {
      const grouped = this.getGroupedBySpeakerView();
      text = grouped.map(group => {
        const speaker = speakerMap.get(group.speakerId);
        const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
        return `[${speakerName}]:\n${group.text}`;
      }).join('\n\n---\n\n');
    } else {
      // turn-by-turn
      text = session.turns.map(turn => {
        const speaker = speakerMap.get(turn.speakerId);
        const speakerName = speaker ? (speaker.customName || speaker.name) : 'Unknown';
        const timestamp = new Date(turn.timestamp).toLocaleTimeString();
        return `[${timestamp}] [${speakerName}]: ${turn.text}`;
      }).join('\n\n');
    }

    // Add header
    const header = `MeetScribe Transcription
Session: ${session.id}
Mode: ${session.mode}
Start Time: ${new Date(session.startTime).toLocaleString()}
${session.endTime ? `End Time: ${new Date(session.endTime).toLocaleString()}` : 'End Time: In Progress'}
${speakers.length} Speakers

---

`;

    return header + text;
  }

  /**
   * Reset all sessions
   */
  reset() {
    this.sessions.clear();
    this.currentSessionId = null;
    this.sessionCounter = 0;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId) {
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
    }
    return this.sessions.delete(sessionId);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConversationManager;
}
