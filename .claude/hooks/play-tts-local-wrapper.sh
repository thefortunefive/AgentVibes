#!/bin/bash

# Local TTS Wrapper for AgentVibes
# This script runs on your local Windows WSL and receives audio from remote server
# Usage: ./play-tts-local-wrapper.sh "Text to speak"

# Configuration
REMOTE_HOST="${AGENTVIBES_REMOTE_HOST:-ubuntu-rdp}"
REMOTE_SCRIPT=".claude/hooks/play-tts-remote.sh"

# Get text from arguments or stdin
if [ $# -gt 0 ]; then
    TEXT="$*"
else
    TEXT=$(cat)
fi

# Function to play audio based on what's available
play_audio() {
    # Try paplay first (WSLg PulseAudio)
    if command -v paplay &> /dev/null; then
        paplay --format=s16le --channels=1 --rate=22050
    # Try aplay next
    elif command -v aplay &> /dev/null; then
        aplay -f S16_LE -c 1 -r 22050
    # Try PowerShell audio playback as last resort
    elif command -v powershell.exe &> /dev/null; then
        # Save to temp file and play with Windows Media Player
        TEMP_FILE="/tmp/tts_audio_$$.wav"
        cat > "$TEMP_FILE"
        powershell.exe -Command "& {(New-Object Media.SoundPlayer '$TEMP_FILE').PlaySync()}" 2>/dev/null
        rm -f "$TEMP_FILE"
    else
        echo "Error: No audio playback method available" >&2
        exit 1
    fi
}

# SSH to remote, generate TTS, and pipe back for local playback
echo "$TEXT" | ssh "$REMOTE_HOST" "bash $REMOTE_SCRIPT" | play_audio

# Alternative method if you want to save the audio file
# echo "$TEXT" | ssh "$REMOTE_HOST" "bash $REMOTE_SCRIPT" > /tmp/tts_output.wav
# paplay /tmp/tts_output.wav