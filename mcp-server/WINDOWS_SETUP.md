# AgentVibes MCP Server - Windows Setup Guide

Complete guide for setting up AgentVibes MCP server on Windows with Claude Desktop.

---

## Prerequisites

Before installing AgentVibes, you need:

### Required

1. **Python 3.10+**
   - Download: https://python.org/downloads
   - **IMPORTANT**: During installation, check "Add Python to PATH"
   - Verify installation: `python --version`

2. **Node.js 16+**
   - Download: https://nodejs.org
   - Verify installation: `node --version`

3. **Claude Desktop OR Claude Code**

   You need ONE of these:

   - **Claude Desktop** - Standalone desktop application for chatting with Claude
     - Download: https://claude.ai/download
     - Use case: General chat, research, writing assistance

   - **Claude Code** - CLI tool for coding with Claude in your terminal
     - Download: https://docs.claude.com/en/docs/claude-code/download
     - Use case: Coding assistance, terminal-based workflows

   **Note**: This guide focuses on Claude Desktop setup. For Claude Code setup, see the main README.md

### Choose Your Voice Provider

You must choose **ONE** of these options:

#### Option A: Piper TTS (Free, Recommended) ⭐

**Pros:**
- ✅ Completely free forever
- ✅ Works offline (no internet needed)
- ✅ No API key required
- ✅ Privacy-focused (all processing local)
- ✅ Multiple voices available

**Cons:**
- ❌ Requires WSL (Windows Subsystem for Linux)
- ❌ Voice quality not as premium as ElevenLabs

**Additional Prerequisite:**
- **WSL (Windows Subsystem for Linux)** - REQUIRED for Piper
  - Install with PowerShell (as Administrator):
    ```powershell
    wsl --install
    ```
  - Restart your computer after installation
  - Verify: `wsl --status`

#### Option B: ElevenLabs (Paid)

**Pros:**
- ✅ Premium, natural-sounding voices
- ✅ 30+ voices available
- ✅ Multi-language support (25+ languages)
- ✅ No WSL required
- ✅ Easy setup

**Cons:**
- ❌ **Requires paid API key** (costs money after free trial)
- ❌ Requires internet connection
- ❌ Privacy concern (audio sent to ElevenLabs servers)

