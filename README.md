# MeetScribe - AI Meeting Assistant

A Chrome extension that provides real-time meeting transcription with AI-powered answer recommendations using Google's Gemini AI.

## Features

- **Real-time Transcription**: Captures audio from your browser tab and transcribes it live using the Web Speech API
  - See interim results as you speak (gray italic text)
  - Final transcription appears in black when confirmed
  - Character counter shows transcription length
- **AI-Powered Recommendations**: Get intelligent answer suggestions based on meeting context using Gemini AI
  - One-click generation from your transcription
  - Copy recommendations to clipboard
- **Dual Display Modes**: Choose how MeetScribe appears
  - **Side Panel** (default): Persistent sidebar that doesn't block your meeting content
  - **Popup**: Traditional extension popup for quick access
  - Switch between modes anytime in Settings
- **Customizable Prompts**: Configure custom system prompts or use the built-in default
- **Multiple AI Models**: Choose between Gemini 2.0 Flash, 2.5 Flash, or 2.5 Pro
- **Privacy-First**: Transcription happens locally, only the text is sent to Gemini API
- **User-Friendly Interface**: Clean, tabbed interface for transcription and settings

## Prerequisites

- Google Chrome browser (version 88 or higher)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Microphone access permission

## Installation

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (it starts with `AIza`)

