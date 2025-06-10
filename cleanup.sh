#!/bin/bash
# Quick cleanup script for development iteration

echo "🧹 Cleaning up generated files and folders..."

# Remove common output directories
rm -rf agents/
rm -rf teams/
rm -rf docker/
rm -rf scripts/
rm -rf test-teams/
rm -rf test-output/
rm -rf e2e-output/

# Remove any .pid files
find . -name ".pid" -type f -delete

# Remove any built.flag files
find . -name "built.flag" -type f -delete

# Clean test outputs
rm -rf tests/test-output/
rm -rf tests/e2e-output/

echo "✅ Cleanup complete!"
echo ""
echo "You can now run 'agentic' for a fresh start"