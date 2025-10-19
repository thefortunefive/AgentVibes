# 🎤 AgentVibes Voice Tester

A standalone web application for testing and rating different TTS voices across 16 unique personalities.

## 📋 Overview

The Voice Tester helps you:
- Test different Piper TTS voices across multiple personalities
- Rate voices on a scale of 1-10 for each personality
- Compare voice quality across different speaking styles
- Select your favorite voices for each personality
- Export your ratings for backup or sharing

## 🚀 Quick Start

### Method 1: Use Python's Built-in HTTP Server

```bash
cd voice-tester
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

### Method 2: Use Node.js http-server

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run from voice-tester directory
cd voice-tester
http-server -p 8000
```

Then open your browser to: `http://localhost:8000`

### Method 3: Use PHP's Built-in Server

```bash
cd voice-tester
php -S localhost:8000
```

Then open your browser to: `http://localhost:8000`

## 📁 Directory Structure

```
voice-tester/
├── index.html          # Main voice tester application
├── README.md           # This file
├── audio/              # Audio samples directory (you need to generate these)
│   └── piper-voices/   # Contains personality voice samples
│       ├── test_0_sarcastic.wav
│       ├── test_0_flirty.wav
│       └── ... (more samples)
└── .gitignore          # Excludes audio files from git
```

## 🎵 Audio Samples (Pre-Generated!)

The voice tester uses **pre-generated audio samples** with personality-specific sentences. These samples are already created in the `agentvibes.org` repository and contain unique text for each personality.

**Example personality texts:**
- **Sarcastic**: "Oh wonderful! Even more documentation surgery..."
- **Flirty**: "Well hello there, gorgeous codebase..."
- **Pirate**: "Ahoy matey! Thar be bugs in these waters!"
- **Zen**: "Breathe in the bugs. Breathe out the fixes..."

### Sample File Naming Convention

For multi-speaker voices (16Speakers model):
```
test_{voiceNumber}_{personalitySlug}.wav
```

For single-speaker voices:
```
single_{voiceSlug}_{personalitySlug}.wav
```

### Example Files
- `test_0_sarcastic.wav` - Voice #0 (Cori Samuel) saying the sarcastic personality text
- `test_4_pirate.wav` - Voice #4 (Mike Pelton) saying the pirate personality text
- `single_en_gb_alan_flirty.wav` - English GB Alan saying the flirty personality text

### Getting the Samples

Run the setup script to copy from `agentvibes.org`:
```bash
./setup-audio.sh
```

This copies all pre-generated samples (~200+ WAV files) containing personality-specific sentences.

### Personalities Available

1. Sarcastic 🙄
2. Angry 😡
3. Flirty 😘
4. Pirate 🏴‍☠️
5. Zen 🧘
6. Robot 🤖
7. Grandpa 👴
8. Dry Humor 😐
9. Dramatic 🎭
10. Funny 😂
11. Professional 💼
12. Sassy 💅
13. Surfer Dude 🏄
14. Poetic ✍️
15. Moody 😒
16. Millennial ☕

### Voices Included

The tester includes 19 different voices:
- 16 multi-speaker voices (numbered 0-15)
- 3 single-speaker voices (en_gb_alan, en_gb_semaine, es_mx_claude)

## 🎯 Using the Voice Tester

### Basic Navigation

1. **Voice Navigation**: Use "← Previous Voice" and "Next Voice →" buttons to cycle through voices
2. **Personality Navigation**: Use "← Prev" and "Next →" buttons at the top to switch personalities
3. **Quick Jump**: Click on personalities in the left sidebar to jump directly to that personality
4. **Voice List**: Use the right sidebar to navigate to specific voices

### Rating Voices

1. Listen to the audio sample (plays automatically)
2. Click a rating button (1-10) to rate the voice for that personality
3. Your ratings are saved automatically in browser localStorage
4. The left sidebar shows your top-rated voices per personality with a ★ icon

### Voice Preferences

In the right sidebar, you can:
- **👍 Like**: Mark voices you like (shows in "Liked" tab)
- **👎 Dislike**: Mark voices you don't like (shows in "Unliked" tab)

### Filters

- **Liked/Unliked Tabs**: Filter voices by preference
- **Gender Filter**: Show All, Male only, or Female only voices

### Keyboard Shortcuts

- **←/→ Arrow Keys**: Navigate between voices
- **↑/↓ Arrow Keys**: Navigate between personalities
- **1-9 Keys**: Quick rate (press 0 for rating of 10)

### Export Ratings

Click the **📊** button in the top-right to export your ratings as a JSON file. This includes:
- All ratings for each personality
- Selected voices for each personality
- Voice preferences (liked/unliked)
- Export date

## 🔧 Troubleshooting

### Audio Files Not Loading

1. **Check file paths**: The app expects files in `audio/piper-voices/` relative to the HTML file
2. **Verify naming**: Make sure files follow the naming convention exactly
3. **Check browser console**: Open DevTools (F12) and look for 404 errors

### CORS Errors

If you see CORS errors, you're not running a proper HTTP server. Don't open the HTML file directly - use one of the server methods above.

### Audio Doesn't Autoplay

Some browsers block autoplay. You can manually click the play button on the audio player.

## 📊 Data Storage

All ratings and preferences are stored in your browser's localStorage:
- `voiceRatingsAll`: All ratings by personality
- `selectedVoices`: Selected voice for each personality
- `voicePreferences`: Liked/unliked status for each voice
- `genderFilter`: Current gender filter setting

## 🎨 Customization

You can customize the voice tester by editing `index.html`:

### Adding New Voices

Add to the `voices` array around line 815:
```javascript
{ num: 16, name: "New Voice Name", gender: "Male", type: "multi" }
```

### Adding New Personalities

Add to the `personalities` array around line 837:
```javascript
{
    name: "Happy",
    slug: "happy",
    emoji: "😊",
    text: "I'm so happy to help you with this task!"
}
```

## 🛠️ Technical Details

- **Pure HTML/CSS/JavaScript**: No build process required
- **No dependencies**: Works entirely in the browser
- **LocalStorage**: Persists data across sessions
- **Responsive**: Works on desktop and mobile
- **Audio format**: Supports WAV files (can be modified for MP3/OGG)

## 📝 License

Part of the AgentVibes project. See the main repository for license details.

## 🤝 Contributing

To contribute improvements to the Voice Tester:
1. Test your changes with multiple browsers
2. Ensure audio files are not committed (see .gitignore)
3. Update this README if adding new features
4. Submit a pull request to the main AgentVibes repository

## 🔗 Resources

- [AgentVibes Main Repository](https://github.com/paulpreibisch/AgentVibes)
- [Piper TTS Documentation](https://github.com/rhasspy/piper)
- [AgentVibes Documentation](../README.md)

---

**Made with ❤️ for the AgentVibes community**
