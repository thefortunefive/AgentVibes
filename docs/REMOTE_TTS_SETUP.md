# Remote TTS Setup for AgentVibes

## Overview
This guide explains how to set up TTS audio forwarding when using AgentVibes over SSH connections. The system generates TTS on the remote server and plays it on your local Windows machine.

## Architecture

```
┌──────────────────┐           ┌──────────────────┐
│  Windows Local   │           │  Remote Server   │
│                  │           │                  │
│  WSL Ubuntu      │    SSH    │  AgentVibes      │
│  - PulseAudio    │<--------->│  - Piper TTS     │
│  - Audio Player  │           │  - Voice Models  │
└──────────────────┘           └──────────────────┘
```

## Setup Instructions

### 1. Remote Server Setup (Already Done)
The following scripts have been created on the remote server:
- `.claude/hooks/play-tts-remote.sh` - Generates TTS audio on remote
- `.claude/hooks/play-tts.sh` - Updated to detect SSH sessions

### 2. Local Windows WSL Setup

#### Install Audio Tools
```bash
# In your Windows WSL Ubuntu
sudo apt update
sudo apt install -y pulseaudio paplay
```

#### Copy Local Wrapper Script
Save this script to your local Windows WSL as `~/bin/play-remote-tts.sh`:

```bash
#!/bin/bash

# Configuration - adjust to your remote host
REMOTE_HOST="${AGENTVIBES_REMOTE_HOST:-ubuntu-rdp}"
REMOTE_USER="${AGENTVIBES_REMOTE_USER:-$USER}"

# Get text from arguments or stdin
if [ $# -gt 0 ]; then
    TEXT="$*"
else
    TEXT=$(cat)
fi

# SSH to remote, generate TTS, and play locally
echo "$TEXT" | ssh "${REMOTE_USER}@${REMOTE_HOST}" \
    "cd ~/claude/AgentVibes && .claude/hooks/play-tts-remote.sh" | paplay

```

Make it executable:
```bash
chmod +x ~/bin/play-remote-tts.sh
```

### 3. Usage

#### Manual Testing
From your local Windows WSL:
```bash
# Simple test
~/bin/play-remote-tts.sh "Hello from remote server"

# Or pipe text
echo "This is a longer test message" | ~/bin/play-remote-tts.sh
```

#### Integration with VS Code Remote SSH

When using VS Code with Remote SSH extension:

1. **Option A: Environment Variable**
   Set in your remote `.bashrc` or `.zshrc`:
   ```bash
   export AGENTVIBES_REMOTE_TTS=true
   ```

2. **Option B: Flag File**
   Create a flag file on the remote:
   ```bash
   touch ~/.claude/tts-remote-forward
   ```

3. **Option C: SSH Config**
   Add to your local `~/.ssh/config`:
   ```
   Host ubuntu-rdp
       HostName your-server.com
       User your-username
       # Enable agent forwarding for better integration
       ForwardAgent yes
       # Optional: Set environment variable
       SetEnv AGENTVIBES_REMOTE_TTS=true
   ```

### 4. Advanced Configuration

#### Using Different Voice Models
The remote script supports multiple Piper voice models. To use a different voice:

1. List available voices on remote:
   ```bash
   find ~/.claude/piper-voices -name "*.onnx"
   ```

2. Modify the `DEFAULT_MODEL` in `play-tts-remote.sh`

#### Using SSH Multiplexing for Performance
Add to your local `~/.ssh/config`:
```
Host ubuntu-rdp
    ControlMaster auto
    ControlPath ~/.ssh/control-%h-%p-%r
    ControlPersist 10m
```

This reuses SSH connections for faster TTS responses.

### 5. Troubleshooting

#### No Audio Output
1. Check PulseAudio is running in WSL:
   ```bash
   pactl info
   ```

2. Test local audio playback:
   ```bash
   speaker-test -t wav -c 2 -l 1
   ```

#### SSH Connection Issues
1. Test SSH connection:
   ```bash
   ssh ubuntu-rdp "echo 'Connection works'"
   ```

2. Check remote script exists:
   ```bash
   ssh ubuntu-rdp "ls -la ~/claude/AgentVibes/.claude/hooks/play-tts-remote.sh"
   ```

#### TTS Generation Issues
1. Test remote TTS generation:
   ```bash
   ssh ubuntu-rdp "echo 'test' | ~/claude/AgentVibes/.claude/hooks/play-tts-remote.sh" | file -
   ```
   Should output: `/dev/stdin: RIFF (little-endian) data, WAVE audio`

### 6. Integration with AgentVibes Commands

To make AgentVibes commands use remote TTS automatically:

1. The system will automatically detect SSH sessions
2. When `AGENTVIBES_REMOTE_TTS=true` or flag file exists, TTS will be generated remotely
3. Audio data streams through SSH for local playback

### 7. Performance Optimization

For better performance:
1. Use SSH multiplexing (see Advanced Configuration)
2. Consider caching frequently used phrases
3. Use lighter voice models for faster generation

## How It Works

1. **Detection**: AgentVibes detects it's running in an SSH session
2. **Generation**: TTS is generated on the remote server using Piper
3. **Streaming**: Audio data streams through SSH connection
4. **Playback**: Audio plays on your local Windows speakers via WSL

## Benefits

- ✅ No need to install TTS engines locally
- ✅ Leverages remote server's processing power
- ✅ Maintains consistent voice across environments
- ✅ Works with existing SSH connections
- ✅ No additional ports or services required

## Security Notes

- Audio data is encrypted through SSH tunnel
- No persistent services or open ports required
- Uses existing SSH authentication