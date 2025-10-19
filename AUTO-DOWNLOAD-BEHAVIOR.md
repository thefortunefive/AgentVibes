# AgentVibes Auto-Download Behavior

## How Voice Downloads Work in Different Environments

AgentVibes automatically detects whether it's running in an interactive or non-interactive environment and adjusts voice download behavior accordingly.

### ✅ Auto-Download Environments (No Prompts)

In these environments, **voices download automatically** when needed:

1. **Claude Code** (VS Code extension)
   - Detected via: `CLAUDE_PROJECT_DIR` environment variable
   - Behavior: Auto-downloads missing voices silently
   - User sees: "🤖 Auto-downloading (non-interactive environment)..."

2. **Claude Desktop** (Desktop app with MCP)
   - Detected via: `MCP_SESSION` environment variable
   - Behavior: Auto-downloads missing voices silently
   - User sees: Download progress in terminal output

3. **Warp Terminal** (with MCP integration)
   - Detected via: MCP environment variables
   - Behavior: Auto-downloads missing voices silently
   - User sees: Download progress in terminal

4. **Scripts/Automation**
   - Detected via: stdin not being a terminal (`[[ ! -t 0 ]]`)
   - Behavior: Auto-downloads missing voices
   - User sees: Progress in logs/output

### ❓ Interactive Environments (Prompts User)

In these environments, **users are asked before downloading**:

1. **Direct terminal usage** (SSH, local terminal)
   - Detected via: stdin is a terminal AND no MCP variables
   - Behavior: Prompts "Download this voice model? [Y/n]:"
   - User must confirm (default is Yes)

### 🎯 Example Scenarios

#### Scenario 1: Claude Code User (First Time)

```bash
# User switches personality in Claude Code
/agent-vibes:personality flirty

# AgentVibes detects:
- CLAUDE_PROJECT_DIR is set
- Running in Claude Code
- No interactive terminal

# Output:
📥 Voice model not found: 16Speakers
   File size: ~25MB
   🤖 Auto-downloading (non-interactive environment)...
   Downloading Piper voice: 16Speakers
   ✅ Voice downloaded successfully

🎭 Personality set to: flirty
⭐ Using your top-rated voice: Cori Samuel
```

**Result:** Voice downloads automatically, no user interaction needed!

#### Scenario 2: Claude Desktop User (First Time)

```bash
# User uses MCP command
agentvibes_switch_personality("flirty")

# AgentVibes detects:
- MCP_SESSION is set
- Running via MCP
- Non-interactive context

# Output:
📥 Voice model not found: 16Speakers
   🤖 Auto-downloading (non-interactive environment)...
   ✅ Voice downloaded successfully

Personality: flirty
Voice: Cori Samuel
```

**Result:** Seamless experience, downloads happen in background!

#### Scenario 3: Terminal User (First Time)

```bash
# User runs slash command directly
.claude/hooks/personality-manager.sh set flirty

# AgentVibes detects:
- stdin is a terminal
- No MCP variables
- Interactive environment

# Output:
📥 Voice model not found: 16Speakers
   File size: ~25MB
   Preview: https://huggingface.co/rhasspy/piper-voices

   Download this voice model? [Y/n]: _
```

**Result:** User is asked, can confirm or decline

### 🔍 Detection Logic

```bash
# In play-tts-piper.sh (line 148-161)

AUTO_DOWNLOAD=false

# Check if non-interactive
if [[ ! -t 0 ]] || [[ -n "$CLAUDE_PROJECT_DIR" ]] || [[ -n "$MCP_SESSION" ]]; then
  AUTO_DOWNLOAD=true
  echo "🤖 Auto-downloading (non-interactive environment)..."
else
  # Interactive - ask user
  read -p "Download this voice model? [Y/n]: " -n 1 -r
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    AUTO_DOWNLOAD=true
  fi
fi
```

### 📋 What Gets Downloaded

When a voice is needed and not present:

**Single download:**
- File size: ~25MB per voice model
- Source: HuggingFace (rhasspy/piper-voices or agentvibes/piper-custom-voices)
- Download speed: Depends on connection (~5-30 seconds typically)
- Stored in: `~/.local/share/piper/voices/`

**For default personalities:**
- Maximum 3 downloads needed:
  - 16Speakers (~25MB) - Multi-speaker model
  - en_GB-alan-medium (~25MB) - British male
  - en_GB-semaine-medium (~25MB) - British female
- Total: ~75MB maximum

### ⚡ First-Time User Experience

**Claude Code/Desktop (Non-Interactive):**
```
1. User: /agent-vibes:personality pirate
2. System: Auto-downloads 16Speakers (~25MB)
3. System: Auto-downloads en_GB-alan-medium (~25MB) [if needed]
4. Downloads complete in background (15-60 seconds)
5. Personality works immediately
6. Future uses: Instant (no download)
```

**Terminal (Interactive):**
```
1. User: /agent-vibes:personality pirate
2. System: "Download 16Speakers? [Y/n]:"
3. User: Presses Enter (default Yes)
4. Downloads 16Speakers (~25MB)
5. Personality works
6. Future uses: Instant (no download)
```

### 🛡️ Safety Features

1. **One-time downloads**: Each voice downloads only once, cached forever
2. **Network error handling**: Clear error messages if download fails
3. **Disk space check**: Downloads ~25MB files, user can see size before confirming
4. **Fallback voices**: If download fails, fallback to default voice
5. **Manual download option**: Users can pre-download via `piper-download-voices.sh`

### 💡 Best Practices for Distribution

**For New Users:**
1. Recommended during installation: "Download recommended voices? [Y/n]"
   - This pre-downloads 16Speakers + British voices
   - Avoids first-time delays

2. First personality use after install:
   - If voices pre-downloaded: Instant
   - If skipped: Auto-downloads on first use

**For Documentation:**
- Mention ~75MB download size for full personality support
- Emphasize one-time download (cached forever)
- Highlight auto-download in Claude Code/Desktop (no interruption)

### 🔧 Manual Download Option

Users can pre-download all voices:

```bash
# Download recommended voices (includes personality defaults)
.claude/hooks/piper-download-voices.sh

# Or during installation
.claude/hooks/piper-installer.sh
# Answers "Yes" to "Download voice models now?"
```

### ❌ Error Handling

If download fails:

```bash
❌ Failed to download voice model
Fix: Download manually with: .claude/hooks/piper-download-voices.sh
     Or choose a different voice
```

User can then:
1. Check internet connection
2. Run manual download script
3. Choose a different personality (with already-downloaded voice)
4. Switch to ElevenLabs provider

## Summary

**Claude Code/Desktop Users:**
- ✅ Automatic, silent downloads
- ✅ No prompts or interruptions
- ✅ One-time ~25MB download per voice
- ✅ Cached forever after first download

**Terminal Users:**
- ✅ Prompted before download (can say no)
- ✅ Default is Yes (just press Enter)
- ✅ Can pre-download to avoid prompts

**All Users:**
- ✅ Downloads happen only once per voice
- ✅ ~75MB total for all personality defaults
- ✅ Fast download (HuggingFace CDN)
- ✅ Clear progress indicators
