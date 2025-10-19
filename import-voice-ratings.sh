#!/bin/bash

# AgentVibes - Import Voice Ratings and Set Default Voices per Personality
# This script reads exported ratings JSON and configures default voices for each personality

RATINGS_FILE="$1"

if [[ -z "$RATINGS_FILE" ]]; then
    echo "Usage: $0 <ratings-file.json>"
    echo ""
    echo "Example:"
    echo "  ./import-voice-ratings.sh piper-agentvibes-ratings-2025-10-18.json"
    exit 1
fi

if [[ ! -f "$RATINGS_FILE" ]]; then
    echo "❌ File not found: $RATINGS_FILE"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed"
    echo "Install with: sudo apt install jq"
    exit 1
fi

echo "🎤 AgentVibes Voice Ratings Importer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Reading ratings from: $RATINGS_FILE"
echo ""

# Voice number to name mapping for 16Speakers model
declare -A VOICE_NAMES=(
    [0]="Cori Samuel"
    [1]="Kara Shallenberg"
    [2]="Kristin Hughes"
    [3]="Maria Kasper"
    [4]="Mike Pelton"
    [5]="Mark Nelson"
    [6]="Michael Scherer"
    [7]="James K White"
    [8]="Rose Ibex"
    [9]="ProgressingAmerica"
    [10]="Steve C"
    [11]="Owlivia"
    [12]="Paul Hampton"
    [13]="Jennifer Dorr"
    [14]="Emily Cripps"
    [15]="Martin Clifton"
)

# Convert voice number to Piper voice ID format
voice_num_to_id() {
    local num="$1"
    if [[ "$num" =~ ^[0-9]+$ ]]; then
        # It's a speaker number - use 16Speakers multi-voice model
        echo "16Speakers#${num}"
    else
        # It's already a voice name/slug
        echo "$num"
    fi
}

# Get voice display name
get_voice_display_name() {
    local voice_id="$1"
    if [[ "$voice_id" == 16Speakers#* ]]; then
        local num="${voice_id#16Speakers#}"
        echo "${VOICE_NAMES[$num]}"
    elif [[ "$voice_id" == "en_gb_alan" ]]; then
        echo "English GB - Alan"
    elif [[ "$voice_id" == "en_gb_semaine" ]]; then
        echo "English GB - Semaine"
    elif [[ "$voice_id" == "es_mx_claude" ]]; then
        echo "Spanish MX - Claude"
    else
        echo "$voice_id"
    fi
}

# Extract top-rated voice for each personality
echo "📊 Top-Rated Voices by Personality:"
echo ""

PERSONALITIES=$(jq -r '.ratings | keys[]' "$RATINGS_FILE")
MAPPING_FILE=".claude/personality-voice-defaults.json"

mkdir -p .claude

# Start building the mapping
echo "{" > "$MAPPING_FILE"
echo '  "version": "1.0",' >> "$MAPPING_FILE"
echo '  "description": "Default Piper voice assignments for each personality",' >> "$MAPPING_FILE"
echo '  "mappings": {' >> "$MAPPING_FILE"

FIRST=true

for personality in $PERSONALITIES; do
    # Get all ratings for this personality
    ratings=$(jq -r ".ratings.\"$personality\" | to_entries | sort_by(.value) | reverse | .[0]" "$RATINGS_FILE")

    # Get the voice with highest rating
    top_voice=$(echo "$ratings" | jq -r '.key')
    top_rating=$(echo "$ratings" | jq -r '.value')

    if [[ -n "$top_voice" ]] && [[ "$top_voice" != "null" ]]; then
        # Convert to Piper voice ID
        voice_id=$(voice_num_to_id "$top_voice")
        voice_name=$(get_voice_display_name "$voice_id")

        echo "  ✅ $personality: $voice_name (rating: $top_rating/10)"

        # Add to JSON mapping (with proper comma handling)
        if [[ "$FIRST" == "false" ]]; then
            echo "," >> "$MAPPING_FILE"
        fi
        FIRST=false

        echo -n "    \"$personality\": {" >> "$MAPPING_FILE"
        echo -n "\"voice\": \"$voice_id\", " >> "$MAPPING_FILE"
        echo -n "\"rating\": $top_rating, " >> "$MAPPING_FILE"
        echo -n "\"display_name\": \"$voice_name\"" >> "$MAPPING_FILE"
        echo -n "}" >> "$MAPPING_FILE"
    fi
done

# Close JSON
echo "" >> "$MAPPING_FILE"
echo "  }" >> "$MAPPING_FILE"
echo "}" >> "$MAPPING_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Voice mappings saved to: $MAPPING_FILE"
echo ""
echo "📝 How to use these defaults:"
echo ""
echo "   When you select a personality, AgentVibes will now automatically"
echo "   use your top-rated voice for that personality!"
echo ""
echo "   Example:"
echo "     /agent-vibes:personality flirty"
echo "     → Uses: $(jq -r '.mappings.flirty.display_name // "Not rated"' "$MAPPING_FILE" 2>/dev/null)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
