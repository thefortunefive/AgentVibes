console.log('[AgentVibes Voice] Content script injected on:', window.location.href);

// AgentVibes Voice - Content Script
// Detects AI chat messages and adds voice output functionality
// Supports: ChatGPT, Claude, Genspark, and generic chat interfaces
// Features: Streaming TTS - processes sentences as they arrive

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
  let spokenMessages = new Set(); // Track spoken message hashes
  let spokenSentences = new Set(); // Track spoken sentence hashes for streaming
  let currentAudio = null;
  let stopButton = null;
  let observer = null;
  let isInitialized = false;
  let isPageReady = false;
  let lastSpeakTime = 0;
  const SPEAK_COOLDOWN = 5000; // 5 seconds between speaks
  const INITIAL_LOAD_GRACE = 5000; // 5 seconds grace period
  const MIN_TEXT_LENGTH = 50; // Changed from 20 to 50
  const OBSERVER_DELAY = 3000; // Wait 3 seconds before starting observer
  const DEBOUNCE_DELAY = 500; // 500ms debounce
  const POLLING_INTERVAL = 300; // 300ms for streaming text polling

  // ============================================
  // Streaming TTS - Sentence Queue Management
  // ============================================

  class SentenceQueue {
    constructor() {
      this.queue = [];
      this.isPlaying = false;
      this.currentAudio = null;
    }

    add(sentence) {
      const sentenceHash = hashMessage(sentence);

      // Skip if already spoken
      if (spokenSentences.has(sentenceHash)) {
        return false;
      }

      // Mark as spoken immediately to prevent duplicates
      spokenSentences.add(sentenceHash);
      this.queue.push(sentence);
      console.log('[AgentVibes Voice] Sentence added to queue:', sentence.substring(0, 40) + '...');

      // Start playing if not already
      if (!this.isPlaying) {
        this.playNext();
      }

      return true;
    }

    async playNext() {
      if (this.queue.length === 0) {
        this.isPlaying = false;
        hideSpeakingNotification();
        hideStopButton();
        return;
      }

      this.isPlaying = true;
      const sentence = this.queue.shift();

      try {
        await this.playSentence(sentence);
        // Continue with next sentence
        this.playNext();
      } catch (error) {
        console.error('[AgentVibes Voice] Error playing sentence:', error);
        // Continue with next even if one fails
        this.playNext();
      }
    }

    async playSentence(sentence) {
      return new Promise(async (resolve, reject) => {
        try {
          showSpeakingNotification();
          showStopButton();

          // Send TTS request to background script
          const response = await chrome.runtime.sendMessage({
            type: 'TTS_REQUEST',
            data: {
              text: sentence,
              voice: settings.voice,
              speed: 1.0,
              pitch: 1.0
            }
          });

          if (!response.success || !response.audioUrl) {
            throw new Error(response.error || 'TTS failed');
          }

          // Fetch audio through background script
          const fetchResponse = await chrome.runtime.sendMessage({
            type: 'FETCH_AUDIO',
            url: response.audioUrl
          });

          if (!fetchResponse.success || !fetchResponse.dataUrl) {
            throw new Error(fetchResponse.error || 'Failed to fetch audio');
          }

          // Play audio
          this.currentAudio = new Audio(fetchResponse.dataUrl);
          this.currentAudio.volume = settings.volume;

          // Track current audio globally for stop button
          currentAudio = this.currentAudio;

          this.currentAudio.onended = () => {
            this.currentAudio = null;
            currentAudio = null;
            resolve();
          };

          this.currentAudio.onerror = (e) => {
            console.error('[AgentVibes Voice] Audio playback failed:', e);
            this.currentAudio = null;
            currentAudio = null;
            reject(e);
          };

          await this.currentAudio.play();

        } catch (error) {
          console.error('[AgentVibes Voice] TTS error for sentence:', error);
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
      this.isPlaying = false;
    }

    isActive() {
      return this.isPlaying || this.queue.length > 0;
    }
  }

  // Global sentence queue for streaming TTS
  const sentenceQueue = new SentenceQueue();

  // Track streaming messages and their polling state
  const streamingMessages = new Map(); // messageId -> { element, lastText, sentencesSent, intervalId, isComplete }

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
    // Simple hash for message tracking
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

    // Clone to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove code blocks (they don't need to be spoken)
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

  function isMessageStreaming(element, platform) {
    if (!element) return true;

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
  // Sentence Extraction for Streaming TTS
  // ============================================

  function extractSentencesFromText(text, alreadySentSentences = new Set()) {
    // Split on sentence-ending punctuation followed by space or end of text
    // Matches: . ! ? followed by space, newline, or end of string
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
    const matches = text.match(sentenceRegex) || [];

    const newSentences = [];

    for (const match of matches) {
      const sentence = match.trim();

      // Skip very short sentences
      if (sentence.length < 10) continue;

      // Check if already sent (by hash)
      const sentenceHash = hashMessage(sentence);
      if (!alreadySentSentences.has(sentenceHash) && !spokenSentences.has(sentenceHash)) {
        newSentences.push(sentence);
        alreadySentSentences.add(sentenceHash);
      }
    }

    return newSentences;
  }

  function isCompleteSentence(text) {
    // Check if text ends with sentence-ending punctuation (possibly followed by whitespace)
    return /[.!?]\s*$/.test(text.trim());
  }

  // ============================================
  // Streaming Message Processing
  // ============================================

  function startStreamingProcessing(messageElement, platform, messageId) {
    // Skip if already being processed
    if (streamingMessages.has(messageId)) {
      return;
    }

    // Mark message as being handled by streaming TTS to prevent fallback speakText()
    messageElement.setAttribute('data-agentvibes-streaming', 'true');
    console.log('[AgentVibes Voice] Marked message for streaming TTS:', messageId);

    const config = PLATFORMS[platform];
    let textElement = messageElement;
    if (config && config.textSelector) {
      textElement = messageElement.querySelector(config.textSelector) || messageElement;
    }

    const streamingState = {
      element: messageElement,
      textElement: textElement,
      lastText: '',
      sentencesSent: new Set(),
      isComplete: false,
      platform: platform
    };

    streamingMessages.set(messageId, streamingState);

    console.log('[AgentVibes Voice] Started streaming processing for message:', messageId);

    // Start polling
    const intervalId = setInterval(() => {
      pollStreamingMessage(messageId);
    }, POLLING_INTERVAL);

    streamingState.intervalId = intervalId;

    // Add speaker icon immediately
    const currentText = extractCleanText(textElement, platform);
    addSpeakerIconToMessage(messageElement, currentText, platform);

    // Auto-speak first chunk if enabled
    if (settings.autoSpeak && settings.enabled && currentText.length >= MIN_TEXT_LENGTH) {
      const sentences = extractSentencesFromText(currentText, streamingState.sentencesSent);
      for (const sentence of sentences) {
        sentenceQueue.add(sentence);
      }
    }
  }

  function pollStreamingMessage(messageId) {
    const state = streamingMessages.get(messageId);
    if (!state) return;

    const { textElement, lastText, sentencesSent, element, platform } = state;
    const currentText = extractCleanText(textElement, platform);

    // Check if text has changed
    if (currentText === lastText) {
      // Check if streaming has finished
      const isStreaming = isMessageStreaming(element, platform);

      if (!isStreaming && !state.isComplete) {
        // Streaming finished - process any remaining text as final sentences
        state.isComplete = true;
        clearInterval(state.intervalId);

        // Get final sentences
        const finalSentences = extractSentencesFromText(currentText, sentencesSent);

        // Also check for any trailing incomplete sentence that should be spoken
        const remainingText = currentText.replace(lastText, '').trim();
        if (remainingText.length >= 10) {
          finalSentences.push(remainingText);
        }

        for (const sentence of finalSentences) {
          sentenceQueue.add(sentence);
        }

        // Mark message as fully processed and remove streaming attribute
        element.setAttribute('data-agentvibes-streaming', 'complete');
        element.dataset.agentvibesStreamingComplete = 'true';
        console.log('[AgentVibes Voice] Streaming completed for message:', messageId);

        // Clean up after a delay
        setTimeout(() => {
          streamingMessages.delete(messageId);
        }, 5000);
      }

      return;
    }

    // Text has grown - extract new sentences
    if (currentText.length > lastText.length) {
      console.log('[AgentVibes Voice] Text grew:', currentText.length, 'chars');

      // Extract new complete sentences
      const newSentences = extractSentencesFromText(currentText, sentencesSent);

      // Queue them for TTS
      for (const sentence of newSentences) {
        sentenceQueue.add(sentence);
      }

      state.lastText = currentText;
    }
  }

  function stopAllStreaming() {
    console.log('[AgentVibes Voice] Stopping all streaming TTS...');

    // Stop all polling intervals
    for (const [messageId, state] of streamingMessages) {
      if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
      // Keep the streaming messages in the map but mark them as stopped
      // This prevents them from being re-processed
    }

    // Clear the sentence queue and stop current audio
    sentenceQueue.clear();

    // Reset the spoken sentences tracking to prevent accumulation
    spokenSentences.clear();

    // Mark all streaming messages as stopped (but not complete)
    // This prevents the fallback from picking them up
    for (const [messageId, state] of streamingMessages) {
      if (state.element) {
        state.element.setAttribute('data-agentvibes-streaming', 'stopped');
      }
    }

    console.log('[AgentVibes Voice] All streaming TTS stopped, queue cleared');
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
    if (platform === 'CLAUDE') {
      messageElement.style.position = 'relative';
      icon.style.cssText = `
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
    } else if (platform === 'CHATGPT') {
      messageElement.style.position = 'relative';
      icon.style.cssText = `
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
    } else {
      // Generic positioning
      messageElement.style.position = 'relative';
      icon.style.cssText = `
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
    }

    // Hover effects
    icon.addEventListener('mouseenter', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.2)';
      icon.style.transform = 'scale(1.1)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.1)';
      icon.style.transform = 'scale(1)';
    });

    // Click handler
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakText(text, { isReplay: true });

      // Visual feedback
      icon.style.color = '#10b981';
      setTimeout(() => {
        icon.style.color = '#6366f1';
      }, 1000);
    });

    messageElement.appendChild(icon);
  }

  // ============================================
  // Text-to-Speech Functions
  // ============================================

  async function speakText(text, options = {}) {
    if (!text || text.length < 5) return;
    if (!settings.enabled && !options.isReplay) return;

    // Check cooldown (5 seconds between speaks) - only for non-replay
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

    // CRITICAL: Check if this text is from a message being handled by streaming TTS
    // We look for any message element that contains this text and is marked as streaming
    const messageElements = document.querySelectorAll('[data-agentvibes-streaming="true"]');
    for (const msgEl of messageElements) {
      const msgText = extractCleanText(msgEl, currentPlatform);
      if (msgText && (msgText.includes(text) || text.includes(msgText))) {
        console.log('[AgentVibes Voice] Skipping speakText - message is being handled by streaming TTS');
        return;
      }
    }

    // Update last speak time and mark as spoken
    lastSpeakTime = now;
    spokenMessages.add(textHash);

    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Show notification that we're speaking
    showSpeakingNotification();

    try {
      // Send TTS request to background script (avoids CORS)
      const response = await chrome.runtime.sendMessage({
        type: 'TTS_REQUEST',
        data: {
          text: text,
          voice: settings.voice,
          speed: 1.0,
          pitch: 1.0
        }
      });

      if (response.success && response.audioUrl) {
        // Fetch audio through background script to bypass Mixed Content restriction
        console.log('[AgentVibes Voice] Fetching audio via background script to avoid Mixed Content');

        const fetchResponse = await chrome.runtime.sendMessage({
          type: 'FETCH_AUDIO',
          url: response.audioUrl
        });

        if (!fetchResponse.success || !fetchResponse.dataUrl) {
          throw new Error(fetchResponse.error || 'Failed to fetch audio');
        }

        console.log('[AgentVibes Voice] Audio loaded as data URL, playing...');

        // Play audio using the base64 data URL (no Mixed Content issue)
        currentAudio = new Audio(fetchResponse.dataUrl);
        currentAudio.volume = settings.volume;

        // Show stop button when audio starts playing
        showStopButton();

        currentAudio.onended = () => {
          currentAudio = null;
          hideSpeakingNotification();
          hideStopButton();
        };

        currentAudio.onerror = (e) => {
          console.error('[AgentVibes Voice] Audio playback failed:', e);
          currentAudio = null;
          hideSpeakingNotification();
          hideStopButton();
          showErrorNotification('Audio playback failed');
        };

        await currentAudio.play();
      } else {
        throw new Error(response.error || 'TTS failed');
      }
    } catch (error) {
      console.error('[AgentVibes Voice] TTS error:', error);
      hideSpeakingNotification();
      showErrorNotification(error.message);
    }
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

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
    });

    // Click handler
    button.addEventListener('click', () => {
      stopAudioPlayback();
    });

    document.body.appendChild(button);
    return button;
  }

  function showStopButton() {
    if (!stopButton) {
      stopButton = createStopButton();
    }
    stopButton.style.display = 'flex';
    console.log('[AgentVibes Voice] Stop button shown');
  }

  function hideStopButton() {
    if (stopButton) {
      stopButton.style.display = 'none';
      console.log('[AgentVibes Voice] Stop button hidden');
    }
  }

  function stopAudioPlayback() {
    console.log('[AgentVibes Voice] Stopping all audio playback');

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Clear the sentence queue
    sentenceQueue.clear();

    // Stop all streaming processing
    stopAllStreaming();

    hideSpeakingNotification();

    // Only hide stop button if no more audio is queued or playing
    // Keep it visible while the sentence queue has items or audio is playing
    if (!sentenceQueue.isActive()) {
      hideStopButton();
    }
  }

  // Keyboard shortcut: Escape key stops audio
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopAudioPlayback();
    }
  });

  // Listen for stop message from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'STOP_SPEAKING') {
      stopAudioPlayback();
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

      // Add animation styles if not already added
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
      // Generic fallback
      processGenericMessage(element);
      return;
    }

    // Generate a unique ID for this message
    const messageId = element.dataset.messageId || hashMessage(element.outerHTML.substring(0, 200));
    element.dataset.messageId = messageId;

    // CRITICAL: Skip if this message was pre-marked as spoken during initial catalog
    if (element.getAttribute('data-agentvibes-spoken') === 'true') {
      return;
    }

    // Check if this message is already fully processed
    if (element.dataset.agentvibesStreamingComplete === 'true') {
      return;
    }

    // Check if message is streaming
    const isStreaming = isMessageStreaming(element, platform);

    // Get text content
    let textElement = element;
    if (config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }

    const text = extractCleanText(textElement, platform);

    // Only process substantial messages (more than 50 chars)
    if (text.length < MIN_TEXT_LENGTH) return;

    // Check if already processed as non-streaming
    const textHash = hashMessage(text);
    if (element.dataset.agentvibesProcessed === textHash && !isStreaming) {
      return;
    }

    // If streaming or text is still growing, use streaming processing
    if (isStreaming || !element.getAttribute('data-agentvibes-streaming')) {
      // Mark that we've started streaming processing
      element.setAttribute('data-agentvibes-streaming', 'true');
      element.dataset.agentvibesStreamingStarted = 'true';

      // Start streaming processing (polls text as it grows)
      startStreamingProcessing(element, platform, messageId);

      // Also mark as processed with current hash
      element.dataset.agentvibesProcessed = textHash;
    } else if (element.getAttribute('data-agentvibes-streaming') === 'complete' ||
               element.getAttribute('data-agentvibes-streaming') === 'stopped') {
      // Streaming is complete or was stopped - skip this message entirely
      // The streaming handler already processed or is handling it
      console.log('[AgentVibes Voice] Skipping non-streaming processing - message handled by streaming path');
      return;
    } else {
      // Non-streaming: process immediately as before (only for messages NOT marked as streaming)
      console.log('[AgentVibes Voice] New AI message found:', text.substring(0, 50));

      // Mark as processed
      element.dataset.agentvibesProcessed = textHash;

      // Add speaker icon
      addSpeakerIconToMessage(element, text, platform);

      // Auto-speak if enabled
      if (settings.autoSpeak && settings.enabled) {
        console.log('[AgentVibes Voice] Sending to TTS:', text.substring(0, 50));
        speakText(text);
      }
    }
  }

  function processGenericMessage(element) {
    // Skip during initial page load grace period
    if (!isPageReady) {
      console.log('[AgentVibes] Page not ready yet, skipping generic message');
      return;
    }

    // CRITICAL: Skip if this message was pre-marked as spoken during initial catalog
    if (element.getAttribute('data-agentvibes-spoken') === 'true') {
      return;
    }

    // CRITICAL: Skip if this message is being handled by streaming TTS
    const streamingAttr = element.getAttribute('data-agentvibes-streaming');
    if (streamingAttr === 'true' || streamingAttr === 'complete' || streamingAttr === 'stopped') {
      console.log('[AgentVibes Voice] Skipping generic processing - message handled by streaming');
      return;
    }

    // Generic detection for any chat-like element
    const text = extractCleanText(element, 'GENERIC');

    // Only process substantial messages (50 chars minimum)
    if (text.length < MIN_TEXT_LENGTH) return;

    // Detect if this looks like an AI message (heuristics)
    const isAssistant = (
      element.classList.contains('assistant') ||
      element.classList.contains('ai') ||
      element.classList.contains('bot') ||
      element.getAttribute('data-role') === 'assistant' ||
      element.querySelector('[class*="assistant"], [class*="ai"], [class*="bot"]') ||
      element.closest('[class*="assistant"], [class*="ai"]')
    );

    if (!isAssistant && text.length < 100) return; // Be more conservative for generic

    const textHash = hashMessage(text);

    if (element.dataset.agentvibesProcessed === textHash) return;
    element.dataset.agentvibesProcessed = textHash;

    console.log('[AgentVibes Voice] New AI message found:', text.substring(0, 50));

    addSpeakerIconToMessage(element, text, 'GENERIC');

    if (settings.autoSpeak && settings.enabled) {
      console.log('[AgentVibes Voice] Sending to TTS:', text.substring(0, 50));
      speakText(text);
    }
  }

  // ============================================
  // MutationObserver Setup
  // ============================================

  function findContainer(platform) {
    const config = PLATFORMS[platform];
    if (!config || !config.containerSelector) return null;

    // Try to find the container
    const container = document.querySelector(config.containerSelector);
    if (container) return container;

    // Fallback: look for main content areas
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

    // Find the specific container instead of observing entire body
    let targetNode = findContainer(platform);

    if (!targetNode) {
      console.log('[AgentVibes Voice] Chat container not found yet, will retry...');
      // Retry after a delay
      setTimeout(() => setupObserver(platform), 1000);
      return;
    }

    console.log('[AgentVibes Voice] MutationObserver attached to:', targetNode);

    observer = new MutationObserver((mutations) => {
      console.log('[AgentVibes Voice] Mutation detected:', mutations.length, 'changes');
      // Ignore mutations during initial page load
      if (!isPageReady) {
        return;
      }

      // Debounce: clear existing timer and set new one
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
      console.log(`[AgentVibes Voice] Scanning for messages (markOnly=${markOnly}), found:`, messages.length);
      messages.forEach(msg => {
        if (markOnly) {
          markMessageAsSpoken(msg, platform);
        } else {
          processMessageElement(msg, platform);
        }
      });
    } else {
      // Generic: look for chat message containers
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

    // Get text content
    let textElement = element;
    if (config && config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }

    const text = extractCleanText(textElement, platform);

    // Only mark substantial messages (more than 50 chars)
    if (text.length < MIN_TEXT_LENGTH) return;

    // Generate message ID
    const messageId = element.dataset.messageId || hashMessage(element.outerHTML.substring(0, 200));
    element.dataset.messageId = messageId;

    // Mark as spoken using data attribute
    element.setAttribute('data-agentvibes-spoken', 'true');

    // Also add to spokenMessages Set for extra safety
    const textHash = hashMessage(text);
    spokenMessages.add(textHash);

    // Mark as processed to prevent re-processing
    element.dataset.agentvibesProcessed = textHash;

    console.log('[AgentVibes Voice] Pre-marked existing message as spoken:', text.substring(0, 50));
  }

  function markAllExistingMessagesAsSpoken(platform) {
    console.log('[AgentVibes Voice] Marking all existing messages as spoken (initial catalog)...');

    // Temporarily set isPageReady to true so detection works
    const wasPageReady = isPageReady;
    isPageReady = true;

    // Scan and mark all existing messages without speaking them
    detectAndProcessMessages(platform, { markOnly: true });

    // Restore original state
    isPageReady = wasPageReady;

    console.log('[AgentVibes Voice] Finished cataloging existing messages. Will only speak NEW messages.');
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

      // Restore spoken messages from storage
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
    console.log('[AgentVibes Voice] Platform hostname:', window.location.hostname);

    loadSettings().then(() => {
      // Wait 3 seconds before setting up observer
      console.log('[AgentVibes Voice] Waiting 3 seconds before activating observer...');

      setTimeout(() => {
        setupObserver(currentPlatform);

        // Set page as ready after initial grace period
        setTimeout(() => {
          console.log('[AgentVibes Voice] Grace period ended - cataloging existing messages...');

          // CRITICAL: First, mark ALL existing messages as "already spoken"
          // This ensures old messages won't be spoken after page refresh
          markAllExistingMessagesAsSpoken(currentPlatform);

          // Now enable message processing for NEW messages only
          isPageReady = true;
          console.log('[AgentVibes Voice] Page ready - will only speak NEW messages');

          // Do a final scan to catch any messages that appeared during the grace period
          // but weren't present at the start of this timeout
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

      // Reset state
      isInitialized = false;
      isPageReady = false;

      // Stop all streaming when navigating away
      stopAllStreaming();

      // Delay to let new page render, then re-init
      setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        init();
      }, 2000); // 2 second delay after navigation
    }
  }).observe(document, { subtree: true, childList: true });

})();
