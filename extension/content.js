console.log('[AgentVibes Voice] Content script injected on:', window.location.href);

// AgentVibes Voice - Content Script (Browser TTS Fast Mode + Server TTS)
// Fast Mode: Uses window.speechSynthesis directly - no server latency
// Server Mode: Uses parallel TTS optimization with localhost server

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
  let settings = { enabled: true, volume: 1.0, voice: null, autoSpeak: true, fastMode: true };
  let spokenMessages = new Set();
  let currentAudio = null;
  let stopButton = null;
  let observer = null;
  let isInitialized = false;
  let isPageReady = false;
  let lastSpeakTime = 0;

  // Browser TTS state
  let browserVoices = [];
  let browserTTSQueue = [];
  let isSpeakingBrowserTTS = false;

  const SPEAK_COOLDOWN = 5000;
  const INITIAL_LOAD_GRACE = 5000;
  const MIN_TEXT_LENGTH = 50;
  const PARALLEL_SPLIT_THRESHOLD = 100;
  const OBSERVER_DELAY = 3000;
  const DEBOUNCE_DELAY = 500;
  const STREAMING_CHECK_INTERVAL = 500;
  const STREAMING_STABLE_THRESHOLD = 2000;

  // Track messages being monitored for completion
  const monitoredMessages = new Map();

  // Track sentences spoken in streaming mode (for fast mode)
  const spokenSentences = new Set();

  // ============================================
  // Contraction Expansion for TTS
  // ============================================

  /**
   * Contraction to expansion mapping for TTS preprocessing.
   * SAPI and browser TTS read contractions awkwardly, so we expand them.
   * Covers lowercase, Title Case, and UPPERCASE variants.
   */
  const CONTRACTION_MAP = {
    // "have" contractions
    "you've": "you have",
    "You've": "You have",
    "YOU'VE": "YOU HAVE",
    "i've": "I have",
    "I've": "I have",
    "I'VE": "I HAVE",
    "we've": "we have",
    "We've": "We have",
    "WE'VE": "WE HAVE",
    "they've": "they have",
    "They've": "They have",
    "THEY'VE": "THEY HAVE",
    // "not" contractions
    "don't": "do not",
    "Don't": "Do not",
    "DON'T": "DO NOT",
    "doesn't": "does not",
    "Doesn't": "Does not",
    "DOESN'T": "DOES NOT",
    "didn't": "did not",
    "Didn't": "Did not",
    "DIDN'T": "DID NOT",
    "won't": "will not",
    "Won't": "Will not",
    "WON'T": "WILL NOT",
    "wouldn't": "would not",
    "Wouldn't": "Would not",
    "WOULDN'T": "WOULD NOT",
    "couldn't": "could not",
    "Couldn't": "Could not",
    "COULDN'T": "COULD NOT",
    "shouldn't": "should not",
    "Shouldn't": "Should not",
    "SHOULDN'T": "SHOULD NOT",
    "can't": "cannot",
    "Can't": "Cannot",
    "CAN'T": "CANNOT",
    "isn't": "is not",
    "Isn't": "Is not",
    "ISN'T": "IS NOT",
    "aren't": "are not",
    "Aren't": "Are not",
    "AREN'T": "ARE NOT",
    "wasn't": "was not",
    "Wasn't": "Was not",
    "WASN'T": "WAS NOT",
    "weren't": "were not",
    "Weren't": "Were not",
    "WEREN'T": "WERE NOT",
    "haven't": "have not",
    "Haven't": "Have not",
    "HAVEN'T": "HAVE NOT",
    "hasn't": "has not",
    "Hasn't": "Has not",
    "HASN'T": "HAS NOT",
    "hadn't": "had not",
    "Hadn't": "Had not",
    "HADN'T": "HAD NOT",
    // "is" contractions
    "i'm": "I am",
    "I'm": "I am",
    "I'M": "I AM",
    "you're": "you are",
    "You're": "You are",
    "YOU'RE": "YOU ARE",
    "we're": "we are",
    "We're": "We are",
    "WE'RE": "WE ARE",
    "they're": "they are",
    "They're": "They are",
    "THEY'RE": "THEY ARE",
    "he's": "he is",
    "He's": "He is",
    "HE'S": "HE IS",
    "she's": "she is",
    "She's": "She is",
    "SHE'S": "SHE IS",
    "it's": "it is",
    "It's": "It is",
    "IT'S": "IT IS",
    "that's": "that is",
    "That's": "That is",
    "THAT'S": "THAT IS",
    "there's": "there is",
    "There's": "There is",
    "THERE'S": "THERE IS",
    // "will" contractions
    "i'll": "I will",
    "I'll": "I will",
    "I'LL": "I WILL",
    "you'll": "you will",
    "You'll": "You will",
    "YOU'LL": "YOU WILL",
    "we'll": "we will",
    "We'll": "We will",
    "WE'LL": "WE WILL",
    "they'll": "they will",
    "They'll": "They will",
    "THEY'LL": "THEY WILL",
    // "would" contractions
    "i'd": "I would",
    "I'd": "I would",
    "I'D": "I WOULD",
    "you'd": "you would",
    "You'd": "You would",
    "YOU'D": "YOU WOULD",
    "we'd": "we would",
    "We'd": "We would",
    "WE'D": "WE WOULD",
    "they'd": "they would",
    "They'd": "They would",
    "THEY'D": "THEY WOULD",
    // "us" contractions
    "let's": "let us",
    "Let's": "Let us",
    "LET'S": "LET US",
  };

  /**
   * Expand English contractions to their full forms for better TTS pronunciation.
   * Handles case-insensitive matching while preserving original capitalization.
   * @param {string} text The text containing contractions to expand
   * @returns {string} Text with contractions expanded
   */
  function expandContractions(text) {
    if (!text) return text;

    let expanded = text;

    // Sort contractions by length (longest first) to avoid partial matches
    const sortedContractions = Object.keys(CONTRACTION_MAP).sort((a, b) => b.length - a.length);

    for (const contraction of sortedContractions) {
      const expansion = CONTRACTION_MAP[contraction];
      // Use word boundaries to avoid replacing partial matches within words
      // Escape special regex characters in the contraction
      const escapedContraction = contraction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedContraction + '\\b', 'g');
      expanded = expanded.replace(regex, expansion);
    }

    return expanded;
  }

  // ============================================
  // Browser TTS (Fast Mode) Implementation
  // ============================================

  // Async function to get voices with proper loading handling
  function getBrowserVoicesAsync() {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.error('[AgentVibes Voice] speechSynthesis not available');
        resolve([]);
        return;
      }

      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Voices not loaded yet, wait for voiceschanged event
      const timeoutId = setTimeout(() => {
        // Fallback: resolve with whatever voices are available after 3 seconds
        voices = window.speechSynthesis.getVoices();
        console.log('[AgentVibes Voice] Voice loading timeout, returning', voices.length, 'voices');
        resolve(voices);
      }, 3000);

      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timeoutId);
        voices = window.speechSynthesis.getVoices();
        console.log('[AgentVibes Voice] Voices loaded via event:', voices.length, 'voices');
        resolve(voices);
      };
    });
  }

  function loadBrowserVoices() {
    if (!window.speechSynthesis) {
      console.error('[AgentVibes Voice] speechSynthesis not available');
      return [];
    }

    browserVoices = window.speechSynthesis.getVoices();
    
    // Sort voices by quality (prefer Neural/Natural voices)
    browserVoices.sort((a, b) => {
      const aIsNeural = a.name.toLowerCase().includes('neural') || 
                        a.name.toLowerCase().includes('natural') ||
                        a.name.toLowerCase().includes('premium') ||
                        a.name.toLowerCase().includes('enhanced');
      const bIsNeural = b.name.toLowerCase().includes('neural') || 
                        b.name.toLowerCase().includes('natural') ||
                        b.name.toLowerCase().includes('premium') ||
                        b.name.toLowerCase().includes('enhanced');
      
      // Prefer neural voices
      if (aIsNeural && !bIsNeural) return -1;
      if (!aIsNeural && bIsNeural) return 1;
      
      // Then sort by language (prefer English voices)
      const aIsEnglish = a.lang.toLowerCase().startsWith('en');
      const bIsEnglish = b.lang.toLowerCase().startsWith('en');
      
      if (aIsEnglish && !bIsEnglish) return -1;
      if (!aIsEnglish && bIsEnglish) return 1;
      
      return 0;
    });

    console.log('[AgentVibes Voice] Loaded', browserVoices.length, 'browser TTS voices');
    return browserVoices;
  }

  // Load voices when they're available
  if (window.speechSynthesis) {
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
    }
    // Try loading immediately in case they're already available
    loadBrowserVoices();
  }

  function getBrowserVoice(voiceName) {
    if (!browserVoices.length) {
      browserVoices = loadBrowserVoices();
    }

    if (!voiceName || voiceName === '') {
      // Return default voice (first one, likely system default)
      return browserVoices[0] || null;
    }

    // Try exact match
    let voice = browserVoices.find(v => v.name === voiceName);
    
    // Try case-insensitive match
    if (!voice) {
      voice = browserVoices.find(v => 
        v.name.toLowerCase() === voiceName.toLowerCase()
      );
    }

    // Try partial match
    if (!voice) {
      voice = browserVoices.find(v => 
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
    }

    return voice || browserVoices[0] || null;
  }

  function speakWithBrowserTTS(text, voiceName) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('speechSynthesis not available'));
        return;
      }

      // Expand contractions for better TTS pronunciation
      const expandedText = expandContractions(text);

      const utterance = new SpeechSynthesisUtterance(expandedText);
      const voice = getBrowserVoice(voiceName);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      utterance.volume = settings.volume;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('[AgentVibes Voice] Browser TTS started:', text.substring(0, 50) + '...');
        showSpeakingNotification();
        showStopButton();
        isSpeakingBrowserTTS = true;
      };

      utterance.onend = () => {
        console.log('[AgentVibes Voice] Browser TTS ended');
        isSpeakingBrowserTTS = false;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[AgentVibes Voice] Browser TTS error:', event.error);
        isSpeakingBrowserTTS = false;
        reject(new Error(event.error));
      };

      // speechSynthesis has built-in queue - just call speak()
      window.speechSynthesis.speak(utterance);
    });
  }

  function stopBrowserTTS() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingBrowserTTS = false;
    }
  }

  // ============================================
  // Sentence Streaming for Fast Mode
  // ============================================

  // Maximum characters per utterance to avoid browser TTS truncation
  const MAX_UTTERANCE_LENGTH = 200;

  function splitIntoSentences(text) {
    // Expand contractions before sentence splitting for better TTS
    const expandedText = expandContractions(text);

    // Match sentences ending with . ! ? followed by space or end of string
    const sentenceRegex = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;
    const matches = expandedText.match(sentenceRegex) || [];

    // Clean up and filter, also split long sentences
    const result = [];
    for (const s of matches) {
      const trimmed = s.trim();
      if (trimmed.length === 0) continue;

      // Split long sentences into chunks to avoid browser TTS limits
      if (trimmed.length > MAX_UTTERANCE_LENGTH) {
        const chunks = splitLongSentence(trimmed);
        result.push(...chunks);
      } else {
        result.push(trimmed);
      }
    }

    return result;
  }

  /**
   * Split a long sentence into smaller chunks at word boundaries.
   * Some browsers have ~200-300 char limits on speechSynthesis utterances.
   */
  function splitLongSentence(sentence) {
    const chunks = [];
    const words = sentence.split(' ');
    let currentChunk = '';

    for (const word of words) {
      // If adding this word would exceed the limit, save current chunk
      if (currentChunk.length + word.length + 1 > MAX_UTTERANCE_LENGTH && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  function getSentenceHash(sentence) {
    // Simple hash for sentence deduplication
    return hashMessage(sentence.trim().toLowerCase());
  }

  function speakSentencesStreaming(text, voiceName) {
    const sentences = splitIntoSentences(text);
    
    if (sentences.length === 0) {
      // No proper sentences found, speak the whole text
      speakWithBrowserTTS(text, voiceName).catch(err => {
        console.error('[AgentVibes Voice] Browser TTS error:', err);
      });
      return;
    }

    // Queue each new sentence
    sentences.forEach(sentence => {
      const sentenceHash = getSentenceHash(sentence);
      
      // Skip if we've already spoken this sentence
      if (spokenSentences.has(sentenceHash)) {
        return;
      }
      
      // Mark as spoken
      spokenSentences.add(sentenceHash);
      
      // Speak immediately - speechSynthesis queues automatically
      speakWithBrowserTTS(sentence, voiceName).catch(err => {
        console.error('[AgentVibes Voice] Browser TTS sentence error:', err);
      });
    });

    // Clean up old sentence hashes periodically (keep last 1000)
    if (spokenSentences.size > 1000) {
      const iterator = spokenSentences.values();
      for (let i = 0; i < 100; i++) {
        const value = iterator.next().value;
        spokenSentences.delete(value);
      }
    }
  }

  // ============================================
  // Server TTS (Parallel Audio Player) - For non-Fast Mode
  // ============================================

  class ParallelAudioPlayer {
    constructor() {
      this.isPlaying = false;
      this.currentAudio = null;
      this.preloadedAudio = null;
    }

    splitTextIntoHalves(text) {
      if (text.length < PARALLEL_SPLIT_THRESHOLD) {
        return [text];
      }

      const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
      const sentences = text.match(sentenceRegex) || [text];

      if (sentences.length <= 1) {
        return [text];
      }

      const totalLength = text.length;
      let firstHalfLength = 0;
      let splitIndex = 0;

      for (let i = 0; i < sentences.length; i++) {
        firstHalfLength += sentences[i].length;
        if (firstHalfLength >= totalLength / 2) {
          splitIndex = i + 1;
          break;
        }
      }

      if (splitIndex === 0) splitIndex = 1;
      if (splitIndex >= sentences.length) splitIndex = sentences.length - 1;

      const firstHalf = sentences.slice(0, splitIndex).join('').trim();
      const secondHalf = sentences.slice(splitIndex).join('').trim();

      return [firstHalf, secondHalf].filter(h => h.length > 0);
    }

    async fetchAudioParallel(text) {
      // Expand contractions before sending to server for better TTS
      const expandedText = expandContractions(text);

      const response = await chrome.runtime.sendMessage({
        type: 'TTS_REQUEST',
        data: {
          text: expandedText,
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

      return fetchResponse.dataUrl;
    }

    async playText(text) {
      if (!text || text.length < 5) return;

      const halves = this.splitTextIntoHalves(text);
      console.log('[AgentVibes Voice] Text split into', halves.length, 'halves');

      if (halves.length === 1) {
        await this.playSingleChunk(halves[0]);
      } else {
        await this.playParallelHalves(halves[0], halves[1]);
      }
    }

    async playSingleChunk(text) {
      showSpeakingNotification();
      showStopButton();

      try {
        const audioData = await this.fetchAudioParallel(text);
        await this.playAudioData(audioData);
      } catch (error) {
        console.error('[AgentVibes Voice] Error playing chunk:', error);
        throw error;
      }
    }

    async playParallelHalves(firstHalf, secondHalf) {
      this.isPlaying = true;
      showSpeakingNotification();
      showStopButton();

      let firstAudioData = null;
      let secondAudioData = null;

      try {
        console.log('[AgentVibes Voice] Fetching both halves in parallel...');
        const [firstResult, secondResult] = await Promise.allSettled([
          this.fetchAudioParallel(firstHalf),
          this.fetchAudioParallel(secondHalf)
        ]);

        if (firstResult.status === 'fulfilled') {
          firstAudioData = firstResult.value;
        } else {
          console.error('[AgentVibes Voice] First half failed:', firstResult.reason);
          throw firstResult.reason;
        }

        if (secondResult.status === 'fulfilled') {
          secondAudioData = secondResult.value;
        } else {
          console.error('[AgentVibes Voice] Second half failed (will skip):', secondResult.reason);
        }

        console.log('[AgentVibes Voice] Playing first half...');
        await this.playAudioData(firstAudioData);

        if (secondAudioData) {
          console.log('[AgentVibes Voice] Playing second half (already preloaded)...');
          await this.playAudioData(secondAudioData);
        }

      } catch (error) {
        console.error('[AgentVibes Voice] Parallel playback error:', error);
        throw error;
      } finally {
        this.isPlaying = false;
        hideSpeakingNotification();
        hideStopButton();
      }
    }

    playAudioData(dataUrl) {
      return new Promise((resolve, reject) => {
        const audio = new Audio(dataUrl);
        audio.volume = settings.volume;
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
          audio.play().catch(reject);
        } else {
          audio.addEventListener('canplay', () => {
            audio.play().catch(reject);
          }, { once: true });

          audio.addEventListener('error', (e) => {
            reject(e);
          }, { once: true });
        }
      });
    }

    stop() {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
        currentAudio = null;
      }
      this.isPlaying = false;
      this.preloadedAudio = null;
    }

    isActive() {
      return this.isPlaying || (this.currentAudio && !this.currentAudio.paused);
    }
  }

  const audioPlayer = new ParallelAudioPlayer();

  // ============================================
  // Unified Play Function (Fast Mode or Server)
  // ============================================

  function playText(text, options = {}) {
    if (!settings.enabled) return;

    if (settings.fastMode) {
      // Fast Mode: Use browser TTS with sentence streaming
      speakSentencesStreaming(text, settings.voice);
    } else {
      // Server Mode: Use parallel audio player
      audioPlayer.playText(text).catch(error => {
        console.error('[AgentVibes Voice] Server TTS playback failed:', error);
      });
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

    // Stop server TTS (audio player)
    audioPlayer.stop();

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Stop browser TTS
    stopBrowserTTS();

    hideSpeakingNotification();
    hideStopButton();
  }

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

    const codeBlocks = clone.querySelectorAll('pre, code, .code-block, [class*="code"]');
    codeBlocks.forEach(block => block.remove());

    const hidden = clone.querySelectorAll('[hidden], .sr-only, .visually-hidden');
    hidden.forEach(el => el.remove());

    let text = clone.textContent || '';

    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return text;
  }

  function isMessageStreaming(element, platform) {
    if (!element) return false;

    const config = PLATFORMS[platform];
    if (!config) return false;

    if (config.streamingAttribute) {
      const streaming = element.getAttribute(config.streamingAttribute);
      if (streaming === 'true') return true;
    }

    if (config.streamingSelector) {
      if (element.querySelector(config.streamingSelector)) return true;
    }

    if (element.classList.contains('result-streaming')) return true;
    if (element.querySelector('.result-streaming')) return true;

    if (element.querySelector('.cursor, [class*="blink"], [class*="cursor"]')) return true;

    return false;
  }

  // ============================================
  // Message Monitoring - Wait for completion
  // ============================================

  function startMonitoringMessage(messageElement, platform, messageId) {
    if (monitoredMessages.has(messageId)) return;

    const config = PLATFORMS[platform];
    let textElement = messageElement;
    if (config && config.textSelector) {
      textElement = messageElement.querySelector(config.textSelector) || messageElement;
    }

    const initialText = extractCleanText(textElement, platform);

    if (initialText.length < MIN_TEXT_LENGTH) return;

    messageElement.setAttribute('data-agentvibes-monitoring', 'true');

    const monitorState = {
      element: messageElement,
      textElement: textElement,
      lastText: initialText,
      lastChangeTime: Date.now(),
      isComplete: false,
      platform: platform,
      checkInterval: null,
      // For Fast Mode: track which sentence index we've spoken up to
      // (avoids text length issues with contraction expansion)
      lastSpokenSentenceIndex: -1
    };

    monitoredMessages.set(messageId, monitorState);

    console.log('[AgentVibes Voice] Started monitoring message:', messageId, 'Initial length:', initialText.length);

    // For Fast Mode: speak sentences as they complete during streaming
    monitorState.checkInterval = setInterval(() => {
      if (settings.fastMode) {
        checkMessageStreamingForFastMode(messageId);
      } else {
        checkMessageCompletion(messageId);
      }
    }, STREAMING_CHECK_INTERVAL);

    addSpeakerIconToMessage(messageElement, initialText, platform);
  }

  // Fast Mode: Speak sentences as they appear during streaming
  function checkMessageStreamingForFastMode(messageId) {
    const state = monitoredMessages.get(messageId);
    if (!state) return;

    const { textElement, element, platform, lastText, lastChangeTime, isComplete } = state;

    if (isComplete) return;

    const currentText = extractCleanText(textElement, platform);
    const now = Date.now();

    // Update last change time if text changed
    if (currentText !== lastText) {
      state.lastText = currentText;
      state.lastChangeTime = now;
    }

    if (currentText.length > 0) {
      // Split ALL current text into sentences (with contraction expansion)
      // Use sentence content hashing for deduplication instead of position tracking
      // This avoids the text length mismatch between expanded/unexpanded text
      const allSentences = splitIntoSentences(currentText);

      // Find sentences we haven't spoken yet
      const newSentences = [];
      let lastCompleteSentenceIndex = -1;

      for (let i = 0; i < allSentences.length; i++) {
        const sentence = allSentences[i];
        const sentenceHash = getSentenceHash(sentence);

        // Check if this is a complete sentence (ends with punctuation)
        const isCompleteSentence = sentence.match(/[.!?]\s*$/);

        if (!spokenSentences.has(sentenceHash)) {
          if (isCompleteSentence) {
            newSentences.push({ sentence, hash: sentenceHash, index: i });
            lastCompleteSentenceIndex = i;
          }
          // Don't add incomplete final sentence yet - wait for completion
        } else if (isCompleteSentence) {
          // This sentence was already spoken, update our position
          lastCompleteSentenceIndex = i;
        }
      }

      // Speak all new complete sentences
      newSentences.forEach(({ sentence, hash }) => {
        console.log('[AgentVibes Voice] Fast Mode: Speaking sentence:', sentence.substring(0, 50) + '...');
        spokenSentences.add(hash);

        // Speak immediately - speechSynthesis has built-in queue
        speakWithBrowserTTS(sentence, settings.voice).catch(err => {
          console.error('[AgentVibes Voice] Fast Mode TTS error:', err);
        });
      });

      // Track which sentence we're up to (for remaining text calculation)
      state.lastSpokenSentenceIndex = lastCompleteSentenceIndex;
    }

    // Check if streaming has stopped completely
    const isStreaming = isMessageStreaming(element, platform);
    const timeSinceChange = now - lastChangeTime;

    if (!isStreaming && timeSinceChange >= STREAMING_STABLE_THRESHOLD) {
      // Message is complete
      state.isComplete = true;
      clearInterval(state.checkInterval);

      // Speak any remaining text that didn't end with a sentence
      // Extract remaining portion from original text based on sentence position
      const allSentences = splitIntoSentences(currentText);
      let spokenCount = 0;
      for (const sentence of allSentences) {
        if (spokenSentences.has(getSentenceHash(sentence))) {
          spokenCount++;
        }
      }

      // Get sentences that haven't been spoken (including incomplete ones)
      const remainingSentences = allSentences.slice(spokenCount);
      const remainingText = remainingSentences.join(' ').trim();

      if (remainingText.length > 0) {
        console.log('[AgentVibes Voice] Fast Mode: Speaking remaining text:', remainingText.substring(0, 50) + '...');
        speakWithBrowserTTS(remainingText, settings.voice).catch(err => {
          console.error('[AgentVibes Voice] Fast Mode remaining TTS error:', err);
        });
      }

      element.setAttribute('data-agentvibes-monitoring', 'complete');
      element.dataset.agentvibesComplete = 'true';

      // Mark as spoken
      const textHash = hashMessage(currentText);
      spokenMessages.add(textHash);
      element.dataset.agentvibesSpoken = textHash;

      // Clean up after a delay
      setTimeout(() => {
        monitoredMessages.delete(messageId);
      }, 5000);
    }
  }

  // Server Mode: Wait for full message completion then speak
  function checkMessageCompletion(messageId) {
    const state = monitoredMessages.get(messageId);
    if (!state) return;

    const { textElement, element, platform, lastText, lastChangeTime, isComplete } = state;

    if (isComplete) return;

    const currentText = extractCleanText(textElement, platform);
    const now = Date.now();

    if (currentText !== lastText) {
      state.lastText = currentText;
      state.lastChangeTime = now;
      return;
    }

    const timeSinceChange = now - lastChangeTime;
    const isStreaming = isMessageStreaming(element, platform);
    const isCompleteNow = !isStreaming && timeSinceChange >= STREAMING_STABLE_THRESHOLD;

    if (isCompleteNow && currentText.length >= MIN_TEXT_LENGTH) {
      state.isComplete = true;
      clearInterval(state.checkInterval);

      console.log('[AgentVibes Voice] Message complete! Length:', currentText.length);

      element.setAttribute('data-agentvibes-monitoring', 'complete');
      element.dataset.agentvibesComplete = 'true';

      processCompleteMessage(element, currentText, platform, messageId);

      setTimeout(() => {
        monitoredMessages.delete(messageId);
      }, 5000);
    }
  }

  function processCompleteMessage(element, text, platform, messageId) {
    const textHash = hashMessage(text);
    if (spokenMessages.has(textHash)) {
      console.log('[AgentVibes Voice] Message already spoken, skipping');
      return;
    }

    spokenMessages.add(textHash);
    element.dataset.agentvibesSpoken = textHash;

    console.log('[AgentVibes Voice] Processing complete message, length:', text.length);

    if (settings.autoSpeak && settings.enabled) {
      console.log('[AgentVibes Voice] Starting TTS playback');
      playText(text);
    }
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
    if (messageElement.querySelector('.agentvibes-speaker-icon')) return;

    const icon = createSpeakerIcon();

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

    icon.addEventListener('mouseenter', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.2)';
      icon.style.transform = 'scale(1.1)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.background = 'rgba(99, 102, 241, 0.1)';
      icon.style.transform = 'scale(1)';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const config = PLATFORMS[platform];
      let textElement = messageElement;
      if (config && config.textSelector) {
        textElement = messageElement.querySelector(config.textSelector) || messageElement;
      }
      const currentText = extractCleanText(textElement, platform);

      stopAllPlayback();

      // Replay using current mode
      playText(currentText);

      icon.style.color = '#10b981';
      setTimeout(() => {
        icon.style.color = '#6366f1';
      }, 1000);
    });

    messageElement.appendChild(icon);
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
      // Only hide if nothing is playing
      setTimeout(() => {
        if (!isSpeakingBrowserTTS && !audioPlayer.isActive()) {
          notif.style.display = 'none';
        }
      }, 500);
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
    if (!isPageReady) {
      console.log('[AgentVibes Voice] Page not ready yet, skipping message');
      return;
    }

    const config = PLATFORMS[platform];
    if (!config) {
      processGenericMessage(element);
      return;
    }

    const messageId = element.dataset.messageId || hashMessage(element.outerHTML.substring(0, 200));
    element.dataset.messageId = messageId;

    if (element.getAttribute('data-agentvibes-spoken') === 'true') return;
    if (element.dataset.agentvibesComplete === 'true') return;
    if (monitoredMessages.has(messageId)) return;
    if (element.getAttribute('data-agentvibes-monitoring') === 'true') return;
    if (element.getAttribute('data-agentvibes-monitoring') === 'complete') return;

    let textElement = element;
    if (config.textSelector) {
      textElement = element.querySelector(config.textSelector) || element;
    }

    const text = extractCleanText(textElement, platform);

    if (text.length < MIN_TEXT_LENGTH) return;

    const textHash = hashMessage(text);
    if (spokenMessages.has(textHash)) return;

    startMonitoringMessage(element, platform, messageId);
  }

  function processGenericMessage(element) {
    if (!isPageReady) return;

    if (element.getAttribute('data-agentvibes-spoken') === 'true') return;

    const text = extractCleanText(element, 'GENERIC');
    if (text.length < MIN_TEXT_LENGTH) return;

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

    spokenMessages.add(textHash);
    addSpeakerIconToMessage(element, text, 'GENERIC');

    if (settings.autoSpeak && settings.enabled) {
      playText(text);
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
    console.log('[AgentVibes Voice] Mode:', settings.fastMode ? 'Fast (Browser TTS)' : 'Server (Parallel TTS)');

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
        'enabled', 'volume', 'voice', 'autoSpeak', 'fastMode', 'spokenMessages'
      ]);

      settings = {
        enabled: result.enabled !== false,
        volume: result.volume || 1.0,
        voice: result.voice || null,
        autoSpeak: result.autoSpeak !== false,
        fastMode: result.fastMode !== false  // Default to Fast Mode
      };

      console.log('[AgentVibes Voice] Settings loaded - Fast Mode:', settings.fastMode);

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
    if (request.type === 'TOGGLE_FAST_MODE') {
      settings.fastMode = request.fastMode;
      console.log('[AgentVibes Voice] Fast Mode toggled:', settings.fastMode);
    }
    if (request.type === 'SERVER_STATUS_CHANGE') {
      if (request.online) {
        console.log('[AgentVibes Voice] Server is online');
      } else {
        console.log('[AgentVibes Voice] Server is offline');
      }
    }
    if (request.type === 'VOICE_CHANGED') {
      const newVoice = request.voice;
      console.log('[AgentVibes Voice] Voice changed to:', newVoice);
      settings.voice = newVoice;

      chrome.storage.local.set({ voice: newVoice }).then(() => {
        console.log('[AgentVibes Voice] Voice setting saved to storage');
      }).catch(err => {
        console.error('[AgentVibes Voice] Failed to save voice setting:', err);
      });

      if (sendResponse) {
        sendResponse({ success: true, voice: newVoice });
      }
    }
    if (request.type === 'STOP_SPEAKING') {
      stopAllPlayback();
      if (sendResponse) {
        sendResponse({ success: true });
      }
    }
    if (request.type === 'GET_BROWSER_VOICES') {
      // Return available browser voices (async to handle initial loading)
      getBrowserVoicesAsync().then(voices => {
        // Update the cache and sort
        browserVoices = voices;
        browserVoices.sort((a, b) => {
          const aIsNeural = a.name.toLowerCase().includes('neural') ||
                            a.name.toLowerCase().includes('natural') ||
                            a.name.toLowerCase().includes('premium') ||
                            a.name.toLowerCase().includes('enhanced');
          const bIsNeural = b.name.toLowerCase().includes('neural') ||
                            b.name.toLowerCase().includes('natural') ||
                            b.name.toLowerCase().includes('premium') ||
                            b.name.toLowerCase().includes('enhanced');
          if (aIsNeural && !bIsNeural) return -1;
          if (!aIsNeural && bIsNeural) return 1;
          const aIsEnglish = a.lang.toLowerCase().startsWith('en');
          const bIsEnglish = b.lang.toLowerCase().startsWith('en');
          if (aIsEnglish && !bIsEnglish) return -1;
          if (!aIsEnglish && bIsEnglish) return 1;
          return 0;
        });

        if (sendResponse) {
          sendResponse({
            success: true,
            voices: browserVoices.map(v => ({
              name: v.name,
              lang: v.lang,
              default: v.default
            }))
          });
        }
      }).catch(err => {
        console.error('[AgentVibes Voice] Error getting browser voices:', err);
        if (sendResponse) {
          sendResponse({
            success: false,
            voices: [],
            error: err.message
          });
        }
      });
      return true;
    }

    if (request.type === 'TEST_BROWSER_TTS') {
      // Handle test voice from popup using browser TTS
      const { text, voice, volume } = request;

      // Create utterance with specified voice and volume
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = voice ? getBrowserVoice(voice) : browserVoices[0];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }

      utterance.volume = volume || 1.0;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('[AgentVibes Voice] Test TTS started');
        showSpeakingNotification();
        showStopButton();
      };

      utterance.onend = () => {
        console.log('[AgentVibes Voice] Test TTS ended');
        hideSpeakingNotification();
        hideStopButton();
      };

      utterance.onerror = (event) => {
        console.error('[AgentVibes Voice] Test TTS error:', event.error);
        hideSpeakingNotification();
        hideStopButton();
      };

      window.speechSynthesis.speak(utterance);

      if (sendResponse) {
        sendResponse({ success: true });
      }
      return true;
    }

    // Return true to indicate we will send a response asynchronously
    return true;
  });

  // ============================================
  // Initialization
  // ============================================

  function init() {
    currentPlatform = detectPlatform();
    console.log(`[AgentVibes Voice] Detected platform: ${currentPlatform}`);
    console.log('[AgentVibes Voice] Fast Mode available:', !!window.speechSynthesis);

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