**Additional Prerequisite:**
- **ElevenLabs API Key** (get from https://elevenlabs.io)
  - Free trial: 10,000 characters
  - After trial: Paid subscription required

---

## Installation

### Step 1: Configure Claude Desktop

Edit Claude Desktop config file:
- Location: `%APPDATA%\Claude\claude_desktop_config.json`
- Full path example: `C:\Users\%USERNAME%\AppData\Roaming\Claude\claude_desktop_config.json`

**For Piper (Free, with WSL):**

```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "npx",
      "args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"]
    }
  }
}
```

**For ElevenLabs (Paid):**

First, set your API key in PowerShell:
```powershell
setx ELEVENLABS_API_KEY "your-api-key-here"
```

**⚠️ IMPORTANT**: After running `setx`:
1. Close PowerShell
2. Close Claude Desktop completely
3. Open a new PowerShell window
4. Restart Claude Desktop

Then add to config:
```json
{
  "mcpServers": {
    "agentvibes": {
      "command": "npx",
      "args": ["-y", "agentvibes@beta", "agentvibes-mcp-server"]
    }
  }
}
```

**Note**: Claude Desktop automatically inherits environment variables, so no need to add `env` section if you used `setx`.

### Step 2: Restart Claude Desktop

1. Close Claude Desktop completely (check system tray)
2. Reopen Claude Desktop
3. Wait for MCP server to initialize (~10 seconds first time)

---

## Testing

### Verify Installation

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `What AgentVibes tools do you have?` | Run: `/agent-vibes:list` | Type: `What AgentVibes tools do you have?` |

**Expected response**: List of tools including:
- `text_to_speech`
- `list_voices`
- `set_voice`
- `set_personality`
- `set_language`
- `get_config`
- `replay_audio`

### Test Voice Output

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Use text to speech to say "Hello, AgentVibes is working!"` | Run: `.claude/hooks/play-tts.sh "Hello, AgentVibes is working!"` | Type: `Use text to speech to say "Hello, AgentVibes is working!"` |

**Expected result**: You should hear audio output!

### Check Current Configuration

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `What's my current AgentVibes configuration?` | Run: `.claude/hooks/provider-manager.sh status` | Type: `What's my current AgentVibes configuration?` |

**Expected response**: Shows current voice, personality, language, and provider (Piper or ElevenLabs).

---

## Switching Providers

### Switch to ElevenLabs (from Piper)

First, ensure you have your API key set:
```powershell
setx ELEVENLABS_API_KEY "your-api-key-here"
```

Then restart your terminal/Claude Desktop and run:

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Switch to ElevenLabs provider` | Run: `.claude/hooks/provider-manager.sh switch elevenlabs` | Type: `Switch to ElevenLabs provider` |

### Switch to Piper (from ElevenLabs)

Ensure WSL is installed, then:

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Switch to Piper provider` | Run: `.claude/hooks/provider-manager.sh switch piper` | Type: `Switch to Piper provider` |

---

## Voice Configuration

### List Available Voices

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `List all available voices` | Run: `/agent-vibes:list` | Type: `List all available voices` |

### Change Voice

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Switch to Northern Terry voice` | Run: `/agent-vibes:switch "Northern Terry"` | Type: `Switch to Northern Terry voice` |

### Set Personality

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Set personality to pirate` | Run: `/agent-vibes:personality pirate` | Type: `Set personality to pirate` |

### Set Language

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Speak in Spanish` | Run: `/agent-vibes:set-language spanish` | Type: `Speak in Spanish` |

### Show Current Settings

| Claude Desktop | Claude Code (Slash Commands) | Claude Code (with AgentVibes MCP) |
|----------------|------------------------------|-----------------------------------|
| Type: `Show my AgentVibes configuration` | Run: `.claude/hooks/provider-manager.sh status` | Type: `Show my AgentVibes configuration` |

---

## Troubleshooting

### "Python not found"

1. Install Python from https://python.org
2. During installation, check "Add Python to PATH"
3. Restart PowerShell
4. Verify: `python --version`

### "Node.js not found"

1. Install Node.js from https://nodejs.org
2. Restart PowerShell
3. Verify: `node --version` and `npx --version`

### "MCP server not starting"

1. Check Claude Desktop logs:
   - Location: `%APPDATA%\Claude\logs\mcp-server-agentvibes.log`
2. Look for error messages
3. Ensure all prerequisites are installed
4. Restart Claude Desktop

### No Audio Output (Piper)

1. Verify WSL is installed: `wsl --status`
2. Verify Piper is installed in WSL:
   ```bash
   wsl -e bash -c "piper --version"
   ```
3. If not installed, install in WSL:
   ```bash
   wsl -e bash -c "pipx install piper-tts"
   ```
4. Check audio routing from WSL to Windows speakers
5. Restart Claude Desktop

### No Audio Output (ElevenLabs)

1. Verify API key is set:
   ```powershell
   echo %ELEVENLABS_API_KEY%
   ```
2. Check internet connection
3. Verify API key is valid at https://elevenlabs.io
4. Check Claude Desktop logs for error messages
5. Ensure you haven't exceeded API quota

### "No module named 'mcp'"

The MCP package should auto-install. If it fails:

```powershell
pip install mcp
```

Verify:
```powershell
python -c "import mcp; print('Success!')"
```

---

## Advanced Configuration

### Custom Instructions for Automatic TTS

Add to Claude Desktop custom instructions:

```markdown
When I give you a task:
1. Use text_to_speech to acknowledge before starting
2. Perform the task
3. Use text_to_speech to confirm completion

Keep TTS messages brief (under 150 characters).
```

### Project-Specific Settings

AgentVibes saves settings in:
- **Global**: `~/.claude/` (applies to all projects)
- **Project**: `.claude/` in project directory (overrides global)

This allows different voices/personalities per project!

---

## Performance Notes

- **Piper**: Near-instant response (runs locally in WSL)
- **ElevenLabs**: 1-2 second latency (API call over internet)
- **First run**: Slower (downloading voices/models)
- **Subsequent runs**: Much faster (cached)

---

## Recommendations

### For Most Users (Free)
1. ✅ Install WSL
2. ✅ Use Piper provider (free, offline)
3. ✅ Choose from 10+ free voices
4. ✅ No ongoing costs

### For Premium Voice Quality (Paid)
1. ✅ Get ElevenLabs API key
2. ✅ Use ElevenLabs provider
3. ✅ Access 30+ premium voices
4. ❌ Requires paid subscription after trial

---

## Support

- **Documentation**: https://github.com/paulpreibisch/AgentVibes
- **Issues**: https://github.com/paulpreibisch/AgentVibes/issues
- **Logs**: `%APPDATA%\Claude\logs\mcp-server-agentvibes.log`

---

🎤 **Enjoy your talking Claude Desktop on Windows!**
