#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

cd /home/fire/claude/AgentVibes

echo -e "${BOLD}${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         AgentVibes Voice Sample Regeneration Script         ║"
echo "║                  Without Speaker Introductions               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Define all personality texts (WITHOUT "Hi I'm speaker X" prefix)
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

# Progress bar function
draw_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "\r${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] ${BOLD}%3d%%${NC} ${YELLOW}(%d/%d)${NC}" "$percentage" "$current" "$total"
}

# Calculate totals
TOTAL_MULTI_SPEAKER=$((16 * 16))  # 16 voices × 16 personalities
TOTAL_SINGLE_SPEAKER=$((3 * 16))  # 3 voices × 16 personalities
TOTAL_FILES=$((TOTAL_MULTI_SPEAKER + TOTAL_SINGLE_SPEAKER))

echo -e "${BOLD}${BLUE}Total files to generate: ${CYAN}$TOTAL_FILES${NC}"
echo -e "${BLUE}  - Multi-speaker (16 voices): ${CYAN}$TOTAL_MULTI_SPEAKER${NC}"
echo -e "${BLUE}  - Single-speaker (3 voices): ${CYAN}$TOTAL_SINGLE_SPEAKER${NC}"
echo ""

current_file=0

# ============================================================================
# PART 1: Multi-Speaker Voices (16 speakers)
# ============================================================================

echo -e "${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${PURPLE}  PART 1: Generating Multi-Speaker Voice Samples (16 voices)${NC}"
echo -e "${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for personality in "${!PERSONALITIES[@]}"; do
    TEXT="${PERSONALITIES[$personality]}"

    echo -e "${BOLD}${GREEN}Personality: ${YELLOW}$personality${NC}"

    for i in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        ((current_file++))

        draw_progress_bar $current_file $TOTAL_FILES

        echo "$TEXT" | piper \
            --model /home/fire/claude/AgentVibes/mcp-server/voices/16Speakers.onnx \
            --speaker $i \
            --output_file /home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/test_${i}_${personality}.wav \
            2>/dev/null
    done

    echo "" # New line after progress bar
done

echo ""
echo -e "${GREEN}✅ Completed multi-speaker generation: ${CYAN}$TOTAL_MULTI_SPEAKER files${NC}"
echo ""

# ============================================================================
# PART 2: Single-Speaker Voices
# ============================================================================

echo -e "${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${PURPLE}  PART 2: Generating Single-Speaker Voice Samples (3 voices)${NC}"
echo -e "${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Define single-speaker voices
declare -A SINGLE_VOICES
SINGLE_VOICES["es_mx_claude"]="/home/fire/claude/piper-voices/es/es_MX/claude/high/es_MX-claude-high.onnx"
SINGLE_VOICES["en_gb_alan"]="/home/fire/claude/piper-voices/en/en_GB/alan/medium/en_GB-alan-medium.onnx"
SINGLE_VOICES["en_gb_semaine"]="/home/fire/claude/piper-voices/en/en_GB/semaine/medium/en_GB-semaine-medium.onnx"

for voice_name in "${!SINGLE_VOICES[@]}"; do
    voice_model="${SINGLE_VOICES[$voice_name]}"

    echo -e "${BOLD}${GREEN}Voice: ${YELLOW}$voice_name${NC}"

    for personality in "${!PERSONALITIES[@]}"; do
        ((current_file++))

        TEXT="${PERSONALITIES[$personality]}"

        draw_progress_bar $current_file $TOTAL_FILES

        echo "$TEXT" | piper \
            --model "$voice_model" \
            --output_file /home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/single_${voice_name}_${personality}.wav \
            2>/dev/null
    done

    echo "" # New line after progress bar
done

echo ""
echo -e "${GREEN}✅ Completed single-speaker generation: ${CYAN}$TOTAL_SINGLE_SPEAKER files${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BOLD}${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ GENERATION COMPLETE!                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}${GREEN}Summary:${NC}"
echo -e "  ${CYAN}Total files generated: ${BOLD}${YELLOW}$TOTAL_FILES${NC}"
echo -e "  ${CYAN}Multi-speaker files: ${BOLD}${YELLOW}$TOTAL_MULTI_SPEAKER${NC} ${BLUE}(16 voices × 16 personalities)${NC}"
echo -e "  ${CYAN}Single-speaker files: ${BOLD}${YELLOW}$TOTAL_SINGLE_SPEAKER${NC} ${BLUE}(3 voices × 16 personalities)${NC}"
echo ""
echo -e "${GREEN}Output directory:${NC}"
echo -e "  ${YELLOW}/home/fire/claude/AgentVibes/agentvibes.org/public/audio/piper-voices/${NC}"
echo ""
echo -e "${BOLD}${CYAN}🎤 All voice samples regenerated without speaker introductions!${NC}"
echo ""
