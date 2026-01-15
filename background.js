// Background service worker for MeetScribe extension

console.log('MeetScribe background service worker initialized');

// Cache display mode to avoid storage calls during user gesture
let cachedDisplayMode = 'sidepanel';

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default settings
    chrome.storage.local.set({
      displayMode: 'sidepanel', // Default to side panel mode
      apiKey: '',
      customPrompt: '',
      model: 'gemini-2.0-flash'
    });
    // Cache the default mode
    cachedDisplayMode = 'sidepanel';
  } else if (details.reason === 'update') {
    console.log('Extension updated');
    // Load and cache current display mode
    chrome.storage.local.get('displayMode', (result) => {
      cachedDisplayMode = result.displayMode || 'sidepanel';
    });
  }
});

// Watch for settings changes to update cache
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.displayMode) {
    cachedDisplayMode = changes.displayMode.newValue || 'sidepanel';
    console.log('Display mode updated:', cachedDisplayMode);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message) => {
  console.log('Background received message:', message.action);

  // Forward messages between popup and content script
  if (message.action === 'START_RECORDING' || message.action === 'STOP_RECORDING') {
    // These are handled by popup.js directly sending to content script
    // Background just logs for debugging
    console.log('Recording action:', message.action);
  }

  return true; // Required for async response
});

// Handle extension icon click based on display mode
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, mode:', cachedDisplayMode);

  if (cachedDisplayMode === 'sidepanel') {
    // Open the side panel
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
      console.error('Error opening side panel:', error);
    });
  } else {
    // Popup mode - manually open the popup
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.error('Error opening popup:', error);
    }
  }
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
