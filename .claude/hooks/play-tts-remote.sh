#!/bin/bash

# Remote TTS Generator for AgentVibes
# This script generates TTS on the remote server and outputs audio data
# that can be piped through SSH for local playback

# Default voice model
DEFAULT_MODEL="$HOME/.claude/piper-voices/en_US-lessac-medium.onnx"
DEFAULT_VOICE="Aria"

# Get text from arguments or stdin
if [ $# -gt 0 ]; then
    TEXT="$*"
else
    TEXT=$(cat)
fi

# Check if we're in an SSH session or force remote mode
if [ -n "$SSH_CONNECTION" ] || [ -n "$SSH_CLIENT" ] || [ "$FORCE_REMOTE_TTS" = "true" ]; then
    # We're on a remote server or forcing remote mode

    # Check for piper
    if command -v piper &> /dev/null; then
        PIPER_CMD="piper"
    elif [ -f "$HOME/.local/share/pipx/venvs/piper-tts/bin/piper" ]; then
        PIPER_CMD="$HOME/.local/share/pipx/venvs/piper-tts/bin/piper"
    elif [ -f "$HOME/bin/piper" ]; then
        PIPER_CMD="$HOME/bin/piper"
    else
        # Fallback to espeak-ng if available
        if command -v espeak-ng &> /dev/null; then
            echo "$TEXT" | espeak-ng --stdout
            exit 0
        else
            echo "Error: No TTS engine found (piper or espeak-ng)" >&2
            exit 1
        fi
    fi

    # Check for voice model
    if [ -f "$DEFAULT_MODEL" ]; then
        MODEL="$DEFAULT_MODEL"
    elif [ -f "$HOME/.local/share/piper/voices/en_US-lessac-medium.onnx" ]; then
        MODEL="$HOME/.local/share/piper/voices/en_US-lessac-medium.onnx"
    else
        echo "Error: No voice model found" >&2
        exit 1
    fi

    # Generate TTS and output raw audio to stdout
    echo "$TEXT" | "$PIPER_CMD" -m "$MODEL" -f - 2>/dev/null

else
    # We're running locally in WSL - still generate TTS for testing
    # Check for piper in WSL
    if [ -f "$HOME/.local/share/pipx/venvs/piper-tts/bin/piper" ]; then
        PIPER_CMD="$HOME/.local/share/pipx/venvs/piper-tts/bin/piper"
    elif [ -f "$HOME/bin/piper" ]; then
        PIPER_CMD="$HOME/bin/piper"
    elif command -v pipx &> /dev/null; then
        # Try using pipx run as fallback
        echo "$TEXT" | pipx run piper-tts -m "$DEFAULT_MODEL" -f - 2>/dev/null
        exit 0
    else
        echo "Error: No TTS engine found in local WSL" >&2
        exit 1
    fi

    # Check for voice model
    if [ -f "$DEFAULT_MODEL" ]; then
        MODEL="$DEFAULT_MODEL"
    elif [ -f "$HOME/.local/share/piper/voices/en_US-lessac-medium.onnx" ]; then
        MODEL="$HOME/.local/share/piper/voices/en_US-lessac-medium.onnx"
    else
        echo "Error: No voice model found" >&2
        exit 1
    fi

    # Generate TTS and output raw audio to stdout
    echo "$TEXT" | "$PIPER_CMD" -m "$MODEL" -f - 2>/dev/null
fi