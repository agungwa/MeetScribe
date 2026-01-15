// Content script for MeetScribe
// Handles audio capture and transcription using Web Speech API

let recognition = null;
let isRecording = false;

console.log('MeetScribe content script loaded');

// Initialize speech recognition
function initSpeechRecognition() {
  // Check for browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('Speech recognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    console.log('Speech recognition started');
    isRecording = true;
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Send final transcripts to popup
    if (finalTranscript) {
      sendTranscriptionUpdate(finalTranscript.trim());
    }

    console.log('Final:', finalTranscript);
    console.log('Interim:', interimTranscript);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);

    if (event.error === 'not-allowed') {
      alert('Microphone permission denied. Please allow microphone access and try again.');
      stopRecording();
    } else if (event.error === 'no-speech') {
      console.log('No speech detected');
      // Don't stop recording, just log it
    } else if (event.error === 'audio-capture') {
      alert('No microphone device found. Please connect a microphone and try again.');
      stopRecording();
    }
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    isRecording = false;

    // Auto-restart if we're still supposed to be recording
    // This handles cases where the browser stops recognition automatically
    if (isRecording) {
      console.log('Restarting speech recognition...');
      try {
        recognition.start();
      } catch (error) {
        console.error('Error restarting recognition:', error);
        isRecording = false;
      }
    }
  };

  return recognition;
}

function sendTranscriptionUpdate(text) {
  // Send message to popup via background script
  chrome.runtime.sendMessage({
    action: 'TRANSCRIPTION_UPDATE',
    text: text
  }).catch(error => {
    console.error('Error sending transcription update:', error);
  });
}

function startRecording() {
  if (isRecording) {
    console.log('Already recording');
    return { success: false, message: 'Already recording' };
  }

  if (!recognition) {
    recognition = initSpeechRecognition();
    if (!recognition) {
      return {
        success: false,
        message: 'Speech recognition not supported. Please use Chrome browser.'
      };
    }
  }

  try {
    recognition.start();
    return { success: true };
  } catch (error) {
    console.error('Error starting recognition:', error);
    return { success: false, message: error.message };
  }
}

function stopRecording() {
  if (!isRecording || !recognition) {
    console.log('Not recording');
    return { success: false, message: 'Not recording' };
  }

  try {
    isRecording = false; // Prevent auto-restart
    recognition.stop();
    return { success: true };
  } catch (error) {
    console.error('Error stopping recognition:', error);
    return { success: false, message: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);

  if (message.action === 'START_RECORDING') {
    const result = startRecording();
    sendResponse(result);
  } else if (message.action === 'STOP_RECORDING') {
    const result = stopRecording();
    sendResponse(result);
  }

  return true; // Required for async response
});

// Initialize on load
console.log('Speech Recognition API available:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  if (recognition && isRecording) {
    recognition.stop();
  }
});
