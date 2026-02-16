console.log('[AgentVibes Voice] Content script injected on:', window.location.href);

// AgentVibes Voice - Content Script (Simplified Version)
// Simple "wait then speak" approach - no streaming complexity
// 1. Wait for message to be complete
// 2. Split into chunks
// 3. Play sequentially with preloading

(function() {
  'use strict';

  // ============================================
  // Platform Detection & Selectors
  // ============================================

  const PLATFORMS = {
    CLAUDE: {
      domain: 'claude.ai',
      messageSelector: '.font-claude-message',
      streamingAttribute: 'data-is-streaming',
      textSelector: '.prose, .font-claude-message',
      codeBlockSelector: 'pre',
      containerSelector: 'div[class*="scroll"], div[class*="conversation"], main, div[class*="content"]'
    },
    CHATGPT: {
      domain: 'chat.openai.com',
      messageSelector: '.agent-turn, [data-message-author-role="assistant"]',
      streamingSelector: '.result-streaming',
      textSelector: '.markdown',
      codeBlockSelector: 'pre',
      containerSelector: 'main, [class*="conversation"], [class*="messages"]'
    },
    GENSPARK: {
      domain: 'genspark.ai',
      messageSelector: '.message-content, .assistant-message, [class*="assistant"]',
      streamingAttribute: 'data-streaming',
      textSelector: '.message-body, .content, [class*="content"]',
      codeBlockSelector: 'pre, code',
      containerSelector: 'div[class*="chat"], div[class*="messages"], main, div[class*="conversation"]'
    }
  };

  let currentPlatform = null;
  let settings = { enabled: true, volume: 1.0, voice: null, autoSpeak: true };
  let spokenMessages = new Set();
  let currentAudio = null;
  let stopButton = null;
  let observer = null;
  let isInitialized = false;
  let isPageReady = false;
  let lastSpeakTime = 0;

  const SPEAK_COOLDOWN = 5000;
  const INITIAL_LOAD_GRACE = 5000;
  const MIN_TEXT_LENGTH = 50;
  const OBSERVER_DELAY = 3000;
  const DEBOUNCE_DELAY = 500;
  const STREAMING_CHECK_INTERVAL = 500;
  const STREAMING_STABLE_THRESHOLD = 2000;

  // Track messages being monitored for completion
  const monitoredMessages = new Map(); // messageId -> { element, lastText, lastChangeTime, isComplete }

  // ============================================
  // Simple Sequential Audio Player
  // ============================================

  class AudioPlayer {
    constructor() {
      this.queue = [];
      this.isPlaying = false;
      this.currentAudio = null;
      this.nextAudioData = null;
      this.nextChunk = null;
    }

    // Add chunks to queue and start playing
    playChunks(chunks) {
      if (!chunks || chunks.length === 0) return;

      this.queue.push(...chunks);
      console.log('[AgentVibes Voice] Added', chunks.length, 'chunks to queue');

      if (!this.isPlaying) {
        this.playNext();
      } else {
        // Preload next chunk if we're already playing
        this.preloadNext();
      }
    }

    async playNext() {
      if (this.queue.length === 0) {
        this.isPlaying = false;
        hideSpeakingNotification();
        hideStopButton();
        return;
      }

      this.isPlaying = true;
      const chunk = this.queue.shift();

      try {
        // Preload the next chunk before playing current one
        if (this.queue.length > 0) {
          this.preloadNext();
        }

        await this.playChunk(chunk);

        // Continue with next chunk
        this.playNext();
      } catch (error) {
        console.error('[AgentVibes Voice] Error playing chunk:', error);
        this.nextAudioData = null;
        this.nextChunk = null;
        // Continue with next even if one fails
        this.playNext();
      }
    }

    async preloadNext() {
      if (this.queue.length === 0 || this.nextAudioData) return;

      const nextChunk = this.queue[0];
      if (nextChunk === this.nextChunk) return;

      this.nextChunk = nextChunk;
      console.log('[AgentVibes Voice] Preloading audio for next chunk');

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'TTS_REQUEST',
          data: {
            text: nextChunk,
            voice: settings.voice,
            speed: 1.0,
            pitch: 1.0
          }
        });

        if (response.success && response.audioUrl) {
          const fetchResponse = await chrome.runtime.sendMessage({
            type: 'FETCH_AUDIO',
            url: response.audioUrl
          });

          if (fetchResponse.success && fetchResponse.dataUrl) {
            this.nextAudioData = fetchResponse.dataUrl;
          }
        }
      } catch (error) {
        console.error('[AgentVibes Voice] Preload error:', error);
        this.nextAudioData = null;
      }
    }

    async playChunk(chunk) {
      return new Promise(async (resolve, reject) => {
        try {
          showSpeakingNotification();
          showStopButton();

          let audio;

          // Use preloaded audio if available
          if (this.nextChunk === chunk && this.nextAudioData) {
            audio = new Audio(this.nextAudioData);
            audio.volume = settings.volume;
            this.nextAudioData = null;
            this.nextChunk = null;
          } else {
            // Fetch audio normally
            const response = await chrome.runtime.sendMessage({
              type: 'TTS_REQUEST',
              data: {
                text: chunk,
                voice: settings.voice,
                speed: 1.0,
                pitch: 1.0
              }
            });

            if (!response.success || !response.audioUrl) {
              throw new Error(response.error || 'TTS failed');
            }

            const fetchResponse = await chrome.runtime.sendMessage({
              type: 'FETCH_AUDIO',
              url: response.audioUrl
            });

            if (!fetchResponse.success || !fetchResponse.dataUrl) {
              throw new Error(fetchResponse.error || 'Failed to fetch audio');
            }

            audio = new Audio(fetchResponse.dataUrl);
            audio.volume = settings.volume;
          }

          this.currentAudio = audio;
          currentAudio = audio;

          audio.onended = () => {
            this.currentAudio = null;
            currentAudio = null;
            resolve();
          };

          audio.onerror = (e) => {
            console.error('[AgentVibes Voice] Audio playback failed:', e);
            this.currentAudio = null;
            currentAudio = null;
            reject(e);
          };

          if (audio.readyState >= 2) {
            await audio.play();
          } else {
            audio.addEventListener('canplay', async () => {
              await audio.play();
            }, { once: true });
          }
        } catch (error) {
          console.error('[AgentVibes Voice] TTS error for chunk:', error);
          reject(error);
        }
      });
    }

    clear() {
      this.queue = [];
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      this.nextAudioData = null;
      this.nextChunk = null;
      this.isPlaying = false;
    }

    isActive() {
      return this.isPlaying || this.queue.length > 0;
    }
  }

  const audioPlayer = new AudioPlayer();

  // ============================================
  // Utility Functions
  // ============================================

  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('claude.ai')) return 'CLAUDE';
    if (hostname.includes('chat.openai.com')) return 'CHATGPT';
    if (hostname.includes('genspark.ai')) return 'GENSPARK';
    return 'GENERIC';
  }

  function hashMessage(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  function extractCleanText(element, platform) {
    if (!element) return '';

    const clone = element.cloneNode(true);

    // Remove code blocks
    const codeBlocks = clone.querySelectorAll('pre, code, .code-block, [class*="code"]');
    codeBlocks.forEach(block => block.remove());

    // Remove hidden elements
    const hidden = clone.querySelectorAll('[hidden], .sr-only, .visually-hidden');
    hidden.forEach(el => el.remove());

    // Get text content
    let text = clone.textContent || '';

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return text;
  }

  // Check if message is currently streaming
  function isMessageStreaming(element, platform) {
    if (!element) return false;

    const config = PLATFORMS[platform];
    if (!config) return false;

    // Check streaming attribute
    if (config.streamingAttribute) {
      const streaming = element.getAttribute(config.streamingAttribute);
      if (streaming === 'true') return true;
    }

    // Check for streaming class/selector
    if (config.streamingSelector) {
      if (element.querySelector(config.streamingSelector)) return true;
    }

    // Check for result-streaming (ChatGPT specific)
    if (element.classList.contains('result-streaming')) return true;
    if (element.querySelector('.result-streaming')) return true;

    // Check if text is still being typed (has cursor/blinking element)
    if (element.querySelector('.cursor, [class*="blink"], [class*="cursor"]')) return true;

    return false;
  }

  // ============================================
  // Text Chunking - Split into 2-3 sentence chunks
  // ============================================

  function splitIntoChunks(text) {
    // Split text into sentences
    // Match sentences ending with . ! ? followed by space or end
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
    const sentences = (text.match(sentenceRegex) || [])
      .map(s => s.trim())
      .filter(s => s.length >= 10);

    if (sentences.length === 0) return [text];

    const chunks = [];
    let currentChunk = [];

    for (let i = 0; i < sentences.length; i++) {
      currentChunk.push(sentences[i]);

      // Create chunk every 2-3 sentences
      if (currentChunk.length >= 3 || i === sentences.length - 1) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      } else if (currentChunk.length === 2 && i < sentences.length - 1) {
        // Check if next sentence is very short - if so, include it for better flow
        const nextSentence = sentences[i + 1];
        if (nextSentence && nextSentence.length < 50) {
          // Wait for the third sentence
          continue;
        } else {
          chunks.push(currentChunk.join(' '));
          currentChunk = [];
        }
      }
    }

    // Add any remaining sentences
    if (currentChunk.length > 0) {
      if (chunks.length > 0) {
        // Append to last chunk if it's small
        const lastChunk = chunks[chunks.length - 1];
        if (lastChunk.length < 150) {
          chunks[chunks.length - 1] = lastChunk + ' ' + currentChunk.join(' ');
        } else {
          chunks.push(currentChunk.join(' '));
        }
      } else {
        chunks.push(currentChunk.join(' '));
      }
    }

    return chunks.filter(chunk => chunk.length >= 10);
  }

  // ============================================
  // Message Monitoring - Wait for completion
  // ============================================

  function startMonitoringMessage(messageElement, platform, messageId) {
    // Skip if already being monitored
    if (monitoredMessages.has(messageId)) return;

    const config = PLATFORMS[platform];
    let textElement = messageElement;
    if (config && config.textSelector) {
      textElement = messageElement.querySelector(config.textSelector) || messageElement;
    }

    const initialText = extractCleanText(textElement, platform);

    // Skip if too short
    if (initialText.length < MIN_TEXT_LENGTH) return;

    // Mark as being monitored
    messageElement.setAttribute('data-agentvibes-monitoring', 'true');

    const monitorState = {
      element: messageElement,
      textElement: textElement,
      lastText: initialText,
      lastChangeTime: Date.now(),
      isComplete: false,
      platform: platform,
      checkInterval: null
    };

    monitoredMessages.set(messageId, monitorState);

    console.log('[AgentVibes Voice] Started monitoring message:', messageId, 'Initial length:', initialText.length);

    // Start checking for completion
    monitorState.checkInterval = setInterval(() => {
      checkMessageCompletion(messageId);
    }, STREAMING_CHECK_INTERVAL);

    // Add speaker icon
    addSpeakerIconToMessage(messageElement, initialText, platform);
  }

  function checkMessageCompletion(messageId) {
    const state = monitoredMessages.get(messageId);
    if (!state) return;

    const { textElement, element, platform, lastText, lastChangeTime, isComplete } = state;

    if (isComplete) return;

    const currentText = extractCleanText(textElement, platform);
    const now = Date.now();

    // Check if text has changed
    if (currentText !== lastText) {
      state.lastText = currentText;
      state.lastChangeTime = now;
      console.log('[AgentVibes Voice] Message text changed, length:', currentText.length);
      return;
    }

    // Check if streaming has stopped (text stable for threshold time)
    const timeSinceChange = now - lastChangeTime;
    const isStreaming = isMessageStreaming(element, platform);

    // Message is complete if:
    // 1. Streaming attribute shows false, OR
    // 2. Text hasn't changed for STREAMING_STABLE_THRESHOLD (2 seconds)
    const isCompleteNow = !isStreaming && timeSinceChange >= STREAMING_STABLE_THRESHOLD;

    if (isCompleteNow && currentText.length >= MIN_TEXT_LENGTH) {
      // Message is complete!
      state.isComplete = true;
      clearInterval(state.checkInterval);

      console.log('[AgentVibes Voice] Message complete! Length:', currentText.length, 'Time stable:', timeSinceChange + 'ms');

      // Mark as complete
      element.setAttribute('data-agentvibes-monitoring', 'complete');
      element.dataset.agentvibesComplete = 'true';

      // Process the complete message
      processCompleteMessage(element, currentText, platform, messageId);

      // Clean up after a delay
      setTimeout(() => {
        monitoredMessages.delete(messageId);
      }, 5000);
    }
  }

  function processCompleteMessage(element, text, platform, messageId) {
    // Skip if already spoken
    const textHash = hashMessage(text);
    if (spokenMessages.has(textHash)) {
      console.log('[AgentVibes Voice] Message already spoken, skipping');
      return;
    }

    // Mark as spoken
    spokenMessages.add(textHash);
    element.dataset.agentvibesSpoken = textHash;

    // Split into chunks
    const chunks = splitIntoChunks(text);
    console.log('[AgentVibes Voice] Split into', chunks.length, 'chunks');

    // Auto-speak if enabled
    if (settings.autoSpeak && settings.enabled) {
      console.log('[AgentVibes Voice] Starting playback of', chunks.length, 'chunks');
      audioPlayer.playChunks(chunks);
    }
  }

  function stopAllPlayback() {
    console.log('[AgentVibes Voice] Stopping all playback...');

    // Stop all monitoring intervals
    for (const [messageId, state] of monitoredMessages) {
      if (state.checkInterval) {
        clearInterval(state.checkInterval);
      }
    }
    monitoredMessages.clear();

    // Clear audio player
    audioPlayer.clear();

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    hideSpeakingNotification();
    hideStopButton();
  }

  // ============================================
  // Speaker Icon Management
  // ============================================

  function createSpeakerIcon() {
    const icon = document.createElement('div');
    icon.className = 'agentvibes-speaker-icon';
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `;
    icon.title = 'Click to replay with AgentVibes Voice';
    return icon;
  }

  function addSpeakerIconToMessage(messageElement, text, platform) {
    // Check if icon already exists
    if (messageElement.querySelector('.agentvibes-speaker-icon')) return;

    const icon = createSpeakerIcon();

    // Position based on platform
    const baseStyles = `
      position: absolute;
      bottom: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #6366f1;
      transition: all 0.2s;
      z-index: 100;
    `;

    messageElement.style.position = 'relative';
    icon.style.cssText = baseStyles;

    // Hover effects
    icon.addEventListener('mouseenter', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.2)';
      icon.style.transform = 'scale(1.1)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.1)';
      icon.style.transform = 'scale(1)';
    });

    // Click handler - replay the complete message
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get current text
      const config = PLATFORMS[platform];
      let textElement = messageElement;
      if (config && config.textSelector) {
        textElement = messageElement.querySelector(config.textSelector) || messageElement;
      }
      const currentText = extractCleanText(textElement, platform);

      // Stop any current playback
      audioPlayer.clear();

      // Split and play
      const chunks = splitIntoChunks(currentText);
      audioPlayer.playChunks(chunks);

      // Visual feedback
      icon.style.color = '#10b981';
      setTimeout(() => {
        icon.style.color = '#6366f1';
      }, 1000);
    });

    messageElement.appendChild(icon);
  }

  // ============================================
  // Text-to-Speech Functions (for non-streaming messages)
  // ============================================

  async function speakText(text, options = {}) {
    if (!text || text.length < 5) return;
    if (!settings.enabled && !options.isReplay) return;

    // Check cooldown
    const now = Date.now();
    if (!options.isReplay && (now - lastSpeakTime) < SPEAK_COOLDOWN) {
      console.log('[AgentVibes Voice] Speak cooldown active, skipping');
      return;
    }

    const textHash = hashMessage(text);

    // Skip if already spoken (unless manual replay)
    if (!options.isReplay && spokenMessages.has(textHash)) {
      console.log('[AgentVibes Voice] Skipping already spoken message');
      return;
    }

    // Update last speak time and mark as spoken
    lastSpeakTime = now;
    spokenMessages.add(textHash);

    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Split into chunks and play
    const chunks = splitIntoChunks(text);
    audioPlayer.playChunks(chunks);
  }

  // ============================================
  // Stop/Mute Button
  // ============================================

  function createStopButton() {
    const button = document.createElement('div');
    button.id = 'agentvibes-stop-btn';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    `;
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: #ef4444;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10001;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
    });

    button.addEventListener('click', () => {
      stopAllPlayback();
    });

    document.body.appendChild(button);
    return button;
  }

  function showStopButton() {
    if (!stopButton) {
      stopButton = createStopButton();
    }
    stopButton.style.display = 'flex';
  }

  function hideStopButton() {
    if (stopButton) {
      stopButton.style.display = 'none';
    }
  }

  // Keyboard shortcut: Escape key stops audio
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopAllPlayback();
    }
  });

  // Listen for stop message from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'STOP_SPEAKING') {
      stopAllPlayback();
      sendResponse({ success: true });
    }
  });

  // ============================================
  // Notification UI
  // ============================================

  function showSpeakingNotification() {
    let notif = document.getElementById('agentvibes-speaking');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'agentvibes-speaking';
      notif.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: agentvibes-slide-in 0.3s ease;
        ">
          <span style="
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: agentvibes-pulse 1s infinite;
          "></span>
          Speaking...
        </div>
      `;

      if (!document.getElementById('agentvibes-styles')) {
        const styles = document.createElement('style');
        styles.id = 'agentvibes-styles';
        styles.textContent = `
          @keyframes agentvibes-slide-in {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes agentvibes-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
          }
        `;
        document.head.appendChild(styles);
      }

      document.body.appendChild(notif);
    }

    notif.style.display = 'block';
  }

  function hideSpeakingNotification() {
    const notif = document.getElementById('agentvibes-speaking');
    if (notif) {
      notif.style.display = 'none';
    }
  }

  function showErrorNotification(message) {
    const notif = document.createElement('div');
    notif.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: agentvibes-slide-in 0.3s ease;
      ">
        ⚠️ AgentVibes: ${message}
      </div>
    `;

    document.body.appendChild(notif);

    setTimeout(() => {
      notif.remove();
    }, 5000);
  }

  // ============================================
  // Message Detection
  // ============================================

  function processMessageElement(element, platform) {
    // Skip during initial page load grace period
    if (!isPageReady) {
      console.log('[AgentVibes Voice] Page not ready yet, skipping message');
      return;
    }

    const config = PLATFORMS[platform];
    if (!config) {
      processGenericMessage(element);
      return;
    }

    // Generate a unique ID for this message
    const messageId = element.dataset.messageId || hashMessage(element.outerHTML.substring(0, 200));
    element.dataset.messageId = messageId;

    // Skip if pre-marked as spoken
    if (element.getAttribute('data-agentvibes-spoken') === 'true') return;

    // Skip if already complete
    if (element.dataset.agentvibesComplete === 'true') return;

    // Skip if already being monitored
    if (monitoredMessages.has(messageId)) return;
    if (element.getAttribute('data-agentvibes-monitoring') === 'true') return;
    if (element.getAttribute('data-agentvibes-monitoring') === 'complete') return;

    // Get text content
    let textElement = element;
    if (config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }

    const text = extractCleanText(textElement, platform);

    // Only process substantial messages
    if (text.length < MIN_TEXT_LENGTH) return;

    // Check if already spoken
    const textHash = hashMessage(text);
    if (spokenMessages.has(textHash)) return;

    // Start monitoring this message for completion
    startMonitoringMessage(element, platform, messageId);
  }

  function processGenericMessage(element) {
    if (!isPageReady) return;

    // Skip if pre-marked as spoken
    if (element.getAttribute('data-agentvibes-spoken') === 'true') return;

    const text = extractCleanText(element, 'GENERIC');
    if (text.length < MIN_TEXT_LENGTH) return;

    // Detect if this looks like an AI message
    const isAssistant = (
      element.classList.contains('assistant') ||
      element.classList.contains('ai') ||
      element.classList.contains('bot') ||
      element.getAttribute('data-role') === 'assistant' ||
      element.querySelector('[class*="assistant"], [class*="ai"], [class*="bot"]') ||
      element.closest('[class*="assistant"], [class*="ai"]')
    );

    if (!isAssistant && text.length < 100) return;

    const textHash = hashMessage(text);
    if (spokenMessages.has(textHash)) return;

    // For generic messages, just speak them directly (non-streaming)
    spokenMessages.add(textHash);
    addSpeakerIconToMessage(element, text, 'GENERIC');

    if (settings.autoSpeak && settings.enabled) {
      const chunks = splitIntoChunks(text);
      audioPlayer.playChunks(chunks);
    }
  }

  // ============================================
  // MutationObserver Setup
  // ============================================

  function findContainer(platform) {
    const config = PLATFORMS[platform];
    if (!config || !config.containerSelector) return null;

    const container = document.querySelector(config.containerSelector);
    if (container) return container;

    const fallbacks = [
      'main',
      '[role="main"]',
      'article',
      'div[class*="content"]',
      'div[class*="chat"]',
      'div[class*="messages"]'
    ];

    for (const selector of fallbacks) {
      const el = document.querySelector(selector);
      if (el) return el;
    }

    return null;
  }

  let debounceTimer = null;

  function setupObserver(platform) {
    if (observer) {
      observer.disconnect();
    }

    const config = PLATFORMS[platform];
    let targetNode = findContainer(platform);

    if (!targetNode) {
      console.log('[AgentVibes Voice] Chat container not found yet, will retry...');
      setTimeout(() => setupObserver(platform), 1000);
      return;
    }

    console.log('[AgentVibes Voice] MutationObserver attached to:', targetNode);

    observer = new MutationObserver((mutations) => {
      if (!isPageReady) return;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        detectAndProcessMessages(platform);
      }, DEBOUNCE_DELAY);
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-is-streaming', 'data-streaming', 'class', 'data-message-id']
    });

    isInitialized = true;

    // Initial scan after delay
    setTimeout(() => {
      detectAndProcessMessages(platform);
    }, 500);
  }

  function detectAndProcessMessages(platform, options = {}) {
    const config = PLATFORMS[platform];
    const { markOnly = false } = options;

    if (config && config.messageSelector) {
      const messages = document.querySelectorAll(config.messageSelector);
      messages.forEach(msg => {
        if (markOnly) {
          markMessageAsSpoken(msg, platform);
        } else {
          processMessageElement(msg, platform);
        }
      });
    } else {
      const genericSelectors = [
        '[class*="message"]:not([class*="user"])',
        '[class*="assistant"]:not([class*="user"])',
        '[class*="ai"]:not([class*="user"])',
        '[class*="bot"]:not([class*="user"])',
        '[data-role="assistant"]',
        '[data-message-author-role="assistant"]'
      ];

      genericSelectors.forEach(selector => {
        try {
          const messages = document.querySelectorAll(selector);
          messages.forEach(msg => {
            if (markOnly) {
              markMessageAsSpoken(msg, 'GENERIC');
            } else {
              processMessageElement(msg, 'GENERIC');
            }
          });
        } catch (e) {
          // Invalid selector, skip
        }
      });
    }
  }

  // ============================================
  // Mark Existing Messages as Spoken (No TTS)
  // ============================================

  function markMessageAsSpoken(element, platform) {
    const config = PLATFORMS[platform];

    let textElement = element;
    if (config && config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }

    const text = extractCleanText(textElement, platform);
    if (text.length < MIN_TEXT_LENGTH) return;

    const messageId = element.dataset.messageId || hashMessage(element.outerHTML.substring(0, 200));
    element.dataset.messageId = messageId;

    element.setAttribute('data-agentvibes-spoken', 'true');

    const textHash = hashMessage(text);
    spokenMessages.add(textHash);
    element.dataset.agentvibesProcessed = textHash;
  }

  function markAllExistingMessagesAsSpoken(platform) {
    console.log('[AgentVibes Voice] Marking all existing messages as spoken...');

    const wasPageReady = isPageReady;
    isPageReady = true;

    detectAndProcessMessages(platform, { markOnly: true });

    isPageReady = wasPageReady;

    console.log('[AgentVibes Voice] Finished cataloging existing messages.');
  }

  // ============================================
  // Settings Management
  // ============================================

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'enabled', 'volume', 'voice', 'autoSpeak', 'spokenMessages'
      ]);

      settings = {
        enabled: result.enabled !== false,
        volume: result.volume || 1.0,
        voice: result.voice || null,
        autoSpeak: result.autoSpeak !== false
      };

      console.log('[AgentVibes Voice] Enabled:', settings.enabled, 'AutoSpeak:', settings.autoSpeak);

      if (result.spokenMessages) {
        Object.keys(result.spokenMessages).forEach(hash => {
          spokenMessages.add(hash);
        });
      }
    } catch (error) {
      console.error('[AgentVibes Voice] Failed to load settings:', error);
    }
  }

  // Listen for settings changes from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SETTINGS_UPDATED') {
      loadSettings();
    }
    if (request.type === 'TOGGLE_ENABLED') {
      settings.enabled = request.enabled;
    }
    if (request.type === 'SERVER_STATUS_CHANGE') {
      if (request.online) {
        console.log('[AgentVibes Voice] Server is online');
      } else {
        console.log('[AgentVibes Voice] Server is offline');
      }
    }
  });

  // ============================================
  // Initialization
  // ============================================

  function init() {
    currentPlatform = detectPlatform();
    console.log(`[AgentVibes Voice] Detected platform: ${currentPlatform}`);
    console.log('[AgentVibes Voice] Simplified "wait then speak" mode active');

    loadSettings().then(() => {
      console.log('[AgentVibes Voice] Waiting 3 seconds before activating observer...');

      setTimeout(() => {
        setupObserver(currentPlatform);

        setTimeout(() => {
          console.log('[AgentVibes Voice] Grace period ended - cataloging existing messages...');

          markAllExistingMessagesAsSpoken(currentPlatform);

          isPageReady = true;
          console.log('[AgentVibes Voice] Page ready - will only speak NEW messages');

          setTimeout(() => {
            detectAndProcessMessages(currentPlatform);
          }, 500);
        }, INITIAL_LOAD_GRACE);
      }, OBSERVER_DELAY);
    });
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on navigation (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[AgentVibes Voice] URL changed, reinitializing...');

      isInitialized = false;
      isPageReady = false;

      stopAllPlayback();

      setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        init();
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
