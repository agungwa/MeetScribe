# MeetScribe - AI Meeting Assistant with Multi-Speaker Support

A Chrome extension that provides real-time meeting transcription with AI-powered answer recommendations using Google's Gemini AI. Now with multi-speaker conversation support and flexible transcription modes.

## Features

### Core Features
- **Real-time Transcription**: Captures audio from your browser tab and transcribes it live
  - See interim results as you speak (gray italic text)
  - Final transcription appears when confirmed
  - Character counter shows transcription length
- **AI-Powered Recommendations**: Get intelligent answer suggestions based on meeting context using Gemini AI
  - One-click generation from your transcription
  - Copy recommendations to clipboard
- **Dual Display Modes**: Choose how MeetScribe appears
  - **Side Panel** (default): Persistent sidebar that doesn't block your meeting content
  - **Popup**: Traditional extension popup for quick access
- **Customizable Prompts**: Configure custom system prompts or use the built-in defaults
- **Multiple AI Models**: Choose between Gemini 2.0 Flash, 2.5 Flash, or 2.5 Pro
- **Privacy-First**: Transcription happens locally, only the text is sent to Gemini API

### NEW: Multi-Speaker Support
- **Speaker Identification**: Track multiple speakers in conversations
  - Manual speaker tagging with Web Speech API (free mode)
  - Automatic speaker detection with Deepgram (paid mode)
- **Speaker Management**:
  - Rename speakers for easy identification
  - Color-coded speaker bubbles
  - Track turn count per speaker
- **Multiple View Modes**:
  - **Turn-by-Turn**: See each conversation turn with speaker attribution
  - **Grouped by Speaker**: View all text from each speaker together
  - **Flat**: Simple speaker-prefixed text format
- **Export Functionality**: Save transcriptions as JSON or TXT with speaker data

### NEW: Flexible Transcription Modes
- **Web Speech API (Free)**
  - Uses browser's built-in speech recognition
  - Manual speaker assignment during transcription
  - No API costs
  - Works offline after initial load
- **Deepgram (Paid ~$0.24/hour)**
  - Professional-grade transcription
  - Automatic speaker detection (diarization)
  - Higher accuracy, especially for technical terms
  - Supports up to 10 speakers simultaneously
  - Fallback to Web Speech API if connection fails

### NEW: Enhanced AI Features
- **Dual AI Modes**:
  - **Manual**: Click to generate AI responses
  - **Auto**: Automatic generation based on triggers
- **Auto-Trigger Options**:
  - Time interval (e.g., every 60 seconds)
  - Turn count (e.g., every 5 conversation turns)
  - Speech pause (e.g., after 5 seconds of silence)
- **Multiple Recommendation Types**:
  - Answer suggestions
  - Meeting summary
  - Follow-up questions
  - Analysis
- **Custom Prompts per Type**: Configure different prompts for each recommendation type

## Prerequisites

- Google Chrome browser (version 88 or higher)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- (Optional) Deepgram API key for automatic speaker detection
- Microphone access permission

## Installation

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (it starts with `AIza`)

