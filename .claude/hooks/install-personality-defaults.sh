#!/bin/bash

# AgentVibes - Install Default Personality Voice Mappings
# This script copies the default personality-voice mappings to user's config

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Determine target directory (project-local or global)
if [[ -n "$CLAUDE_PROJECT_DIR" ]] && [[ -d "$CLAUDE_PROJECT_DIR/.claude" ]]; then
  TARGET_DIR="$CLAUDE_PROJECT_DIR/.claude"
elif [[ -d "$CLAUDE_DIR" ]] && [[ "$CLAUDE_DIR" != "$HOME/.claude" ]]; then
  TARGET_DIR="$CLAUDE_DIR"
else
  TARGET_DIR="$HOME/.claude"
fi

DEFAULT_FILE="$CLAUDE_DIR/config/personality-voice-defaults.default.json"
TARGET_FILE="$TARGET_DIR/personality-voice-defaults.json"

# Check if default file exists
if [[ ! -f "$DEFAULT_FILE" ]]; then
  echo "⚠️  Default personality mappings not found at: $DEFAULT_FILE"
  exit 1
fi

# Check if user already has custom mappings
if [[ -f "$TARGET_FILE" ]]; then
  echo "✅ Personality voice mappings already configured"
  echo "   Location: $TARGET_FILE"
  echo ""
  read -p "   Overwrite with defaults? [y/N]: " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Keeping existing mappings"
    exit 0
  fi
fi

# Copy default mappings
mkdir -p "$TARGET_DIR"
cp "$DEFAULT_FILE" "$TARGET_FILE"

echo "✅ Installed default personality voice mappings"
echo "   Location: $TARGET_FILE"
echo ""
echo "📋 Default Voices:"
echo ""

if command -v jq &> /dev/null; then
  jq -r '.mappings | to_entries[] | "   • \(.key): \(.value.display_name)"' "$TARGET_FILE" | sort
else
  echo "   (Install jq to see voice list: sudo apt install jq)"
fi

echo ""
echo "💡 These defaults provide curated voices for each personality:"
echo "   - Uses 16Speakers multi-voice model (16 different speakers)"
echo "   - Includes British English voices (Alan, Semaine)"
echo "   - Automatically selected when switching personalities"
echo ""
echo "To customize: Edit $TARGET_FILE"
echo "Or export new ratings from the voice tester!"
