#!/bin/bash

# AgentVibes Voice Tester - Quick Launch Script
# Starts a local web server to run the voice tester

PORT=8000

echo "🎤 AgentVibes Voice Tester"
echo "=========================="
echo ""

# Check if audio files exist
if [ ! -d "audio/piper-voices" ] || [ -z "$(ls -A audio/piper-voices 2>/dev/null)" ]; then
    echo "⚠️  No audio files found in audio/piper-voices/"
    echo ""
    echo "Run this first to copy audio samples:"
    echo "  ./setup-audio.sh"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

# Try to find an available web server
if command -v python3 &> /dev/null; then
    echo "🚀 Starting Python web server on port $PORT..."
    echo "📱 Open your browser to: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "🚀 Starting Python web server on port $PORT..."
    echo "📱 Open your browser to: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    echo "🚀 Starting PHP web server on port $PORT..."
    echo "📱 Open your browser to: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    php -S localhost:$PORT
else
    echo "❌ No web server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  - Python 3: sudo apt install python3"
    echo "  - PHP: sudo apt install php"
    echo "  - Node.js: sudo apt install nodejs && npm install -g http-server"
    echo ""
    exit 1
fi
