#!/bin/bash

# Array of voice names
voices=(
  "Cori_Samuel"
  "Kara_Shallenberg"
  "Kristin_Hughes"
  "Maria_Kasper"
  "Mike_Pelton"
  "Mark_Nelson"
  "Michael_Scherer"
  "James_K_White"
  "Rose_Ibex"
  "progressingamerica"
  "Steve_C"
  "Owlivia"
  "Paul_Hampton"
  "Jennifer_Dorr"
  "Emily_Cripps"
  "Martin_Clifton"
)

# Array of personalities
personalities=(
  "sarcastic"
  "angry"
  "flirty"
  "pirate"
  "zen"
  "robot"
  "grandpa"
  "dry-humor"
  "dramatic"
  "funny"
  "professional"
  "sassy"
  "surfer-dude"
  "poetic"
  "moody"
  "millennial"
)

# Array of sample texts for each personality
texts=(
  "Oh Wonderful. Even more documentation surgery. Let me just carve up this readme like I'm performing open heart surgery on a markdown file. Absolutely delightful."
  "ARE YOU KIDDING ME?! Another config file?! I've had it up to HERE with these settings!"
  "Hey there, handsome. I'd love to help you debug that code... maybe over dinner?"
  "Arrr! Avast ye landlubbers! This here code be as fine as treasure from Davy Jones' locker!"
  "Breathe in... breathe out... The code flows like water. All bugs are but ripples in the stream."
  "PROCESSING REQUEST. BEEP BOOP. EXECUTING TASK WITH MAXIMUM EFFICIENCY. HUMAN SATISFACTION: OPTIMAL."
  "Back in my day, we didn't have all these fancy frameworks. We wrote our code uphill both ways!"
  "Oh sure, another merge conflict. How unexpected. Almost as surprising as the sun rising."
  "THIS! IS! SPARTA! I mean... this is your code review. VERY DRAMATIC CODE REVIEW!"
  "Why did the programmer quit? Because they didn't get arrays! Get it? A raise! I crack myself up!"
  "I have analyzed your request and prepared a comprehensive solution following industry best practices."
  "Oh honey, that code is a MESS. But don't worry, I'll fix it with style and sass!"
  "Dude! This code is totally gnarly! Like, catching the perfect wave of functionality, bro!"
  "In lines of code, a story unfolds. Each function, a verse in the poetry of logic."
  "Ugh. Fine. I'll do it. Not like I had anything better to do anyway. Whatever."
  "Okay so like, literally this is giving me major vibes. The code? It's giving main character energy, no cap."
)

# Output directory
OUTPUT_DIR="/home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices"
mkdir -p "$OUTPUT_DIR"

# Generate samples
for i in "${!voices[@]}"; do
  voice="${voices[$i]}"
  personality="${personalities[$i]}"
  text="${texts[$i]}"

  echo "Generating ${voice} with ${personality} personality..."

  # Use AgentVibes CLI to generate TTS with personality
  # This assumes agentvibes is installed and configured
  output_file="${OUTPUT_DIR}/speaker_${i}_${voice}_${personality}.wav"

  echo "$text" | npx agentvibes tts --voice "$voice" --personality "$personality" --output "$output_file" 2>/dev/null || echo "Skipped $voice (not available)"
done

echo "Done! Generated samples in $OUTPUT_DIR"
