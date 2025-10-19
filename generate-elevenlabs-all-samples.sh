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

# Define all personality texts
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

# Define all ElevenLabs voices
declare -A VOICES

VOICES[jessica]="flHkNRp1BlvT73UL6gyz"
VOICES[drill-sergeant]="vfaqCOvlrKi4Zp7C2IAm"
VOICES[aria]="TC0Zp7WVFzhA8zpTlRqV"
VOICES[pirate-marshal]="PPzYpIqttlTYA83688JI"
VOICES[dr-von-fusion]="yjJ45q8TVCrtMhEKurxY"
VOICES[grandpa-spuds]="NOpBlnGInO9m6vDvFkFC"
VOICES[ms-walker]="DLsHlh26Ugcm6ELvS0qi"
VOICES[cowboy-bob]="KTPVrSVAEUSJRClDzBw7"
VOICES[michael]="U1Vk2oyatMdYs096Ety7"
VOICES[matthew-schmitz]="0SpgpJ4D3MpHCiWdyTg3"
VOICES[amy]="bhJUNIXWQQ94l8eI2VUf"

echo "========================================"
echo "ElevenLabs ALL Samples Generator"
echo "========================================"
echo "Generating ALL 16 personalities for ALL 11 voices"
echo "Total files to generate: $((16 * 11)) = 176 files"
echo ""

TOTAL_COUNT=0
SUCCESS_COUNT=0
FAIL_COUNT=0

# Generate samples for each voice x personality combination
for voice_slug in "${!VOICES[@]}"; do
  VOICE_ID="${VOICES[$voice_slug]}"

  echo ""
  echo "=========================================="
  echo "Voice: $voice_slug (ID: $VOICE_ID)"
  echo "=========================================="

  for personality in "${!PERSONALITIES[@]}"; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    TEXT="${PERSONALITIES[$personality]}"
    OUTPUT_FILE="/home/fire/claude/AgentVibes/agentvibes.org/public/audio/elevenlabs/${voice_slug}-${personality}.mp3"

    # Skip if file already exists
    if [ -f "$OUTPUT_FILE" ]; then
      echo "⏭️  [$TOTAL_COUNT/176] Skipping $voice_slug - $personality (already exists)"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      continue
    fi

    echo "🎙️  [$TOTAL_COUNT/176] Generating: $voice_slug - $personality"

    # Call ElevenLabs API using curl
    curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
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

    if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
      FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
      if [ "$FILE_SIZE" -gt 1000 ]; then
        echo "   ✅ Success! ($(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo "${FILE_SIZE} bytes"))"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      else
        echo "   ❌ Failed! (File too small, likely an error)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        rm -f "$OUTPUT_FILE"
      fi
    else
      echo "   ❌ Failed to generate!"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    # Add a small delay to respect API rate limits
    sleep 0.5
  done
done

echo ""
echo "================================================"
echo "✅ GENERATION COMPLETE!"
echo "================================================"
echo "Total processed: $TOTAL_COUNT"
echo "Successful:      $SUCCESS_COUNT"
echo "Failed:          $FAIL_COUNT"
echo ""
echo "Files saved to: agentvibes.org/public/audio/elevenlabs/"
echo ""
