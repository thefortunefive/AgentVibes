#!/bin/bash
#
# @fileoverview TTS Provider Router
# @context Routes TTS requests to active provider (ElevenLabs or Piper)
# @architecture Provider abstraction layer - single entry point for all TTS
# @dependencies provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh
# @entrypoints Called by hooks, slash commands, and personality-manager.sh
# @patterns Provider pattern - delegates to provider-specific implementations
# @related provider-manager.sh, play-tts-elevenlabs.sh, play-tts-piper.sh
#

# Fix locale warnings
export LC_ALL=C

TEXT="$1"
VOICE_OVERRIDE="$2"  # Optional: voice name or ID

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're in an SSH session and should use remote TTS
if [ -n "$SSH_CONNECTION" ] || [ -n "$SSH_CLIENT" ]; then
    # Check if remote TTS forwarding is enabled
    if [ -f "$HOME/.claude/tts-remote-forward" ] || [ "$AGENTVIBES_REMOTE_TTS" = "true" ]; then
        # In SSH session with forwarding enabled - generate locally but don't play
        # The audio data should be captured and sent to the client

        # Source provider manager to get active provider
        source "$SCRIPT_DIR/provider-manager.sh"
        ACTIVE_PROVIDER=$(get_active_provider)

        case "$ACTIVE_PROVIDER" in
          piper)
            # Generate audio and output to stdout for SSH forwarding
            exec "$SCRIPT_DIR/play-tts-remote.sh" "$TEXT"
            ;;
          elevenlabs)
            # For ElevenLabs, we might need a different approach
            # since it requires API calls
            exec "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$TEXT" "$VOICE_OVERRIDE"
            ;;
          *)
            echo "❌ Unknown provider: $ACTIVE_PROVIDER" >&2
            exit 1
            ;;
        esac
        exit 0
    fi
fi

# Normal local playback path
# Source provider manager to get active provider
source "$SCRIPT_DIR/provider-manager.sh"

# Get active provider
ACTIVE_PROVIDER=$(get_active_provider)

# Show GitHub star reminder (once per day)
"$SCRIPT_DIR/github-star-reminder.sh" 2>/dev/null || true

# Route to appropriate provider implementation
case "$ACTIVE_PROVIDER" in
  elevenlabs)
    exec "$SCRIPT_DIR/play-tts-elevenlabs.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  piper)
    exec "$SCRIPT_DIR/play-tts-piper.sh" "$TEXT" "$VOICE_OVERRIDE"
    ;;
  *)
    echo "❌ Unknown provider: $ACTIVE_PROVIDER"
    echo "   Run: /agent-vibes:provider list"
    exit 1
    ;;
esac
