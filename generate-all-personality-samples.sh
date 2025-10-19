#!/bin/bash

cd /home/fire/claude/AgentVibes

# Define all personality texts
declare -A PERSONALITIES

PERSONALITIES[angry]="Hi I'm speaker SPEAKER_NUM ARE YOU KIDDING ME?! Another bug in production! This code is absolutely UNACCEPTABLE! We're fixing this RIGHT NOW!"

PERSONALITIES[flirty]="Hi I'm speaker SPEAKER_NUM Well hello there, gorgeous codebase. You're looking absolutely stunning today. Maybe we could spend some quality time together... debugging?"

PERSONALITIES[pirate]="Hi I'm speaker SPEAKER_NUM Ahoy matey! Thar be bugs in these waters! Hoist the main sail and prepare to plunder this pull request, ye scurvy developer!"

PERSONALITIES[zen]="Hi I'm speaker SPEAKER_NUM Breathe in the bugs. Breathe out the fixes. The code flows like water. We are one with the repository. All errors are merely opportunities for growth."

PERSONALITIES[robot]="Hi I'm speaker SPEAKER_NUM BEEP BOOP. PROCESSING REQUEST. HUMAN EMOTION DETECTED. INITIATING TASK COMPLETION PROTOCOL. PROBABILITY OF SUCCESS: 99.7 PERCENT."

PERSONALITIES[grandpa]="Hi I'm speaker SPEAKER_NUM Back in my day, we didn't have all these fancy frameworks! We coded uphill, both ways, in the snow! And we LIKED it!"

PERSONALITIES[dry_humor]="Hi I'm speaker SPEAKER_NUM Fascinating. Another merge conflict. How utterly thrilling. I can barely contain my excitement. This is exactly what I went to computer science school for."

PERSONALITIES[dramatic]="Hi I'm speaker SPEAKER_NUM THIS... IS... THE MOST IMPORTANT COMMIT OF OUR LIVES! The fate of the ENTIRE APPLICATION rests upon this single line of code! BEHOLD!"

PERSONALITIES[funny]="Hi I'm speaker SPEAKER_NUM Why did the developer quit their job? Because they didn't get arrays! Get it? A RAISE! Haha! But seriously, this code is hilarious!"

PERSONALITIES[professional]="Hi I'm speaker SPEAKER_NUM Per our previous discussion, I have completed the code review and identified three actionable items for optimization. Please advise on next steps."

PERSONALITIES[sassy]="Hi I'm speaker SPEAKER_NUM Oh honey, did you REALLY just push that to main? Without running tests? Mmm-hmm. That's cute. Real cute. We need to talk."

PERSONALITIES[surfer_dude]="Hi I'm speaker SPEAKER_NUM Dude! This code is totally gnarly! Like, riding the wave of optimization, bro! Let's catch some sick performance improvements!"

PERSONALITIES[poetic]="Hi I'm speaker SPEAKER_NUM Like whispers through silicon dreams, the code flows eternal. Each function a verse, each variable a rhyme. We write not mere programs, but digital poetry."

PERSONALITIES[moody]="Hi I'm speaker SPEAKER_NUM Whatever. I guess I'll fix this bug. Not like anyone appreciates my work anyway. Why do I even bother? *sigh* Fine. Let's get this over with."

PERSONALITIES[millennial]="Hi I'm speaker SPEAKER_NUM I literally can't even right now. This code is giving me anxiety. I need coffee and avocado toast to deal with this. Can we Slack about it later?"

# Generate samples for each personality
for personality in "${!PERSONALITIES[@]}"; do
  echo ""
  echo "==================================="
  echo "Generating samples for: $personality"
  echo "==================================="

  TEXT="${PERSONALITIES[$personality]}"

  for i in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    echo "  Generating speaker $i for $personality..."
    CURRENT_TEXT="${TEXT//SPEAKER_NUM/$i}"
    echo "$CURRENT_TEXT" | piper \
      --model /home/fire/claude/AgentVibes/mcp-server/voices/16Speakers.onnx \
      --speaker $i \
      --output_file /home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/test_${i}_${personality}.wav
  done

  echo "✅ Completed $personality personality!"
done

echo ""
echo "================================================"
echo "✅ ALL 15 NEW PERSONALITY SAMPLES GENERATED!"
echo "================================================"
echo "Total files created: 240 (15 personalities × 16 voices)"
echo ""
