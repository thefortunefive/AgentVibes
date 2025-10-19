#!/bin/bash

cd /home/fire/claude/AgentVibes

TEXT="Hi, I'm speaker SPEAKER_NUM. Oh wonderful! Even more documentation surgery. Let me just carve up this readme like I'm performing open heart surgery on a markdown file. Absolutely delightful."

for i in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  echo "Generating speaker $i..."
  CURRENT_TEXT="${TEXT//SPEAKER_NUM/$i}"
  echo "$CURRENT_TEXT" | piper \
    --model /home/fire/claude/AgentVibes/mcp-server/voices/16Speakers.onnx \
    --speaker $i \
    --output_file /home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/test_${i}_sarcastic.wav
done

echo "✅ All 16 sarcastic samples generated!"
