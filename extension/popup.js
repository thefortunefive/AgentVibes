// AgentVibes Voice - Popup Script
// Handles settings UI and communication with background script

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const enabledToggle = document.getElementById('enabledToggle');
  const autoSpeakToggle = document.getElementById('autoSpeakToggle');
  const fastModeToggle = document.getElementById('fastModeToggle');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeFill = document.getElementById('volumeFill');
  const volumeValue = document.getElementById('volumeValue');
  const rateSlider = document.getElementById('rateSlider');
  const rateFill = document.getElementById('rateFill');
  const rateValue = document.getElementById('rateValue');
  const voiceSelect = document.getElementById('voiceSelect');
  const testBtn = document.getElementById('testBtn');
  const testLoading = document.getElementById('testLoading');
  const stopBtn = document.getElementById('stopBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const refreshStatusBtn = document.getElementById('refreshStatusBtn');
  const refreshVoicesBtn = document.getElementById('refreshVoicesBtn');
  const footerText = document.getElementById('footerText');

  // State
  let settings = {
    enabled: true,
    autoSpeak: true,
    fastMode: true,  // Default to Fast Mode
    volume: 1.0,
    rate: 1.0,
    voice: null
  };
  let isServerOnline = false;
  let voices = [];
  let currentAudio = null;
  let isFirstLoad = true;

  // ============================================
  // Load Settings
  // ============================================

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'enabled', 'autoSpeak', 'fastMode', 'volume', 'rate', 'voice'
      ]);

      settings = {
        enabled: result.enabled !== false,
        autoSpeak: result.autoSpeak !== false,
        fastMode: result.fastMode !== false,  // Default to true (Fast Mode)
        volume: result.volume || 1.0,
        rate: result.rate || 1.0,
        voice: result.voice || null
      };

      // Update UI
      updateToggleUI(enabledToggle, settings.enabled);
      updateToggleUI(autoSpeakToggle, settings.autoSpeak);
      updateToggleUI(fastModeToggle, settings.fastMode);
      updateVolumeUI(settings.volume);
      updateRateUI(settings.rate);

      // Update voice selector if voices loaded
      if (settings.voice && voices.length > 0) {
        voiceSelect.value = settings.voice;
      }

      // Update footer text based on mode
      updateFooterText();

      console.log('[AgentVibes Voice] Settings loaded - Fast Mode:', settings.fastMode);
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
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
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

  function updateRateUI(rate) {
    // Rate slider: min=5 (0.5), max=20 (2.0), step=1, so value = rate * 10
    const sliderValue = Math.round(rate * 10);
    rateSlider.value = sliderValue;
    // Calculate fill percentage: (value - min) / (max - min) = (sliderValue - 5) / 15
    const fillPercentage = ((sliderValue - 5) / 15) * 100;
    rateFill.style.width = `${fillPercentage}%`;
    rateValue.textContent = `${rate.toFixed(1)}x`;
  }

  function updateFooterText() {
    if (settings.fastMode) {
      footerText.innerHTML = 'Fast Mode active - using browser TTS';
      statusText.textContent = 'Fast Mode (Browser TTS)';
      statusDot.className = 'status-dot online';
    } else {
      footerText.innerHTML = 'Requires <a href="http://localhost:3000" target="_blank">AgentVibes server</a> running locally';
    }
  }

  function updateUIBasedOnMode() {
    if (settings.fastMode) {
      // Fast Mode: Server optional, voices from browser
      testBtn.disabled = false;
      voiceSelect.disabled = false;
      updateFooterText();
    } else {
      // Server Mode: Server required
      if (!isServerOnline) {
        testBtn.disabled = true;
        voiceSelect.disabled = true;
      }
    }
  }

  // ============================================
  // Check Server Status (for Server Mode)
  // ============================================

  async function checkServerStatus(showChecking = true) {
    // In Fast Mode, we don't need to check server status
    if (settings.fastMode) {
      updateUIBasedOnMode();
      return;
    }

    if (showChecking) {
      statusDot.className = 'status-dot checking';
      statusText.textContent = 'Checking server...';
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_SERVER_STATUS' });

      isServerOnline = response.online;

      if (response.online) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'AgentVibes connected';
        statusText.classList.add('connected');
        testBtn.disabled = false;
        voiceSelect.disabled = false;
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
  // Fetch Voices (Browser or Server)
  // ============================================

  async function fetchBrowserVoices() {
    // Get browser voices from a content script
    try {
      const tabs = await chrome.tabs.query({
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
      });

      if (tabs.length > 0) {
        // Request voices from the first available tab
        const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_BROWSER_VOICES' });
        if (response.success && response.voices) {
          return response.voices;
        }
      }
    } catch (error) {
      console.log('[AgentVibes Voice] No content script available, using fallback voice list');
    }

    // Fallback: use chrome.tts if available (Chrome extension API)
    if (chrome.tts) {
      return new Promise((resolve) => {
        chrome.tts.getVoices((ttsVoices) => {
          resolve(ttsVoices.map(v => ({
            name: v.voiceName,
            lang: v.lang,
            default: v.voiceName.toLowerCase().includes('default')
          })));
        });
      });
    }

    return [];
  }

  async function fetchVoices() {
    // Only show loading on first load or explicit refresh
    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">Loading voices...</option>';
    }

    try {
      if (settings.fastMode) {
        // Fast Mode: Get voices from browser
        const browserVoices = await fetchBrowserVoices();
        voices = browserVoices;

        // Clear and populate select
        voiceSelect.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Default Voice (${voices.length} browser voices)`;
        voiceSelect.appendChild(defaultOption);

        // Sort voices - prefer natural/neural voices
        const sortedVoices = voices.sort((a, b) => {
          const aNatural = a.name.toLowerCase().includes('natural') ||
                           a.name.toLowerCase().includes('neural') ||
                           a.name.toLowerCase().includes('premium') ||
                           a.name.toLowerCase().includes('enhanced');
          const bNatural = b.name.toLowerCase().includes('natural') ||
                           b.name.toLowerCase().includes('neural') ||
                           b.name.toLowerCase().includes('premium') ||
                           b.name.toLowerCase().includes('enhanced');

          if (aNatural && !bNatural) return -1;
          if (!aNatural && bNatural) return 1;

          // Prefer English
          const aEnglish = a.lang && a.lang.toLowerCase().startsWith('en');
          const bEnglish = b.lang && b.lang.toLowerCase().startsWith('en');
          if (aEnglish && !bEnglish) return -1;
          if (!aEnglish && bEnglish) return 1;

          return a.name.localeCompare(b.name);
        });

        // Add voice options
        sortedVoices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.name;
          option.textContent = `${voice.name} (${voice.lang})`;
          voiceSelect.appendChild(option);
        });

        console.log('[AgentVibes Voice] Loaded', voices.length, 'browser voices for Fast Mode');
      } else {
        // Server Mode: Get voices from server via background script
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
        } else {
          voiceSelect.innerHTML = '<option value="">Failed to load voices</option>';
        }
      }

      // Restore selection
      if (settings.voice) {
        voiceSelect.value = settings.voice;
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
    }
  }

  // ============================================
  // Test Voice
  // ============================================

  async function testVoice() {
    testBtn.disabled = true;
    testLoading.style.display = 'inline-block';

    // Stop any current test audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const testText = "Hello! This is a test of the AgentVibes voice system. Your AI chat responses will be spoken aloud like this.";

    try {
      if (settings.fastMode) {
        // Fast Mode: Use browser TTS via content script
        const tabs = await chrome.tabs.query({
          url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
        });

        if (tabs.length > 0) {
          // Send TTS request to content script
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TEST_BROWSER_TTS',
            text: testText,
            voice: settings.voice,
            volume: settings.volume
          });

          // Browser TTS plays immediately, no waiting
          testBtn.disabled = false;
          testLoading.style.display = 'none';
          testBtn.textContent = 'Test Again';
        } else {
          throw new Error('No chat tab available for testing');
        }
      } else {
        // Server Mode: Use server TTS
        if (!isServerOnline) {
          throw new Error('Server offline');
        }

        const response = await chrome.runtime.sendMessage({
          type: 'TTS_REQUEST',
          data: {
            text: testText,
            voice: settings.voice,
            speed: settings.rate,
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

  fastModeToggle.addEventListener('click', async () => {
    settings.fastMode = !settings.fastMode;
    updateToggleUI(fastModeToggle, settings.fastMode);

    // Update UI immediately
    updateFooterText();
    updateUIBasedOnMode();

    // Reload voices for the new mode
    voices = [];  // Clear cache
    await fetchVoices();

    // If switching to Server Mode, check server status
    if (!settings.fastMode) {
      await checkServerStatus(true);
    }

    await saveSettings();

    // Notify content scripts of Fast Mode change
    const tabs = await chrome.tabs.query({
      url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
    });

    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_FAST_MODE',
        fastMode: settings.fastMode
      }).catch(() => {
        // Tab might not have content script, ignore error
      });
    });

    console.log('[AgentVibes Voice] Fast Mode toggled:', settings.fastMode);
  });

  volumeSlider.addEventListener('input', async () => {
    const percentage = parseInt(volumeSlider.value);
    settings.volume = percentage / 100;
    updateVolumeUI(settings.volume);
    // Debounce save
    clearTimeout(window.volumeSaveTimeout);
    window.volumeSaveTimeout = setTimeout(saveSettings, 300);
  });

  rateSlider.addEventListener('input', async () => {
    const sliderValue = parseInt(rateSlider.value);
    settings.rate = sliderValue / 10;
    updateRateUI(settings.rate);
    // Debounce save
    clearTimeout(window.rateSaveTimeout);
    window.rateSaveTimeout = setTimeout(saveSettings, 300);
  });

  voiceSelect.addEventListener('change', async () => {
    const newVoice = voiceSelect.value || null;
    settings.voice = newVoice;
    await saveSettings();

    // Immediately notify all content scripts of the voice change
    try {
      const tabs = await chrome.tabs.query({
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
      });

      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'VOICE_CHANGED',
          voice: newVoice
        }).catch(() => {
          // Tab might not have content script, ignore error
        });
      });

      console.log('[AgentVibes Voice] Voice changed to:', newVoice);
    } catch (error) {
      console.error('[AgentVibes Voice] Failed to notify tabs of voice change:', error);
    }
  });

  testBtn.addEventListener('click', testVoice);

  // Stop Speaking button
  stopBtn.addEventListener('click', async () => {
    try {
      // Send stop message to all content scripts
      const tabs = await chrome.tabs.query({
        url: ['https://chat.openai.com/*', 'https://claude.ai/*', 'https://genspark.ai/*', 'https://chatgpt.com/*']
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

  // Refresh status button - manual re-check only
  refreshStatusBtn.addEventListener('click', async () => {
    if (!settings.fastMode) {
      await checkServerStatus(true);
      // Only refresh voices if server came online and we need them
      if (isServerOnline && voices.length === 0) {
        await fetchVoices();
      }
    }
  });

  // Refresh voices button - manual reload only
  refreshVoicesBtn.addEventListener('click', async () => {
    if (!settings.fastMode && !isServerOnline) return;

    refreshVoicesBtn.classList.add('spinning');
    voices = [];  // Clear cache
    await fetchVoices();
    setTimeout(() => refreshVoicesBtn.classList.remove('spinning'), 500);
  });

  // ============================================
  // Initialize - Single check on popup open, no polling
  // ============================================

  await loadSettings();

  // In Fast Mode, server is optional; in Server Mode, check server
  if (settings.fastMode) {
    updateUIBasedOnMode();
    await fetchVoices();
  } else {
    await checkServerStatus(true);
    // Load voices once on initial load if server is online
    if (isServerOnline) {
      await fetchVoices();
    }
  }

  // Clean up on popup close - stop any playing audio
  window.addEventListener('beforeunload', () => {
    if (currentAudio) {
      currentAudio.pause();
    }
  });
});