**Note**: Gemini API offers free tier usage. Check [Google's pricing page](https://ai.google.dev/pricing) for current limits.

### Step 2: Load the Extension

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `meetscribe` folder (or `gc-meeting` if you haven't renamed it) containing the extension files
6. The extension icon will appear in your browser toolbar

### Step 3: Configure the Extension

1. Click the extension icon in your browser toolbar
2. Go to the **Settings** tab
3. Choose your **Interface Mode** (Side Panel or Popup)
   - **Side Panel** (recommended): Stays open while you work, doesn't block meeting content
   - **Popup**: Traditional popup that closes when you click away
4. Paste your Gemini API key
5. Optionally, add a custom system prompt (or leave empty for default)
6. Select your preferred AI model (default: Gemini 2.0 Flash)
7. Click **Save Settings**

## Usage

### Display Modes

#### Side Panel Mode (Default)
Perfect for meetings and long sessions:
- Click extension icon → Side panel opens on the right
- Panel stays open as you browse and work
- Doesn't cover your meeting content
- Full access to all features (transcription, AI, settings)

#### Popup Mode
Good for quick checks and configuration:
- Click extension icon → Popup appears
- Popup closes when you click away
- Same great features in a compact format

**To switch modes**: Go to Settings → Select "Interface Mode" → Confirm

### Transcribing Meetings

### Starting a Transcription

1. Open a meeting or any webpage with audio
2. Click the extension icon
3. Click **Start Recording**
4. Grant microphone permission if prompted
5. Speak or play audio - transcription will appear in real-time

### Getting AI Recommendations

1. Ensure you have some transcription text
2. Click **Generate Answer** button
3. The AI will analyze the transcription and provide suggestions
4. Copy the recommendation as needed

### Managing Transcriptions

- **Stop Recording**: Click the Stop button to pause transcription
- **Clear**: Click the Clear button to remove the current transcription
- **Copy**: Click the copy icon to copy the transcription to clipboard

## Customization

### Custom Prompts

You can customize how the AI responds by setting a custom system prompt:

1. Go to **Settings** tab
2. In the "Custom System Prompt" field, enter your prompt
3. Use `{transcription}` as a placeholder for the meeting text

**Example Custom Prompt**:
```
You are a technical meeting assistant. Based on the following transcription, summarize the key technical decisions made and identify any action items.

Meeting Transcription:
{transcription}

Summary:
```

If you leave the custom prompt empty, the extension uses a default prompt optimized for general meeting assistance.

### AI Models

- **Gemini 2.0 Flash** (default): Fast responses, good for real-time use
- **Gemini 2.5 Flash**: Latest Flash model, improved performance
- **Gemini 2.5 Pro**: Highest quality responses
- **gemini-flash-latest**: Always uses the latest Flash model

## Troubleshooting

### "Speech recognition not supported"
- Ensure you're using Chrome browser (not Safari, Firefox, etc.)
- Update Chrome to the latest version

### "Microphone permission denied"
- Click the lock icon in your browser's address bar
- Allow microphone access for the current site
- Refresh the page and try again

### "Invalid API Key" error
- Verify your API key is correct
- Ensure the key starts with `AIza`
- Check that the key hasn't expired or been revoked

### Transcription is inaccurate
- Speak clearly and at a moderate pace
- Minimize background noise
- Ensure your microphone is working properly
- Try moving closer to the microphone

### "API rate limit exceeded"
- Wait a few moments before trying again
- Consider upgrading to a paid Gemini API tier for higher limits

### No transcription appearing
- Check that microphone permissions are granted
- Ensure the page is not muted
- Try refreshing the page and starting recording again

## Project Structure

```
meetscribe/
├── manifest.json              # Extension configuration
├── popup.html                 # Popup UI (compact interface)
├── popup.css                  # Popup styling
├── popup.js                   # Popup logic and API calls
├── sidepanel.html             # Side panel UI (persistent sidebar)
├── sidepanel.css              # Side panel styling
├── sidepanel.js               # Side panel logic
├── background.js              # Service worker (handles display mode)
├── content.js                 # Audio capture and transcription
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── generate-icons.html    # Icon generator tool
├── openspec/                  # Specification documentation
│   └── changes/
│       └── add-meeting-transcriber-extension/
└── README.md                  # This file
```

## Development

### Generating Icons

The extension includes an icon generator tool:

1. Open `icons/generate-icons.html` in your browser
2. The icons will be automatically downloaded as PNG files
3. Replace the placeholder icons in the `icons/` directory

### Modifying the Extension

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Meeting Transcriber extension card
4. Test your changes

## Privacy & Security

- **Local Processing**: Audio transcription happens entirely in your browser using the Web Speech API
- **No Audio Storage**: Raw audio is never stored or transmitted
- **Secure Storage**: API keys are stored using Chrome's storage API (not localStorage)
- **HTTPS Only**: All API calls use HTTPS encryption
- **Minimal Data**: Only transcription text is sent to Gemini API

## Known Limitations

- **Browser Support**: Currently works best in Chrome (Web Speech API limitations in other browsers)
- **Language**: Default transcription is English only
- **Session-Based**: Transcription is not saved between sessions (cleared when extension closes)
- **Audio Quality**: Accuracy depends on microphone quality and background noise

## Future Enhancements

Potential features for future versions:

- Multi-language transcription support
- Transcription history and export
- Integration with calendar apps
- Meeting summaries and action item extraction
- Cloud storage sync for settings
- Support for more browsers

## API Usage & Costs

This extension uses Google's Gemini API which offers:
- **Free Tier**: Generous limits for development and personal use
- **Pay-as-you-go**: For heavier usage

Check the [Gemini API pricing](https://ai.google.dev/pricing) for current rates.

**Cost-Saving Tips**:
- Use Gemini 2.0 Flash for faster, cheaper responses
- Generate answers only when needed (not automatically)
- Keep transcriptions focused on key discussion points

## License

This project is provided as-is for personal and educational use.

## Support

For issues, questions, or contributions:
1. Check the Troubleshooting section above
2. Review the OpenSpec documentation in `openspec/changes/add-meeting-transcriber-extension/`
3. Consult Chrome Extension documentation for platform-specific issues

## Changelog

### Version 1.0.0
- Initial release
- Real-time transcription using Web Speech API with interim results
- Gemini AI integration for answer recommendations
- Dual display modes: Side Panel (default) and Popup
- Custom prompt support with fallback to default
- Multiple AI model selection (2.0 Flash, 2.5 Flash, 2.5 Pro, Flash Latest)
- Settings persistence with chrome.storage
- Character counter for transcription
- Enhanced error messages with actionable suggestions
- Copy buttons for transcription and AI recommendations

## FAQ

### Which display mode should I use?

**Side Panel (Recommended for meetings)**:
- ✅ Stays open while you work
- ✅ Doesn't block meeting content
- ✅ Perfect for long meetings
- ✅ Always accessible

**Popup (Good for quick tasks)**:
- ✅ Compact and unobtrusive
- ✅ Quick access to settings
- ✅ Good for short sessions
- ⚠️ Closes when you click away

### Can I switch between modes?

Yes! Go to Settings → Select "Interface Mode" → Confirm. Your choice is saved and used every time you click the extension icon.

### Does Side Panel work with all websites?

Yes! Side Panel works with any website. It's particularly useful for:
- Google Meet, Zoom, Microsoft Teams
- YouTube videos and webinars
- Any page with audio you want to transcribe

### Why is my transcription gray/italic?

That's the interim (in-progress) transcription. The Web Speech API is still processing it. Once confirmed, it will turn black and become part of the final transcription.

### How do I close the Side Panel?

Click the X button in the top-right corner of the side panel, or use Chrome's side panel menu to close it.

### Why is Side Panel the default?

Side Panel provides a better meeting experience:
- Keeps transcription visible without blocking content
- You can see both the meeting and the AI suggestions
- More space for transcription text
- Feels like a native browser feature

---

**Made with ❤️ for better meetings**
