// AgentVibes Voice - Content Script
// Detects AI chat messages and adds voice output functionality
// Supports: ChatGPT, Claude, Genspark, and generic chat interfaces

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
  let currentAudio = null;
  let observer = null;
  let isInitialized = false;
  let isPageReady = false;
  let lastSpeakTime = 0;
  const SPEAK_COOLDOWN = 5000; // 5 seconds between speaks
  const INITIAL_LOAD_GRACE = 5000; // 5 seconds grace period
  const MIN_TEXT_LENGTH = 50; // Changed from 20 to 50
  const OBSERVER_DELAY = 3000; // Wait 3 seconds before starting observer
  const DEBOUNCE_DELAY = 500; // 500ms debounce
  
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
    
    // Check cooldown (5 seconds between speaks)
    const now = Date.now();
    if (!options.isReplay && (now - lastSpeakTime) < SPEAK_COOLDOWN) {
      console.log('[AgentVibes] Speak cooldown active, skipping');
      return;
    }
    
    const textHash = hashMessage(text);
    
    // Skip if already spoken (unless manual replay)
    if (!options.isReplay && spokenMessages.has(textHash)) {
      console.log('[AgentVibes] Skipping already spoken message');
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
        // Play audio
        currentAudio = new Audio(response.audioUrl);
        currentAudio.volume = settings.volume;
        
        currentAudio.onended = () => {
          currentAudio = null;
          hideSpeakingNotification();
        };
        
        currentAudio.onerror = () => {
          console.error('[AgentVibes] Audio playback failed');
          currentAudio = null;
          hideSpeakingNotification();
          showErrorNotification('Audio playback failed');
        };
        
        await currentAudio.play();
      } else {
        throw new Error(response.error || 'TTS failed');
      }
    } catch (error) {
      console.error('[AgentVibes] TTS error:', error);
      hideSpeakingNotification();
      showErrorNotification(error.message);
    }
  }
  
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
      console.log('[AgentVibes] Page not ready yet, skipping message');
      return;
    }
    
    const config = PLATFORMS[platform];
    if (!config) {
      // Generic fallback
      processGenericMessage(element);
      return;
    }
    
    // Check if message is finished streaming
    if (isMessageStreaming(element, platform)) {
      return; // Still streaming, wait for it to finish
    }
    
    // Extract text
    let textElement = element;
    if (config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }
    
    const text = extractCleanText(textElement, platform);
    
    // Only process substantial messages (more than 50 chars)
    if (text.length < MIN_TEXT_LENGTH) return;
    
    const textHash = hashMessage(text);
    
    // Skip if already processed
    if (element.dataset.agentvibesProcessed === textHash) return;
    
    // Mark as processed
    element.dataset.agentvibesProcessed = textHash;
    
    // Add speaker icon
    addSpeakerIconToMessage(element, text, platform);
    
    // Auto-speak if enabled
    if (settings.autoSpeak && settings.enabled) {
      speakText(text);
    }
  }
  
  function processGenericMessage(element) {
    // Skip during initial page load grace period
    if (!isPageReady) {
      console.log('[AgentVibes] Page not ready yet, skipping generic message');
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
    
    addSpeakerIconToMessage(element, text, 'GENERIC');
    
    if (settings.autoSpeak && settings.enabled) {
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
      console.log('[AgentVibes] Chat container not found yet, will retry...');
      // Retry after a delay
      setTimeout(() => setupObserver(platform), 1000);
      return;
    }
    
    console.log('[AgentVibes] Observer attached to container:', targetNode);
    
    observer = new MutationObserver((mutations) => {
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
      attributeFilter: ['data-is-streaming', 'data-streaming', 'class']
    });
    
    isInitialized = true;
    
    // Initial scan after delay
    setTimeout(() => {
      detectAndProcessMessages(platform);
    }, 500);
  }
  
  function detectAndProcessMessages(platform) {
    const config = PLATFORMS[platform];
    
    if (config && config.messageSelector) {
      const messages = document.querySelectorAll(config.messageSelector);
      messages.forEach(msg => processMessageElement(msg, platform));
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
          messages.forEach(msg => processMessageElement(msg, 'GENERIC'));
        } catch (e) {
          // Invalid selector, skip
        }
      });
    }
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
      
      // Restore spoken messages from storage
      if (result.spokenMessages) {
        Object.keys(result.spokenMessages).forEach(hash => {
          spokenMessages.add(hash);
        });
      }
    } catch (error) {
      console.error('[AgentVibes] Failed to load settings:', error);
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
        console.log('[AgentVibes] Server is online');
      } else {
        console.log('[AgentVibes] Server is offline');
      }
    }
  });
  
  // ============================================
  // Initialization
  // ============================================
  
  function init() {
    currentPlatform = detectPlatform();
    console.log(`[AgentVibes] Detected platform: ${currentPlatform}`);
    
    loadSettings().then(() => {
      // Wait 3 seconds before setting up observer
      console.log('[AgentVibes] Waiting 3 seconds before activating observer...');
      
      setTimeout(() => {
        setupObserver(currentPlatform);
        
        // Set page as ready after initial grace period
        setTimeout(() => {
          isPageReady = true;
          console.log('[AgentVibes] Page ready - processing messages enabled');
          
          // Do initial scan now that page is ready
          detectAndProcessMessages(currentPlatform);
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
      console.log('[AgentVibes] URL changed, reinitializing...');
      
      // Reset state
      isInitialized = false;
      isPageReady = false;
      
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
