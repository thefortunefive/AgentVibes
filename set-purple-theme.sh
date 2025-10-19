#!/bin/bash

# AgentVibes - Set Purple Workspace Theme
# This script ensures VS Code workspace colors stick (purple header/footer)

WORKSPACE_FILE="./AgentVibes.code-workspace"

if [[ ! -f "$WORKSPACE_FILE" ]]; then
    echo "❌ Workspace file not found: $WORKSPACE_FILE"
    echo "   Run this script from the AgentVibes root directory"
    exit 1
fi

echo "🎨 Setting AgentVibes Purple Theme"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is required but not installed"
    echo "   Install with: sudo apt install jq"
    exit 1
fi

# Backup workspace file
cp "$WORKSPACE_FILE" "${WORKSPACE_FILE}.backup"
echo "✅ Backed up workspace file to: ${WORKSPACE_FILE}.backup"

# Update workspace settings with complete purple theme
jq '.settings.workbench.colorCustomizations += {
  "statusBar.background": "#7c3aed",
  "statusBar.foreground": "#ffffff",
  "statusBar.noFolderBackground": "#7c3aed",
  "statusBar.debuggingBackground": "#8b5cf6",
  "statusBarItem.hoverBackground": "#8b5cf6",
  "statusBarItem.remoteBackground": "#7c3aed",
  "statusBarItem.remoteForeground": "#ffffff",
  "titleBar.activeBackground": "#7c3aed",
  "titleBar.activeForeground": "#ffffff",
  "titleBar.inactiveBackground": "#6d28d9",
  "titleBar.inactiveForeground": "#ffffffaa",
  "activityBar.background": "#1e1e1e",
  "activityBar.foreground": "#8b5cf6",
  "activityBar.activeBorder": "#a78bfa",
  "activityBar.inactiveForeground": "#8b5cf699",
  "editorGroupHeader.tabsBackground": "#2c2c2c",
  "tab.activeBorderTop": "#8b5cf6",
  "tab.activeBackground": "#8b5cf620",
  "tab.inactiveBackground": "#2c2c2c",
  "sideBarTitle.foreground": "#8b5cf6",
  "sideBarSectionHeader.background": "#8b5cf620",
  "sideBarSectionHeader.foreground": "#8b5cf6",
  "list.activeSelectionBackground": "#8b5cf640",
  "list.activeSelectionForeground": "#ffffff",
  "list.hoverBackground": "#8b5cf620",
  "list.inactiveSelectionBackground": "#8b5cf630",
  "tree.indentGuidesStroke": "#8b5cf640",
  "gitDecoration.addedResourceForeground": "#73c991",
  "gitDecoration.modifiedResourceForeground": "#8b5cf6",
  "gitDecoration.deletedResourceForeground": "#ff6b6b",
  "gitDecoration.untrackedResourceForeground": "#ffd93d",
  "gitDecoration.ignoredResourceForeground": "#606060",
  "gitDecoration.conflictingResourceForeground": "#ff69b4",
  "panel.background": "#1e1e1e",
  "panel.border": "#8b5cf640",
  "panelTitle.activeBorder": "#8b5cf6",
  "panelTitle.activeForeground": "#ffffff",
  "panelTitle.inactiveForeground": "#8b5cf699",
  "terminal.background": "#1e1e1e",
  "terminal.foreground": "#ffffff",
  "terminalCursor.foreground": "#8b5cf6",
  "badge.background": "#7c3aed",
  "badge.foreground": "#ffffff",
  "button.background": "#7c3aed",
  "button.foreground": "#ffffff",
  "button.hoverBackground": "#8b5cf6"
}' "$WORKSPACE_FILE" > "${WORKSPACE_FILE}.tmp"

# Replace original file
mv "${WORKSPACE_FILE}.tmp" "$WORKSPACE_FILE"

echo "✅ Updated workspace color theme"
echo ""
echo "🎨 Purple Theme Applied:"
echo "   • Status Bar: Purple (#7c3aed)"
echo "   • Title Bar: Purple (#7c3aed)"
echo "   • Activity Bar: Purple accents (#8b5cf6)"
echo "   • Tabs: Purple borders (#8b5cf6)"
echo "   • All UI elements: Purple highlights"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Next Steps:"
echo ""
echo "1. Close VS Code completely"
echo "2. Reopen workspace: code AgentVibes.code-workspace"
echo "3. Colors should persist!"
echo ""
echo "💡 If colors still reset:"
echo "   • Check user settings.json doesn't override these"
echo "   • Location: ~/.config/Code/User/settings.json"
echo "   • Remove any conflicting colorCustomizations"
echo ""
echo "To revert: cp ${WORKSPACE_FILE}.backup $WORKSPACE_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
