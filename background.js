// Background service worker for MeetScribe extension

console.log('MeetScribe background service worker initialized');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default settings
    chrome.storage.local.set({
      apiKey: '',
      customPrompt: '',
      model: 'gemini-2.0-flash'
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);

  // Forward messages between popup and content script
  if (message.action === 'START_RECORDING' || message.action === 'STOP_RECORDING') {
    // These are handled by popup.js directly sending to content script
    // Background just logs for debugging
    console.log('Recording action:', message.action);
  }

  return true; // Required for async response
});

// Handle browser action click (alternative to opening popup)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  // Popup opens automatically, this is just for logging
});

// Keep service worker alive (prevent sleep mode)
let keepAliveInterval;

function keepAlive() {
  if (keepAliveInterval) return;

  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker alive
    });
  }, 20 * 1000); // Every 20 seconds
}

// Start keep-alive when extension starts
keepAlive();

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});
