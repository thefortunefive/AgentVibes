# AgentVibes Voice - Browser Extension

A Brave/Chrome browser extension that adds voice output (TTS) to AI chat windows including ChatGPT, Claude, and Genspark.

## Features

- 🔊 **Auto-speak AI responses** - Automatically reads AI messages aloud as they complete
- 🎙️ **Manual replay** - Click the speaker icon on any AI message to replay it
- 🌐 **Multi-platform support** - Works with ChatGPT, Claude.ai, Genspark, and generic chat interfaces
- 🎛️ **Settings panel** - Enable/disable voice, adjust volume, select voice
- 🔄 **Server status indicator** - Shows when AgentVibes server is connected
- 🔒 **Privacy-first** - All processing happens locally via your AgentVibes server

## Installation

### From Source (Developer Mode)

1. Open Chrome/Brave and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this directory
5. The extension icon should appear in your toolbar

### Prerequisites

You must have the AgentVibes server running locally on `http://localhost:3000`:

```bash
cd /path/to/AgentVibes
npm start  # or however you start the server
```

Verify the server is running:
```bash
curl http://localhost:3000/api/status
```

## Usage

1. **Start AgentVibes server** on localhost:3000
2. **Open any supported AI chat** (ChatGPT, Claude, or Genspark)
3. **Wait for AI responses** - they will be spoken automatically
4. **Click the speaker icon** on any message to replay it
5. **Click the extension icon** in the toolbar to adjust settings:
   - Toggle voice on/off
   - Adjust volume
   - Select different voices (requires server to have multiple voices)
   - Test the voice output

## Supported Platforms

| Platform | URL | Detection Method |
|----------|-----|------------------|
| Claude | `claude.ai/*` | `.font-claude-message` elements with `data-is-streaming="false"` |
| ChatGPT | `chat.openai.com/*` | `.agent-turn .markdown` containers |
| Genspark | `genspark.ai/*` | `.message-content` or `.assistant-message` elements |
| Generic | Any chat UI | Any assistant-like elements with 20+ character text |

## Extension Structure

```
extension/
├── manifest.json      # Manifest V3 configuration
├── background.js      # Service worker for CORS proxy and TTS requests
├── content.js         # Content script for message detection
├── content.css        # Styles for speaker icons
├── popup.html         # Settings popup UI
├── popup.js           # Settings popup logic
├── icons/             # Extension icons
│   ├── icon16.svg     # Microphone with sound waves (16x16)
│   ├── icon48.svg     # Microphone with sound waves (48x48)
│   └── icon128.svg    # Microphone with sound waves (128x128)
└── README.md          # This file
```

## How It Works

1. **Content Script** (`content.js`) runs on supported chat websites
2. **MutationObserver** watches for new AI messages in the DOM
3. When a message finishes streaming (detected by platform-specific attributes):
   - Text is extracted and cleaned (code blocks removed)
   - A speaker icon is added to the message
   - If auto-speak is enabled, the text is sent to background script
4. **Background Script** (`background.js`) receives TTS requests
   - Forwards to `http://localhost:3000/api/tts`
   - Returns audio URL to content script
   - Content script plays the audio
5. **Popup** (`popup.html` + `popup.js`) provides settings UI
   - Checks server status periodically
   - Fetches available voices from server
   - Saves settings to chrome.storage

## Configuration

The extension stores settings in Chrome's local storage:

```javascript
{
  enabled: true,        // Master enable/disable
  autoSpeak: true,      // Auto-speak new messages
  volume: 1.0,          // Volume 0.0 - 1.0
  voice: null,          // Selected voice ID (null = default)
  spokenMessages: {}    // Hash tracking for spoken messages
}
```

## API Endpoints Used

The extension connects to these AgentVibes server endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/status` | GET | Check server health |
| `/api/tts` | POST | Convert text to speech |
| `/api/voices` | GET | List available voices |

## Troubleshooting

### "Server offline" status
- Ensure AgentVibes server is running on port 3000
- Check `http://localhost:3000/api/status` in your browser
- Verify no firewall is blocking localhost connections

### Messages not being spoken
- Check that the extension is enabled (popup toggle)
- Verify auto-speak is enabled in settings
- Check browser console for errors (F12 → Console)
- Ensure you're on a supported platform (ChatGPT, Claude, Genspark)

### No speaker icons appearing
- The message must be 20+ characters
- Code blocks are excluded from speech
- Check that the AI message has finished streaming

### Audio not playing
- Check volume slider in extension popup
- Ensure browser audio is not muted
- Try the "Test Voice" button in popup

## Permissions

The extension requires these permissions:

- **`activeTab`**: To detect chat messages on the current tab
- **`storage`**: To save settings (enabled, volume, voice)
- **`host_permissions` for `localhost:3000`**: To connect to AgentVibes server
- **`matches`** for chat sites: To run content script on supported platforms

## Development

To modify the extension:

1. Edit files in `extension/` directory
2. Go to `chrome://extensions/` in Brave/Chrome
3. Click the refresh icon on the AgentVibes Voice extension
4. Test your changes

## License

MIT License - Part of the AgentVibes project
