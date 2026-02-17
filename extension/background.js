// AgentVibes Voice - Background Service Worker
// Handles CORS proxying for localhost requests, TTS operations, and Edge TTS WebSocket synthesis

const AGENTVIBES_SERVER = 'http://localhost:3000';

// ============================================
// Edge TTS Voice List
// ============================================

const EDGE_TTS_VOICES = [
  { name: 'en-US-AndrewNeural', locale: 'en-US', gender: 'Male', displayName: 'Andrew (US)' },
  { name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female', displayName: 'Jenny (US)' },
  { name: 'en-US-AriaNeural', locale: 'en-US', gender: 'Female', displayName: 'Aria (US)' },
  { name: 'en-US-GuyNeural', locale: 'en-US', gender: 'Male', displayName: 'Guy (US)' },
  { name: 'en-US-AvaNeural', locale: 'en-US', gender: 'Female', displayName: 'Ava (US)' },
  { name: 'en-US-BrianNeural', locale: 'en-US', gender: 'Male', displayName: 'Brian (US)' },
  { name: 'en-US-ChristopherNeural', locale: 'en-US', gender: 'Male', displayName: 'Christopher (US)' },
  { name: 'en-US-EmmaNeural', locale: 'en-US', gender: 'Female', displayName: 'Emma (US)' },
  { name: 'en-US-EricNeural', locale: 'en-US', gender: 'Male', displayName: 'Eric (US)' },
  { name: 'en-US-MichelleNeural', locale: 'en-US', gender: 'Female', displayName: 'Michelle (US)' },
  { name: 'en-US-RogerNeural', locale: 'en-US', gender: 'Male', displayName: 'Roger (US)' },
  { name: 'en-US-SteffanNeural', locale: 'en-US', gender: 'Male', displayName: 'Steffan (US)' },
  { name: 'en-GB-SoniaNeural', locale: 'en-GB', gender: 'Female', displayName: 'Sonia (UK)' },
  { name: 'en-GB-RyanNeural', locale: 'en-GB', gender: 'Male', displayName: 'Ryan (UK)' },
  { name: 'en-AU-NatashaNeural', locale: 'en-AU', gender: 'Female', displayName: 'Natasha (AU)' },
  { name: 'en-AU-WilliamNeural', locale: 'en-AU', gender: 'Male', displayName: 'William (AU)' }
];

// ============================================
// Edge TTS Client (WebSocket-based)
// Runs in background to avoid CSP issues in content scripts
// ============================================

class EdgeTTSClient {
  constructor() {
    this.ws = null;
    this.voice = 'en-US-AndrewNeural';
    this.locale = 'en-US';
    this.audioChunks = []; // Collect all audio chunks
    this.requestId = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.isSynthesizing = false;
    this.synthesisTimeout = null;
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 14) + 
           Math.random().toString(36).substring(2, 14);
  }

  setVoice(voiceName) {
    this.voice = voiceName || 'en-US-AndrewNeural';
    this.locale = voiceName ? voiceName.split('-').slice(0, 2).join('-') : 'en-US';
  }

  buildSSML(text, rate, volume) {
    // Escape XML special characters
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Convert rate to SSML format
    const rateValue = `${Math.round((rate || 1.0) * 100)}%`;
    const volumeValue = Math.round((volume || 1.0) * 100);

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.locale}">
  <voice name="${this.voice}">
    <prosody pitch="default" rate="${rateValue}" volume="${volumeValue}%">
      ${escapedText}
    </prosody>
  </voice>
</speak>`;
  }

  buildConfigMessage() {
    return JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: 'false',
              wordBoundaryEnabled: 'false'
            },
            outputFormat: {
              codec: 'MP3',
              bitrate: 48000,
              samplerate: 24000,
              channels: 1
            }
          }
        }
      }
    });
  }

  async initWebSocket() {
    return new Promise((resolve, reject) => {
      this.requestId = this.generateRequestId();
      
      const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4A0B0F6E45ED38B4F&CorrelationId=${this.generateRequestId()}&ConnectionId=${this.requestId}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[EdgeTTS] WebSocket connected');
          
          // Send configuration message
          const configMsg = `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${this.buildConfigMessage()}`;
          this.ws.send(configMsg);
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleWebSocketMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[EdgeTTS] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[EdgeTTS] WebSocket closed');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  handleWebSocketMessage(data) {
    // Handle binary audio data
    if (data instanceof ArrayBuffer && data.byteLength > 0) {
      this.audioChunks.push(new Uint8Array(data));
      return;
    }

    // Handle text messages
    if (typeof data === 'string') {
      // Check for turn.end message
      if (data.includes('Path:turn.end')) {
        console.log('[EdgeTTS] Synthesis complete, chunks collected:', this.audioChunks.length);
        this.finalizeSynthesis();
        return;
      }

      // Try to extract audio from text message
      const audioMarker = '\r\n\r\n';
      const markerIndex = data.indexOf(audioMarker);
      
      if (markerIndex !== -1 && data.includes('Path:audio')) {
        const audioData = data.substring(markerIndex + audioMarker.length);
        if (audioData) {
          try {
            // Convert base64 to Uint8Array
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            this.audioChunks.push(bytes);
          } catch (e) {
            // Not base64, ignore
          }
        }
      }
    }
  }

  finalizeSynthesis() {
    // Clear timeout
    if (this.synthesisTimeout) {
      clearTimeout(this.synthesisTimeout);
      this.synthesisTimeout = null;
    }

    // Close WebSocket
    this.close();

    // Combine all audio chunks
    if (this.audioChunks.length === 0) {
      if (this.rejectPromise) {
        this.rejectPromise(new Error('No audio data received'));
      }
      return;
    }

    // Calculate total size
    let totalSize = 0;
    for (const chunk of this.audioChunks) {
      totalSize += chunk.length;
    }

    // Combine into single Uint8Array
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64
    const base64 = uint8ArrayToBase64(combined);
    const dataUrl = `data:audio/mpeg;base64,${base64}`;

    console.log('[EdgeTTS] Audio synthesized, data URL length:', dataUrl.length);

    // Resolve the promise
    if (this.resolvePromise) {
      this.resolvePromise(dataUrl);
    }

    this.isSynthesizing = false;
  }

  async synthesize(text, rate, volume) {
    return new Promise(async (resolve, reject) => {
      // Reset state
      this.audioChunks = [];
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
      this.isSynthesizing = true;

      try {
        // Initialize WebSocket if not connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          await this.initWebSocket();
        }

        // Build and send synthesis message
        const ssml = this.buildSSML(text, rate, volume);
        const synthesisMsg = `X-RequestId:${this.requestId}\r\n` +
               `Content-Type:application/ssml+xml\r\n` +
               `X-Timestamp:${new Date().toISOString()}\r\n` +
               `Path:ssml\r\n\r\n` +
               ssml;
        
        this.ws.send(synthesisMsg);
        console.log('[EdgeTTS] Synthesis request sent for voice:', this.voice);

        // Set timeout for synthesis (30 seconds max)
        this.synthesisTimeout = setTimeout(() => {
          if (this.isSynthesizing) {
            this.close();
            reject(new Error('Synthesis timeout'));
          }
        }, 30000);

      } catch (error) {
        this.isSynthesizing = false;
        reject(error);
      }
    });
  }

  stop() {
    if (this.synthesisTimeout) {
      clearTimeout(this.synthesisTimeout);
      this.synthesisTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.audioChunks = [];
    this.isSynthesizing = false;

    if (this.rejectPromise) {
      this.rejectPromise(new Error('Synthesis stopped'));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Helper function to convert Uint8Array to base64 string
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Global Edge TTS client instance
let edgeTTSClient = null;

function getEdgeTTSClient() {
  if (!edgeTTSClient) {
    edgeTTSClient = new EdgeTTSClient();
  }
  return edgeTTSClient;
}

// ============================================
// Message Handlers
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Edge TTS: Synthesize speech and return audio data URL
  if (request.type === 'EDGE_TTS_SPEAK') {
    handleEdgeTTSSpeak(request, sendResponse);
    return true; // Keep channel open for async
  }

  // Edge TTS: Stop synthesis
  if (request.type === 'EDGE_TTS_STOP') {
    handleEdgeTTSStop(sendResponse);
    return true;
  }

  // Edge TTS: Get available voices
  if (request.type === 'GET_EDGE_VOICES') {
    sendResponse({
      success: true,
      voices: EDGE_TTS_VOICES
    });
    return true;
  }

  // Edge TTS: Test voice
  if (request.type === 'TEST_EDGE_TTS') {
    handleEdgeTTSTest(request, sendResponse);
    return true;
  }

  // Server Mode: TTS request to localhost
  if (request.type === 'TTS_REQUEST') {
    handleTTSRequest(request.data, sendResponse);
    return true;
  }

  // Server Mode: Check server status
  if (request.type === 'CHECK_SERVER_STATUS') {
    checkServerStatus(sendResponse);
    return true;
  }

  // Server Mode: Get voices from server
  if (request.type === 'GET_VOICES') {
    fetchVoices(sendResponse);
    return true;
  }

  // Server Mode: Play audio
  if (request.type === 'PLAY_AUDIO') {
    playAudio(request.audioUrl, sendResponse);
    return true;
  }

  // Server Mode: Fetch audio as data URL
  if (request.type === 'FETCH_AUDIO') {
    fetchAudioAsDataUrl(request.url, sendResponse);
    return true;
  }
});

// Handle Edge TTS speak request
async function handleEdgeTTSSpeak(request, sendResponse) {
  try {
    const { text, voice, rate, volume } = request;
    const client = getEdgeTTSClient();
    
    // Set voice
    client.setVoice(voice || 'en-US-AndrewNeural');
    
    console.log('[Background] Edge TTS synthesizing:', text.substring(0, 50) + '...');
    
    // Synthesize and get data URL
    const dataUrl = await client.synthesize(text, rate || 1.0, volume || 1.0);
    
    sendResponse({
      success: true,
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('[Background] Edge TTS synthesis error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Edge TTS synthesis failed'
    });
  }
}

// Handle Edge TTS stop request
function handleEdgeTTSStop(sendResponse) {
  try {
    if (edgeTTSClient) {
      edgeTTSClient.stop();
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Edge TTS stop error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle Edge TTS test request
async function handleEdgeTTSTest(request, sendResponse) {
  try {
    const { text, voice, rate, volume } = request;
    const client = getEdgeTTSClient();
    
    client.setVoice(voice || 'en-US-AndrewNeural');
    
    const testText = text || 'Hello! This is a test of the AgentVibes Edge TTS voice.';
    const dataUrl = await client.synthesize(testText, rate || 1.0, volume || 1.0);
    
    sendResponse({
      success: true,
      dataUrl: dataUrl
    });
  } catch (error) {
    console.error('[Background] Edge TTS test error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Edge TTS test failed'
    });
  }
}

// ============================================
// Server Mode Handlers (unchanged)
// ============================================

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

async function fetchAudioAsDataUrl(audioUrl, sendResponse) {
  try {
    console.log('[AgentVibes Voice] Fetching audio from:', audioUrl);

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function playAudio(audioUrl, sendResponse) {
  try {
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

// ============================================
// Initialization
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      enabled: true,
      volume: 1.0,
      voice: 'en-US-AndrewNeural',
      autoSpeak: true,
      fastMode: true,
      spokenMessages: {}
    });

    console.log('AgentVibes Voice extension installed');
  }
});

// Optional: Monitor server status
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
      chrome.runtime.sendMessage({ type: 'SERVER_STATUS_CHANGE', online: true });
    }
    wasOnline = true;
  } catch {
    if (wasOnline === true) {
      chrome.runtime.sendMessage({ type: 'SERVER_STATUS_CHANGE', online: false });
    }
    wasOnline = false;
  }
}

setInterval(monitorServer, 30000);
