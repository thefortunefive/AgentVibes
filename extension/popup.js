// AgentVibes Voice - Popup Script
// Handles settings UI and communication with background script

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const enabledToggle = document.getElementById('enabledToggle');
  const autoSpeakToggle = document.getElementById('autoSpeakToggle');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeFill = document.getElementById('volumeFill');
  const volumeValue = document.getElementById('volumeValue');
  const voiceSelect = document.getElementById('voiceSelect');
  const testBtn = document.getElementById('testBtn');
  const testLoading = document.getElementById('testLoading');
  const stopBtn = document.getElementById('stopBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  // State
  let settings = {
    enabled: true,
    autoSpeak: true,
    volume: 1.0,
    voice: null
  };
  let isServerOnline = false;
  let voices = [];
  let currentAudio = null;
  
  // ============================================
  // Load Settings
  // ============================================
  
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'enabled', 'autoSpeak', 'volume', 'voice'
      ]);
      
      settings = {
        enabled: result.enabled !== false,
        autoSpeak: result.autoSpeak !== false,
        volume: result.volume || 1.0,
        voice: result.voice || null
      };
      
      // Update UI
      updateToggleUI(enabledToggle, settings.enabled);
      updateToggleUI(autoSpeakToggle, settings.autoSpeak);
      updateVolumeUI(settings.volume);
      
      // Update voice selector if voices loaded
      if (settings.voice && voices.length > 0) {
        voiceSelect.value = settings.voice;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  // ============================================
  // Save Settings
  // ============================================
  
  async function saveSettings() {
    try {
      await chrome.storage.local.set(settings);
      
      // Notify content scripts of settings change
      const tabs = await chrome.tabs.query({
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*']
      });
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {
          // Tab might not have content script, ignore error
        });
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  // ============================================
  // Check Server Status
  // ============================================
  
  async function checkServerStatus() {
    statusDot.className = 'status-dot checking';
    statusText.textContent = 'Checking server...';
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_SERVER_STATUS' });
      
      isServerOnline = response.online;
      
      if (response.online) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'AgentVibes connected';
        statusText.classList.add('connected');
        testBtn.disabled = false;
        voiceSelect.disabled = false;
        
        // Always refresh voices from server when popup opens
        await fetchVoices();
      } else {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Server offline - Start AgentVibes';
        statusText.classList.remove('connected');
        testBtn.disabled = true;
        voiceSelect.disabled = true;
      }
    } catch (error) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Extension error';
      statusText.classList.remove('connected');
      testBtn.disabled = true;
      voiceSelect.disabled = true;
    }
  }
  
  // ============================================
  // Fetch Voices
  // ============================================
  
  async function fetchVoices() {
    try {
      voiceSelect.innerHTML = '<option value="">Loading voices...</option>';
      
      const response = await chrome.runtime.sendMessage({ type: 'GET_VOICES' });
      
      if (response.success && response.voices) {
        voices = response.voices;
        
        // Clear and populate select
        voiceSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Default Voice (${voices.length} available)`;
        voiceSelect.appendChild(defaultOption);
        
        // Add voice options
        voices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.id || voice.name;
          option.textContent = voice.name || voice.id;
          voiceSelect.appendChild(option);
        });
        
        // Restore selection
        if (settings.voice) {
          voiceSelect.value = settings.voice;
        }
      } else {
        voiceSelect.innerHTML = '<option value="">Failed to load voices</option>';
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
    }
  }
  
  // ============================================
  // UI Helpers
  // ============================================
  
  function updateToggleUI(toggle, isActive) {
    if (isActive) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
  
  function updateVolumeUI(volume) {
    const percentage = Math.round(volume * 100);
    volumeSlider.value = percentage;
    volumeFill.style.width = `${percentage}%`;
    volumeValue.textContent = `${percentage}%`;
  }
  
  // ============================================
  // Test Voice
  // ============================================
  
  async function testVoice() {
    if (!isServerOnline) return;
    
    testBtn.disabled = true;
    testLoading.style.display = 'inline-block';
    
    // Stop any current test audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    const testText = "Hello! This is a test of the AgentVibes voice system. Your AI chat responses will be spoken aloud like this.";
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TTS_REQUEST',
        data: {
          text: testText,
          voice: settings.voice,
          speed: 1.0,
          pitch: 1.0
        }
      });
      
      if (response.success && response.audioUrl) {
        currentAudio = new Audio(response.audioUrl);
        currentAudio.volume = settings.volume;
        
        currentAudio.onended = () => {
          currentAudio = null;
          testBtn.disabled = false;
          testLoading.style.display = 'none';
          testBtn.textContent = 'Test Again';
        };
        
        currentAudio.onerror = () => {
          currentAudio = null;
          testBtn.disabled = false;
          testLoading.style.display = 'none';
          testBtn.textContent = 'Test Failed - Retry';
        };
        
        await currentAudio.play();
      } else {
        throw new Error(response.error || 'TTS failed');
      }
    } catch (error) {
      console.error('Test voice error:', error);
      testBtn.disabled = false;
      testLoading.style.display = 'none';
      testBtn.textContent = 'Test Failed - Retry';
    }
  }
  
  // ============================================
  // Event Listeners
  // ============================================
  
  enabledToggle.addEventListener('click', async () => {
    settings.enabled = !settings.enabled;
    updateToggleUI(enabledToggle, settings.enabled);
    await saveSettings();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TOGGLE_ENABLED',
      enabled: settings.enabled
    });
  });
  
  autoSpeakToggle.addEventListener('click', async () => {
    settings.autoSpeak = !settings.autoSpeak;
    updateToggleUI(autoSpeakToggle, settings.autoSpeak);
    await saveSettings();
  });
  
  volumeSlider.addEventListener('input', async () => {
    const percentage = parseInt(volumeSlider.value);
    settings.volume = percentage / 100;
    updateVolumeUI(settings.volume);
    // Debounce save
    clearTimeout(window.volumeSaveTimeout);
    window.volumeSaveTimeout = setTimeout(saveSettings, 300);
  });
  
  voiceSelect.addEventListener('change', async () => {
    settings.voice = voiceSelect.value || null;
    await saveSettings();
  });
  
  testBtn.addEventListener('click', testVoice);
  
  // Stop Speaking button
  stopBtn.addEventListener('click', async () => {
    try {
      // Send stop message to all content scripts
      const tabs = await chrome.tabs.query({
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*']
      });
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_SPEAKING' }).catch(() => {
          // Tab might not have content script, ignore error
        });
      });
      
      // Also stop any audio playing in the popup
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  });
  
  // ============================================
  // Initialize
  // ============================================
  
  await loadSettings();
  await checkServerStatus();
  
  // Re-check status periodically while popup is open
  const statusInterval = setInterval(checkServerStatus, 5000);
  
  // Clean up on popup close
  window.addEventListener('beforeunload', () => {
    clearInterval(statusInterval);
    if (currentAudio) {
      currentAudio.pause();
    }
  });
});