**Note**: Gemini API offers free tier usage. Check [Google's pricing page](https://ai.google.dev/pricing) for current limits.

### Step 2: (Optional) Get Deepgram API Key for Auto Speaker Detection

1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Sign up for a free account (includes $200 in free credit)
3. Create an API key
4. Copy your API key (it starts with `dg_`)

**Cost**: Approximately $0.24/hour for nova-2 model with speaker diarization.

### Step 3: Load the Extension

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `meetscribe` folder containing the extension files
6. The extension icon will appear in your browser toolbar

### Step 4: Configure the Extension

1. Click the extension icon in your browser toolbar
2. Go to the **Settings** tab
3. Choose your **Interface Mode** (Side Panel or Popup)
4. Paste your Gemini API key
5. (Optional) Select Transcription Mode:
   - **Web Speech API** (free, manual speaker tagging)
   - **Deepgram** (paid, automatic speaker detection) - requires Deepgram API key
6. (Optional) Configure AI Mode:
   - **Manual**: Click "Generate" to get AI suggestions
   - **Auto**: AI generates automatically based on triggers
7. Optionally, add custom prompts for different recommendation types
8. Select your preferred AI model (default: Gemini 2.0 Flash)
9. Click **Save Settings**

## Usage

### Transcribing Meetings

#### Starting a Transcription

1. Open a meeting or any webpage with audio
2. Click the extension icon
3. Select the current speaker from the dropdown (for Web Speech API mode)
4. Click **Start Recording**
5. Grant microphone permission if prompted
6. Speak or play audio - transcription will appear in real-time

#### Managing Speakers (Web Speech API Mode)

1. Use the "Current Speaker" dropdown to select who's speaking
2. Click "+" to add a new speaker
3. Click "Manage Speakers" to rename or delete speakers
4. Speaker names and colors persist across sessions

#### Managing Speakers (Deepgram Mode)

- Speakers are automatically detected and labeled (Speaker 1, Speaker 2, etc.)
- Go to "Manage Speakers" to rename detected speakers
- Colors are automatically assigned for visual distinction

### View Modes

Switch between three different views:

1. **Turn-by-Turn** (default): Each conversation turn with speaker bubble and color
2. **Grouped by Speaker**: All text from each speaker grouped together
3. **Flat**: Simple `[Speaker]: text` format

### Getting AI Recommendations

#### Manual Mode

1. Select a recommendation type (Answer, Summary, Follow-up, Analysis)
2. Click **Generate Answer** button
3. The AI analyzes the transcription and provides suggestions
4. Copy the recommendation as needed

#### Auto Mode

When auto mode is enabled, AI generates recommendations automatically based on your trigger settings:
- **Interval**: Every X seconds (configurable, minimum 30s)
- **Turn**: Every N conversation turns
- **Pause**: When speech pauses for 5+ seconds

Auto-AI status is shown above the recommendation section.

### Exporting Transcriptions

1. Click the **Export** button
2. Choose format:
   - **Plain Text (.txt)**: Human-readable text file
   - **JSON (.json)**: Structured data with speakers and metadata
3. For TXT, choose text format (flat, grouped, or turn-by-turn with timestamps)
4. Click **Export** to download

### Managing Transcriptions

- **Stop Recording**: Click the Stop button to pause transcription
- **Clear**: Click the Clear button to remove the current transcription
- **Copy**: Click the copy icon to copy the transcription to clipboard

## Customization

### Custom Prompts

You can customize prompts for each recommendation type:

1. Go to **Settings** tab
2. In the "Custom Prompts" section:
   - **Default System Prompt (Answer)**: For general answer suggestions
   - **Auto-AI Prompt**: For automatic AI generations
   - **Summary Prompt**: For meeting summaries
   - **Follow-up Questions Prompt**: For generating follow-up questions
3. Use `{transcription}` as a placeholder for the meeting text

**Example Custom Summary Prompt**:
```
Based on the following meeting transcription, provide:
1. A brief summary (2-3 sentences)
2. Key decisions made
3. Action items with owners (if mentioned)

Meeting Transcription:
{transcription}

Summary:
```

### AI Models

- **Gemini 2.0 Flash** (default): Fast responses, good for real-time use
- **Gemini 2.5 Flash**: Latest Flash model, improved performance
- **Gemini 2.5 Pro**: Highest quality responses
- **gemini-flash-latest**: Always uses the latest Flash model

## Troubleshooting

### "Speech recognition not supported"
- Ensure you're using Chrome browser
- Update Chrome to the latest version

### "Microphone permission denied"
- Click the lock icon in your browser's address bar
- Allow microphone access for the current site
- Refresh the page and try again

### Deepgram connection issues
- Check your Deepgram API key is valid
- Verify you have credit in your Deepgram account
- The extension will automatically fall back to Web Speech API

### "Invalid API Key" error (Gemini)
- Verify your API key is correct
- Ensure the key starts with `AIza`
- Check that the key hasn't expired or been revoked

### Transcription is inaccurate
- Speak clearly and at a moderate pace
- Minimize background noise
- Ensure your microphone is working properly
- Try Deepgram mode for higher accuracy

### "API rate limit exceeded" (Gemini)
- Wait a few moments before trying again
- Increase the auto-AI interval to reduce API calls
- Consider using manual mode instead of auto

### Speakers not detected (Deepgram mode)
- Ensure speakers are speaking clearly and distinctly
- Adjust the "Maximum Speakers" setting in configuration
- Check that your Deepgram account has speaker diarization enabled

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
├── speakerManager.js          # Speaker detection and metadata
├── conversationManager.js     # Session state management
├── transcriptionProviders.js  # Pluggable transcription backends
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

### Architecture

The extension uses a modular architecture with the following core modules:

- **speakerManager.js**: Handles speaker detection, identification, and metadata
- **conversationManager.js**: Manages session state, turn tracking, and view formats
- **transcriptionProviders.js**: Pluggable transcription backends (Web Speech API, Deepgram)

### Modifying the Extension

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the MeetScribe extension card
4. Test your changes

## Privacy & Security

- **Local Processing**: Audio transcription happens locally (Web Speech API) or securely (Deepgram)
- **No Audio Storage**: Raw audio is never stored
- **Secure Storage**: API keys stored using Chrome's storage API
- **HTTPS Only**: All API calls use HTTPS encryption
- **Minimal Data**: Only transcription text is sent to AI APIs

## API Usage & Costs

### Gemini API (AI Recommendations)

This extension uses Google's Gemini API:
- **Free Tier**: Generous limits for development and personal use
- **Pay-as-you-go**: For heavier usage

Check the [Gemini API pricing](https://ai.google.dev/pricing) for current rates.

### Deepgram API (Optional, for Auto Speaker Detection)

- **Cost**: ~$0.24/hour for nova-2 model with speaker diarization
- **Free Tier**: $200 in free credits for new accounts
- **No minimum commitment**: Pay only for what you use

**Cost-Saving Tips**:
- Use Web Speech API mode (free) for manual speaker tagging
- Use Deepgram only for important meetings
- Use Gemini 2.0 Flash for faster, cheaper AI responses
- Increase auto-AI intervals to reduce API calls

## Backward Compatibility

Existing users are automatically migrated to the new multi-speaker system:
- Old settings are preserved
- New features use sensible defaults
- Both old and new message formats are handled
- Data migration happens automatically on first load

## License

This project is provided as-is for personal and educational use.

## Changelog

### Version 2.0.0 (Multi-Speaker Release)
- **NEW**: Multi-speaker conversation support
- **NEW**: Speaker identification and management
- **NEW**: Flexible transcription modes (Web Speech API / Deepgram)
- **NEW**: Automatic speaker detection with Deepgram
- **NEW**: Multiple view modes (turn-by-turn, grouped, flat)
- **NEW**: Export functionality (JSON, TXT)
- **NEW**: Dual AI modes (manual / auto)
- **NEW**: Multiple recommendation types (answer, summary, follow-up, analysis)
- **NEW**: Custom prompts per recommendation type
- **NEW**: Auto-trigger options for AI generation
- **Enhanced**: Fallback from Deepgram to Web Speech API
- **Enhanced**: Backward compatibility with existing users

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

### Which transcription mode should I use?

**Web Speech API (Free, Manual)**:
- ✅ No additional costs
- ✅ Works offline after initial load
- ✅ Good for 1-2 speakers
- ⚠️ Requires manual speaker assignment

**Deepgram (Paid, Auto)**:
- ✅ Automatic speaker detection
- ✅ Higher accuracy
- ✅ Supports up to 10 speakers
- ✅ Better for technical terms
- ⚠️ Costs ~$0.24/hour

### Which AI mode should I use?

**Manual Mode**:
- ✅ Full control over when AI generates
- ✅ Fewer API calls, lower costs
- ✅ Good for intermittent meetings

**Auto Mode**:
- ✅ Automatic insights during meetings
- ✅ No need to remember to click generate
- ⚠️ More API calls
- ⚠️ Set minimum 30s intervals to avoid rate limits

### Can I switch between transcription modes?

Yes! Go to Settings → Select "Transcription Mode" → Save. The extension will use the selected mode for the next recording.

### Does my speaker data persist?

Yes! Speaker names, colors, and metadata are saved to Chrome storage and persist across sessions.

### What happens if Deepgram fails?

The extension automatically falls back to Web Speech API if Deepgram connection fails, ensuring you never lose transcription capability.

---

**Made with ❤️ for better meetings**
