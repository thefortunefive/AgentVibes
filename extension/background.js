// AgentVibes Voice - Background Service Worker
// Handles CORS proxying for localhost requests and TTS operations

const AGENTVIBES_SERVER = 'http://localhost:3000';

// Message handlers from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TTS_REQUEST') {
    handleTTSRequest(request.data, sendResponse);
    return true; // Keep channel open for async
  }

  if (request.type === 'CHECK_SERVER_STATUS') {
    checkServerStatus(sendResponse);
    return true;
  }

  if (request.type === 'GET_VOICES') {
    fetchVoices(sendResponse);
    return true;
  }

  if (request.type === 'PLAY_AUDIO') {
    playAudio(request.audioUrl, sendResponse);
    return true;
  }

  if (request.type === 'FETCH_AUDIO') {
    fetchAudioAsDataUrl(request.url, sendResponse);
    return true;
  }
});

// Handle TTS request to localhost:3000/api/tts
async function handleTTSRequest(data, sendResponse) {
  try {
    const response = await fetch(`${AGENTVIBES_SERVER}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: data.text,
        voice: data.voice || null,
        speed: data.speed || 1.0,
        pitch: data.pitch || 1.0
      })
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.audioUrl) {
      // Convert relative URL to absolute
      const absoluteAudioUrl = result.audioUrl.startsWith('http')
        ? result.audioUrl
        : `${AGENTVIBES_SERVER}${result.audioUrl}`;

      sendResponse({
        success: true,
        audioUrl: absoluteAudioUrl,
        voice: result.voice,
        processingTime: result.processingTime
      });
    } else {
      sendResponse({
        success: false,
        error: result.error || 'Unknown TTS error'
      });
    }
  } catch (error) {
    console.error('TTS request error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to connect to AgentVibes server'
    });
  }
}

// Check if AgentVibes server is reachable
async function checkServerStatus(sendResponse) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${AGENTVIBES_SERVER}/api/status`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      sendResponse({
        online: true,
        data: data
      });
    } else {
      sendResponse({
        online: false,
        error: `Server returned ${response.status}`
      });
    }
  } catch (error) {
    sendResponse({
      online: false,
      error: error.name === 'AbortError' ? 'Connection timeout' : error.message
    });
  }
}

// Fetch available voices from server
async function fetchVoices(sendResponse) {
  try {
    const response = await fetch(`${AGENTVIBES_SERVER}/api/voices`, {
      method: 'GET'
    });

    if (response.ok) {
      const data = await response.json();
      sendResponse({
        success: true,
        voices: data.voices || []
      });
    } else {
      sendResponse({
        success: false,
        error: 'Failed to fetch voices'
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Fetch audio from HTTP URL and return as base64 data URL (bypasses Mixed Content)
async function fetchAudioAsDataUrl(audioUrl, sendResponse) {
  try {
    console.log('[AgentVibes Voice] Fetching audio from:', audioUrl);

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    // Get audio as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64 = arrayBufferToBase64(arrayBuffer);

    // Determine MIME type (default to audio/wav if not specified)
    const contentType = response.headers.get('content-type') || 'audio/wav';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('[AgentVibes Voice] Audio converted to data URL, length:', dataUrl.length);

    sendResponse({
      success: true,
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('[AgentVibes Voice] Failed to fetch audio:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to fetch audio'
    });
  }
}

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Play audio (background can play audio without user interaction restrictions)
async function playAudio(audioUrl, sendResponse) {
  try {
    // Pre-fetch audio to ensure it's cached
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch audio');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const audio = new Audio(objectUrl);

    audio.onended = () => {
      URL.revokeObjectURL(objectUrl);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      sendResponse({ success: false, error: 'Audio playback failed' });
    };

    await audio.play();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      enabled: true,
      volume: 1.0,
      voice: null,
      autoSpeak: true,
      spokenMessages: {} // Track already-spoken messages
    });

    console.log('AgentVibes Voice extension installed');
  }
});

// Optional: Show notification when server comes online/offline
let wasOnline = null;

async function monitorServer() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(`${AGENTVIBES_SERVER}/api/status`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (wasOnline === false) {
      // Server came back online
      chrome.runtime.sendMessage({ type: 'SERVER_STATUS_CHANGE', online: true });
    }
    wasOnline = true;
  } catch {
    if (wasOnline === true) {
      // Server went offline
      chrome.runtime.sendMessage({ type: 'SERVER_STATUS_CHANGE', online: false });
    }
    wasOnline = false;
  }
}

// Check server status periodically (every 30 seconds)
setInterval(monitorServer, 30000);
