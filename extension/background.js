// AgentVibes Voice - Background Service Worker
// Handles TTS operations via Edge TTS API (primary) and localhost server (fallback)

const AGENTVIBES_SERVER = 'http://localhost:3000';

// Edge TTS Configuration
const EDGE_TTS_CONFIG = {
  wssUrl: 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
  trustedClientToken: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
  voiceListUrl: 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
};

// Default Edge TTS voices
const DEFAULT_EDGE_VOICES = [
  { id: 'en-US-AndrewNeural', name: 'Andrew (US Male)', locale: 'en-US', gender: 'Male' },
  { id: 'en-US-EmmaNeural', name: 'Emma (US Female)', locale: 'en-US', gender: 'Female' },
  { id: 'en-US-BrianNeural', name: 'Brian (US Male)', locale: 'en-US', gender: 'Male' },
  { id: 'en-UK-SoniaNeural', name: 'Sonia (UK Female)', locale: 'en-GB', gender: 'Female' },
  { id: 'en-UK-RyanNeural', name: 'Ryan (UK Male)', locale: 'en-GB', gender: 'Male' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)', locale: 'en-AU', gender: 'Female' },
  { id: 'en-AU-WilliamNeural', name: 'William (AU Male)', locale: 'en-AU', gender: 'Male' },
  { id: 'en-CA-ClaraNeural', name: 'Clara (CA Female)', locale: 'en-CA', gender: 'Female' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (IN Female)', locale: 'en-IN', gender: 'Female' },
  { id: 'en-IE-EmilyNeural', name: 'Emily (IE Female)', locale: 'en-IE', gender: 'Female' }
];

// Cached voice list
let cachedEdgeVoices = null;

// Generate WebSocket connection URL with proper headers
function generateEdgeTTSUrl() {
  const timestamp = Date.now();
  const trustedToken = EDGE_TTS_CONFIG.trustedClientToken;
  const connectId = generateConnectId();

  return `${EDGE_TTS_CONFIG.wssUrl}?trustedclienttoken=${trustedToken}&ConnectionId=${connectId}&Gen=X-SSML&X-ConnectionId=${connectId}`;
}

// Generate a random connection ID
function generateConnectId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate SSML for speech synthesis
function generateSSML(text, voiceId, rate = '0%', pitch = '0%') {
  const voice = voiceId || 'en-US-AndrewNeural';

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voice}">
      <prosody rate="${rate}" pitch="${pitch}">
        ${escapeXml(text)}
      </prosody>
    </voice>
  </speak>`;
}

// Escape XML special characters
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert audio rate (1.0 = normal) to SSML rate percentage
function convertSpeedToRate(speed) {
  // Convert 0.5-2.0 range to SSML percentage
  // 1.0 = 0%, 0.5 = -50%, 2.0 = +100%
  const percentage = Math.round((speed - 1) * 100);
  return `${percentage >= 0 ? '+' : ''}${percentage}%`;
}

// Convert pitch (1.0 = normal) to SSML pitch percentage
function convertPitchToSSML(pitch) {
  // Convert 0.5-2.0 range to SSML pitch
  // 1.0 = 0%, 0.5 = -50%, 2.0 = +50%
  const percentage = Math.round((pitch - 1) * 50);
  return `${percentage >= 0 ? '+' : ''}${percentage}%`;
}

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
    fetchVoicesWithEdgeFallback(sendResponse);
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

// Handle TTS request - Try Edge TTS first, fall back to server
async function handleTTSRequest(data, sendResponse) {
  console.log('[AgentVibes Voice] TTS request:', { text: data.text?.substring(0, 50) + '...', voice: data.voice });

  // Try Edge TTS first (faster, no server roundtrip)
  try {
    const result = await handleEdgeTTS(data);
    console.log('[AgentVibes Voice] Edge TTS successful');
    sendResponse(result);
    return;
  } catch (edgeError) {
    console.log('[AgentVibes Voice] Edge TTS failed, trying server fallback:', edgeError.message);
  }

  // Fall back to server-based TTS
  try {
    const result = await handleServerTTS(data);
    console.log('[AgentVibes Voice] Server TTS successful');
    sendResponse(result);
  } catch (serverError) {
    console.error('[AgentVibes Voice] Server TTS also failed:', serverError);
    sendResponse({
      success: false,
      error: `TTS failed: ${serverError.message}`
    });
  }
}

// Handle TTS via Edge WebSocket API
async function handleEdgeTTS(data) {
  return new Promise((resolve, reject) => {
    const wsUrl = generateEdgeTTSUrl();
    const audioChunks = [];
    let ws = null;
    let timeoutId = null;
    let isResolved = false;

    // Set timeout for the entire operation
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        if (ws) ws.close();
        reject(new Error('Edge TTS timeout'));
      }
    }, 15000);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[AgentVibes Voice] Edge TTS WebSocket connected');

        // Prepare the request
        const rate = convertSpeedToRate(data.speed || 1.0);
        const pitch = convertPitchToSSML(data.pitch || 1.0);
        const ssml = generateSSML(data.text, data.voice, rate, pitch);

        // Send turn start message
        const turnStart = {
          'context': {
            'synthesis': {
              'audio': {
                'metadataoptions': {
                  'sentenceBoundaryEnabled': 'false',
                  'wordBoundaryEnabled': 'false'
                },
                'outputFormat': 'audio-24khz-48kbitrate-mono-mp3'
              }
            }
          }
        };

        // Send speech config
        const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify({
          'context': {
            'synthesis': {
              'audio': {
                'metadataoptions': {
                  'sentenceBoundaryEnabled': 'false',
                  'wordBoundaryEnabled': 'false'
                },
                'outputFormat': 'audio-24khz-48kbitrate-mono-mp3'
              }
            }
          }
        })}`;

        // Send synthesis request
        const synthesisMessage = `X-RequestId:${generateConnectId()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;

        // Send messages
        ws.send(`Path:speech.config\r\nX-RequestId:${generateConnectId()}\r\nContent-Type:application/json; charset=utf-8\r\n\r\n${JSON.stringify(turnStart)}`);
        ws.send(synthesisMessage);
      };

      ws.onmessage = (event) => {
        // Check if it's a text message (header) or binary (audio data)
        if (typeof event.data === 'string') {
          // Text message - could be header or end marker
          if (event.data.includes('Path:turn.end')) {
            // Speech synthesis complete
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeoutId);
              ws.close();

              if (audioChunks.length === 0) {
                reject(new Error('No audio data received'));
                return;
              }

              // Combine all audio chunks
              const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
              const reader = new FileReader();

              reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];
                const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

                resolve({
                  success: true,
                  audioUrl: dataUrl,
                  voice: data.voice,
                  source: 'edge-tts',
                  processingTime: 'fast'
                });
              };

              reader.onerror = () => {
                reject(new Error('Failed to encode audio'));
              };

              reader.readAsDataURL(audioBlob);
            }
          }
        } else {
          // Binary message - audio data
          // The first 2 bytes typically contain header length
          audioChunks.push(event.data);
        }
      };

      ws.onerror = (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          reject(new Error('Edge TTS WebSocket error'));
        }
      };

      ws.onclose = () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);

          if (audioChunks.length > 0) {
            // We have some audio, try to return it
            const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            const reader = new FileReader();

            reader.onloadend = () => {
              const base64Audio = reader.result.split(',')[1];
              const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

              resolve({
                success: true,
                audioUrl: dataUrl,
                voice: data.voice,
                source: 'edge-tts',
                processingTime: 'fast'
              });
            };

            reader.onerror = () => {
              reject(new Error('Failed to encode audio after close'));
            };

            reader.readAsDataURL(audioBlob);
          } else {
            reject(new Error('WebSocket closed without audio'));
          }
        }
      };
    } catch (error) {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        if (ws) ws.close();
        reject(error);
      }
    }
  });
}

// Handle TTS via localhost server (fallback)
async function handleServerTTS(data) {
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

    return {
      success: true,
      audioUrl: absoluteAudioUrl,
      voice: result.voice,
      source: 'server',
      processingTime: result.processingTime
    };
  } else {
    throw new Error(result.error || 'Unknown TTS error');
  }
}

// Fetch voices with Edge TTS fallback
async function fetchVoicesWithEdgeFallback(sendResponse) {
  // Try to fetch from Edge TTS API first
  try {
    if (!cachedEdgeVoices) {
      const response = await fetch(EDGE_TTS_CONFIG.voiceListUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const voices = await response.json();
        if (voices && voices.length > 0) {
          // Transform Edge TTS voices to our format
          cachedEdgeVoices = voices
            .filter(v => v.Locale && v.Locale.startsWith('en')) // Filter to English voices for now
            .map(v => ({
              id: v.ShortName,
              name: `${v.FriendlyName || v.DisplayName || v.ShortName} (${v.Locale})`,
              locale: v.Locale,
              gender: v.Gender,
              source: 'edge-tts'
            }));

          console.log('[AgentVibes Voice] Fetched', cachedEdgeVoices.length, 'Edge TTS voices');
        }
      }
    }

    // If we have cached Edge voices, use them
    if (cachedEdgeVoices && cachedEdgeVoices.length > 0) {
      sendResponse({
        success: true,
        voices: cachedEdgeVoices,
        source: 'edge-tts'
      });
      return;
    }
  } catch (error) {
    console.log('[AgentVibes Voice] Edge TTS voice fetch failed, using defaults:', error.message);
  }

  // Fall back to default voices
  sendResponse({
    success: true,
    voices: DEFAULT_EDGE_VOICES,
    source: 'edge-tts-defaults'
  });
}

// Check if AgentVibes server is reachable (for fallback purposes)
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

// Fetch audio from HTTP URL and return as base64 data URL (bypasses Mixed Content)
async function fetchAudioAsDataUrl(audioUrl, sendResponse) {
  try {
    console.log('[AgentVibes Voice] Fetching audio from:', audioUrl);

    // If it's already a data URL, just return it
    if (audioUrl.startsWith('data:')) {
      sendResponse({
        success: true,
        dataUrl: audioUrl
      });
      return;
    }

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
      voice: 'en-US-AndrewNeural', // Default to Edge TTS voice
      autoSpeak: true,
      spokenMessages: {}, // Track already-spoken messages
      ttsSource: 'edge-tts' // Prefer Edge TTS by default
    });

    console.log('AgentVibes Voice extension installed');
  }
});

// Optional: Show notification when server comes online/offline (for fallback info)
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

// Check server status periodically (every 30 seconds) - for fallback monitoring only
setInterval(monitorServer, 30000);
