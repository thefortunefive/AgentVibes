#!/bin/bash

cd /home/fire/claude/AgentVibes

# Check if ELEVENLABS_API_KEY is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo "ERROR: ELEVENLABS_API_KEY environment variable is not set"
  echo "Please set it with: export ELEVENLABS_API_KEY=your_api_key_here"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p /home/fire/claude/AgentVibes/agentvibes.org/public/audio/elevenlabs

# Define all personality texts (same as Piper script)
declare -A PERSONALITIES

PERSONALITIES[sarcastic]="Oh wonderful! Even more documentation surgery. Let me just carve up this readme like I'm performing open heart surgery on a markdown file. Absolutely delightful."
PERSONALITIES[angry]="ARE YOU KIDDING ME?! Another bug in production! This code is absolutely UNACCEPTABLE! We're fixing this RIGHT NOW!"
PERSONALITIES[flirty]="Well hello there, gorgeous codebase. You're looking absolutely stunning today. Maybe we could spend some quality time together... debugging?"
PERSONALITIES[pirate]="Ahoy matey! Thar be bugs in these waters! Hoist the main sail and prepare to plunder this pull request, ye scurvy developer!"
PERSONALITIES[zen]="Breathe in the bugs. Breathe out the fixes. The code flows like water. We are one with the repository. All errors are merely opportunities for growth."
PERSONALITIES[robot]="BEEP BOOP. PROCESSING REQUEST. HUMAN EMOTION DETECTED. INITIATING TASK COMPLETION PROTOCOL. PROBABILITY OF SUCCESS: 99.7 PERCENT."
PERSONALITIES[grandpa]="Back in my day, we didn't have all these fancy frameworks! We coded uphill, both ways, in the snow! And we LIKED it!"
PERSONALITIES[dry_humor]="Fascinating. Another merge conflict. How utterly thrilling. I can barely contain my excitement. This is exactly what I went to computer science school for."
PERSONALITIES[dramatic]="THIS... IS... THE MOST IMPORTANT COMMIT OF OUR LIVES! The fate of the ENTIRE APPLICATION rests upon this single line of code! BEHOLD!"
PERSONALITIES[funny]="Why did the developer quit their job? Because they didn't get arrays! Get it? A RAISE! Haha! But seriously, this code is hilarious!"
PERSONALITIES[professional]="Per our previous discussion, I have completed the code review and identified three actionable items for optimization. Please advise on next steps."
PERSONALITIES[sassy]="Oh honey, did you REALLY just push that to main? Without running tests? Mmm-hmm. That's cute. Real cute. We need to talk."
PERSONALITIES[surfer_dude]="Dude! This code is totally gnarly! Like, riding the wave of optimization, bro! Let's catch some sick performance improvements!"
PERSONALITIES[poetic]="Like whispers through silicon dreams, the code flows eternal. Each function a verse, each variable a rhyme. We write not mere programs, but digital poetry."
PERSONALITIES[moody]="Whatever. I guess I'll fix this bug. Not like anyone appreciates my work anyway. Why do I even bother? *sigh* Fine. Let's get this over with."
PERSONALITIES[millennial]="I literally can't even right now. This code is giving me anxiety. I need coffee and avocado toast to deal with this. Can we Slack about it later?"

# Define ElevenLabs voice mappings (personality -> voice_id)
# You'll need to replace these with actual ElevenLabs voice IDs
declare -A VOICE_IDS
declare -A VOICE_SLUGS

# Map personalities to their designated ElevenLabs voices
# Voice IDs from ~/.claude/hooks/voices-config.sh

# Jessica Anne Bogart - for sarcastic and flirty
VOICE_IDS[sarcastic]="flHkNRp1BlvT73UL6gyz"
VOICE_SLUGS[sarcastic]="jessica"
VOICE_IDS[flirty]="flHkNRp1BlvT73UL6gyz"
VOICE_SLUGS[flirty]="jessica"

# Drill Sergeant - for angry
VOICE_IDS[angry]="vfaqCOvlrKi4Zp7C2IAm"
VOICE_SLUGS[angry]="drill-sergeant"

# Aria - for zen, dry_humor, poetic
VOICE_IDS[zen]="TC0Zp7WVFzhA8zpTlRqV"
VOICE_SLUGS[zen]="aria"
VOICE_IDS[dry_humor]="TC0Zp7WVFzhA8zpTlRqV"
VOICE_SLUGS[dry_humor]="aria"
VOICE_IDS[poetic]="TC0Zp7WVFzhA8zpTlRqV"
VOICE_SLUGS[poetic]="aria"

