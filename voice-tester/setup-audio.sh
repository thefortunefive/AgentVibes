#!/bin/bash

# AgentVibes Voice Tester - Audio Setup Script
# This script copies audio samples from agentvibes.org to the voice-tester folder

echo "🎤 AgentVibes Voice Tester - Audio Setup"
echo "========================================"
echo ""
echo "This script copies pre-generated voice samples from agentvibes.org"
echo "to the voice-tester/audio/ folder so you can test voices offline."
echo ""

# Create audio directory
mkdir -p audio/piper-voices

# Check if source audio exists
if [ -d "../agentvibes.org/public/audio/piper-voices" ]; then
    echo "✅ Found audio samples at: ../agentvibes.org/public/audio/piper-voices/"
    echo ""
    read -p "Copy audio samples to voice-tester? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📂 Copying audio samples..."
        cp -r ../agentvibes.org/public/audio/piper-voices/* audio/piper-voices/

        # Count files
        WAV_COUNT=$(find audio/piper-voices -name "*.wav" 2>/dev/null | wc -l)
        echo ""
        echo "✅ Copied $WAV_COUNT audio files!"
        echo ""
        echo "🎯 Setup complete! Now run:"
        echo "   ./voicetester.sh"
    else
        echo "⏭️  Skipped audio copy."
    fi
else
    echo "❌ Audio samples not found at: ../agentvibes.org/public/audio/piper-voices/"
    echo ""
    echo "The audio samples are in the agentvibes.org repository."
    echo "Make sure you have both repositories cloned:"
    echo ""
    echo "  git clone https://github.com/paulpreibisch/AgentVibes"
    echo "  git clone https://github.com/paulpreibisch/agentvibes.org"
    echo ""
    echo "Or generate your own samples using AgentVibes TTS."
fi

echo ""
