#!/bin/bash

cd /home/fire/claude/AgentVibes

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

# Generate samples for each personality for a single voice
VOICE_MODEL=$1
VOICE_NAME=$2

if [ -z "$VOICE_MODEL" ] || [ -z "$VOICE_NAME" ]; then
  echo "Usage: $0 <path-to-voice-model> <voice-name-slug>"
  echo "Example: $0 /home/fire/claude/piper-voices/es/es_MX/claude/high/es_MX-claude-high.onnx es_mx_claude"
  exit 1
fi

for personality in "${!PERSONALITIES[@]}"; do
  echo ""
  echo "==================================="
  echo "Generating $VOICE_NAME - $personality"
  echo "==================================="

  TEXT="${PERSONALITIES[$personality]}"

  echo "$TEXT" | piper \
    --model "$VOICE_MODEL" \
    --output_file /home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/single_${VOICE_NAME}_${personality}.wav

  echo "✅ Completed $personality for $VOICE_NAME!"
done

echo ""
echo "================================================"
echo "✅ ALL 16 PERSONALITY SAMPLES GENERATED FOR $VOICE_NAME!"
echo "================================================"
echo ""