# Pirate Marshal - for pirate
VOICE_IDS[pirate]="PPzYpIqttlTYA83688JI"
VOICE_SLUGS[pirate]="pirate-marshal"

# Dr. Von Fusion - for robot
VOICE_IDS[robot]="yjJ45q8TVCrtMhEKurxY"
VOICE_SLUGS[robot]="dr-von-fusion"

# Grandpa Spuds Oxley - for grandpa and moody
VOICE_IDS[grandpa]="NOpBlnGInO9m6vDvFkFC"
VOICE_SLUGS[grandpa]="grandpa-spuds"
VOICE_IDS[moody]="NOpBlnGInO9m6vDvFkFC"
VOICE_SLUGS[moody]="grandpa-spuds"

# Ms. Walker - for dramatic and sassy
VOICE_IDS[dramatic]="DLsHlh26Ugcm6ELvS0qi"
VOICE_SLUGS[dramatic]="ms-walker"
VOICE_IDS[sassy]="DLsHlh26Ugcm6ELvS0qi"
VOICE_SLUGS[sassy]="ms-walker"

# Cowboy Bob - for funny
VOICE_IDS[funny]="KTPVrSVAEUSJRClDzBw7"
VOICE_SLUGS[funny]="cowboy-bob"

# Michael - for professional
VOICE_IDS[professional]="U1Vk2oyatMdYs096Ety7"
VOICE_SLUGS[professional]="michael"

# Matthew Schmitz - for surfer_dude
VOICE_IDS[surfer_dude]="0SpgpJ4D3MpHCiWdyTg3"
VOICE_SLUGS[surfer_dude]="matthew-schmitz"

# Amy - for millennial
VOICE_IDS[millennial]="bhJUNIXWQQ94l8eI2VUf"
VOICE_SLUGS[millennial]="amy"

echo "========================================"
echo "ElevenLabs Voice Sample Generator"
echo "========================================"
echo ""

# Generate samples for each personality
for personality in "${!PERSONALITIES[@]}"; do
  echo ""
  echo "==================================="
  echo "Generating: $personality"
  echo "==================================="

  TEXT="${PERSONALITIES[$personality]}"
  VOICE_ID="${VOICE_IDS[$personality]}"
  VOICE_SLUG="${VOICE_SLUGS[$personality]}"
  OUTPUT_FILE="/home/fire/claude/AgentVibes/agentvibes.org/public/audio/elevenlabs/${VOICE_SLUG}-${personality}.mp3"

  if [ -z "$VOICE_ID" ]; then
    echo "⚠️  No voice ID mapped for $personality, skipping..."
    continue
  fi

  if [[ "$VOICE_ID" == *"_VOICE_ID"* ]]; then
    echo "⚠️  Voice ID placeholder not replaced for $personality, skipping..."
    echo "    Please update the VOICE_IDS array with actual ElevenLabs voice IDs"
    continue
  fi

  echo "  Voice: $VOICE_SLUG"
  echo "  Text: ${TEXT:0:50}..."
  echo "  Output: $OUTPUT_FILE"

  # Call ElevenLabs API using curl
  curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "Accept: audio/mpeg" \
    -H "Content-Type: application/json" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
    -d "{
      \"text\": \"${TEXT}\",
      \"model_id\": \"eleven_monolingual_v1\",
      \"voice_settings\": {
        \"stability\": 0.5,
        \"similarity_boost\": 0.75
      }
    }" \
    --output "$OUTPUT_FILE"

  if [ $? -eq 0 ]; then
    echo "✅ Completed $personality ($VOICE_SLUG)!"
  else
    echo "❌ Failed to generate $personality"
  fi

  # Add a small delay to respect API rate limits
  sleep 1
done

echo ""
echo "================================================"
echo "✅ ELEVENLABS PERSONALITY SAMPLES GENERATION COMPLETE!"
echo "================================================"
echo "Files saved to: agentvibes.org/public/audio/elevenlabs/"
echo ""
echo "NEXT STEPS:"
echo "1. Replace placeholder VOICE_IDs in this script with actual ElevenLabs voice IDs"
echo "2. You can find your voice IDs at: https://api.elevenlabs.io/v1/voices"
echo "3. Run this command to list your voices:"
echo "   curl -X GET https://api.elevenlabs.io/v1/voices -H \"xi-api-key: \$ELEVENLABS_API_KEY\""
echo ""
