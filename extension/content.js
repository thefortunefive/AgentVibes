console.log('[AgentVibes Voice] Content script injected on:', window.location.href);

// AgentVibes Voice - Content Script (Edge TTS Fast Mode + Server TTS)
// Fast Mode: Uses Microsoft Edge TTS via WebSocket - high quality, no server needed
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
  let settings = { enabled: true, volume: 1.0, rate: 1.0, voice: null, autoSpeak: true, fastMode: true };
  let spokenMessages = new Set();
  let currentAudio = null;
  let stopButton = null;
  let muteButton = null;
  let isMuted = false;
  let observer = null;
  let isInitialized = false;
  let isPageReady = false;
  let lastSpeakTime = 0;

  // Edge TTS state for Fast Mode
  let isSpeakingEdgeTTS = false;

  const SPEAK_COOLDOWN = 5000;
  const INITIAL_LOAD_GRACE = 5000;
  const MIN_TEXT_LENGTH = 50;
  const PARALLEL_SPLIT_THRESHOLD = 100;
  const OBSERVER_DELAY = 3000;
  const DEBOUNCE_DELAY = 500;
  const STREAMING_CHECK_INTERVAL = 300;
  const STREAMING_STABLE_THRESHOLD = 2000;

  // Track messages being monitored for completion
  const monitoredMessages = new Map();

  // Track sentences spoken in streaming mode (for fast mode)
  const spokenSentences = new Set();
  
  // Sentence-level tracking for proper streaming
  let sentenceArray = [];
  let nextSpeakIndex = 0;
  let currentMessageId = null;

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
  // Edge TTS (Fast Mode) Implementation - Now in Background Script
  // ============================================
  // EdgeTTSClient class moved to background.js to avoid CSP issues
  // Content script now uses message-based communication with background

  // ============================================
  // Fast Mode TTS Functions (Background Script Communication)
  // ============================================

  // ============================================
  // Fast Mode TTS Functions
  // ============================================


  function speakWithEdgeTTS(text, voiceName, rate, volume) {
    return new Promise(async (resolve, reject) => {
      try {
        // Show UI
        showSpeakingNotification();
        showStopButton();
        showMuteButton();
        isSpeakingEdgeTTS = true;

        // Send message to background script for TTS synthesis
        const voiceToUse = voiceName || settings.voice || 'en-US-AndrewNeural';
        const response = await browser.runtime.sendMessage({
          type: 'EDGE_TTS_SPEAK',
          text: text,
          voice: voiceToUse,
          rate: rate || settings.rate,
          volume: volume || settings.volume
        });

        if (response.success) {
          // Play the returned audio data URL
          const audio = new Audio(response.dataUrl);
          audio.volume = settings.volume;
          currentAudio = audio;

          audio.onended = () => {
            currentAudio = null;
            isSpeakingEdgeTTS = false;
            hideSpeakingNotification();
            hideStopButton();
            resolve();
          };

          audio.onerror = (error) => {
            currentAudio = null;
            isSpeakingEdgeTTS = false;
            hideSpeakingNotification();
            hideStopButton();
            reject(new Error('Audio playback failed'));
          };

          await audio.play();
        } else {
          throw new Error(response.error || 'TTS synthesis failed');
        }
      } catch (error) {
        isSpeakingEdgeTTS = false;
        hideSpeakingNotification();
        hideStopButton();
        reject(error);
      }
    });
  }

  function stopEdgeTTS() {
    // Stop audio playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    // Send stop message to background script
    browser.runtime.sendMessage({ type: 'EDGE_TTS_STOP' });
    isSpeakingEdgeTTS = false;
  }

  // ============================================
  // Sentence Batching - ChunkQueue for Fast Mode
  // ============================================

  const MIN_CHUNK_LENGTH = 80;       // Minimum characters before sending to TTS
  const MAX_CHUNK_SENTENCES = 2;     // Maximum sentences per chunk
  const FLUSH_TIMEOUT = 1500;        // Flush timeout in milliseconds (1.5 seconds)

  class ChunkQueue {
    constructor() {
      this.queue = [];
      this.isPlaying = false;
      this.pendingBuffer = '';        // Buffer for accumulating sentences
      this.pendingSentences = 0;      // Count of complete sentences in buffer
      this.processedSentences = new Set(); // Duplicate detection
      this.isFirstSentence = true;    // Send first sentence immediately
      this.flushTimer = null;         // Timer for flush timeout
    }

    // Add text to buffer. Returns true if a chunk was created and queued.
    addText(text, isFinal = false) {
      if (!text || text.length < 5) return false;

      // Clear any existing flush timer
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      // Add to pending buffer
      this.pendingBuffer += (this.pendingBuffer ? ' ' : '') + text;
      this.pendingSentences++;

      const bufferLength = this.pendingBuffer.length;

      // Send first complete sentence immediately regardless of length;
      // for subsequent sentences use normal batching rules.
      const shouldCreateChunk = isFinal ||
                                (this.isFirstSentence && this.isCompleteSentence(this.pendingBuffer)) ||
                                bufferLength >= MIN_CHUNK_LENGTH ||
                                this.pendingSentences >= MAX_CHUNK_SENTENCES;

      if (shouldCreateChunk && bufferLength >= 10) {
        const chunk = this.pendingBuffer.trim();

        // Duplicate detection: skip if chunk or any sentence already processed
        if (this.isChunkDuplicate(chunk)) {
          this.resetBuffer();
          return false;
        }

        // Mark as processed immediately
        this.addChunkToProcessed(chunk);
        this.queue.push(chunk);
        console.log('[AgentVibes Voice] Chunk queued (' + bufferLength + ' chars, ' + this.pendingSentences + ' sentences):', chunk.substring(0, 60) + (chunk.length > 60 ? '...' : ''));

        this.isFirstSentence = false;
        this.resetBuffer();

        // Start playing if not already
        if (!this.isPlaying) {
          this.playNext();
        }

        return true;
      }

      // Set flush timeout for incomplete chunks
      if (this.pendingBuffer.length > 0) {
        this.flushTimer = setTimeout(() => {
          console.log('[AgentVibes Voice] Flush timeout reached, forcing chunk creation');
          this.flushBuffer();
        }, FLUSH_TIMEOUT);
      }

      return false;
    }

    resetBuffer() {
      this.pendingBuffer = '';
      this.pendingSentences = 0;
    }

    // Clear processed sentences when a new message starts
    clearProcessedSentences() {
      this.processedSentences.clear();
      this.isFirstSentence = true;
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
    }

    // Check if chunk or any of its sentences are already processed
    isChunkDuplicate(chunk) {
      const chunkHash = hashMessage(chunk);
      if (this.processedSentences.has(chunkHash)) {
        return true;
      }
      const sentences = this.splitIntoSentences(chunk);
      for (const sentence of sentences) {
        const sentenceHash = hashMessage(sentence);
        if (this.processedSentences.has(sentenceHash)) {
          return true;
        }
      }
      return false;
    }

    // Add chunk and its sentences to processed set
    addChunkToProcessed(chunk) {
      const chunkHash = hashMessage(chunk);
      this.processedSentences.add(chunkHash);
      const sentences = this.splitIntoSentences(chunk);
      for (const sentence of sentences) {
        const sentenceHash = hashMessage(sentence);
        this.processedSentences.add(sentenceHash);
      }
    }

    splitIntoSentences(text) {
      const sentenceRegex = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;
      const matches = text.match(sentenceRegex) || [];
      return matches.map(s => s.trim()).filter(s => s.length > 0);
    }

    isCompleteSentence(text) {
      return /[.!?]\s*$/.test(text.trim());
    }

    // Force flush any remaining buffer as a final chunk
    flushBuffer() {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      if (this.pendingBuffer && this.pendingBuffer.length >= 5) {
        // Force-create chunk from remaining buffer by passing isFinal=true
        const chunk = this.pendingBuffer.trim();
        if (!this.isChunkDuplicate(chunk)) {
          this.addChunkToProcessed(chunk);
          this.queue.push(chunk);
          console.log('[AgentVibes Voice] Final chunk flushed (' + chunk.length + ' chars):', chunk.substring(0, 60) + (chunk.length > 60 ? '...' : ''));
          if (!this.isPlaying) {
            this.playNext();
          }
        }
        this.resetBuffer();
      }
    }

    async playNext() {
      if (this.queue.length === 0) {
        this.isPlaying = false;
        // If Edge TTS is not currently speaking, hide UI
        if (!isSpeakingEdgeTTS) {
          hideSpeakingNotification();
          hideStopButton();
        }
        return;
      }

      this.isPlaying = true;
      const chunk = this.queue.shift();

      try {
        await this.playChunk(chunk);
        // Continue with next chunk
        this.playNext();
      } catch (error) {
        console.error('[AgentVibes Voice] Error playing chunk:', error);
        // Continue with next even if one fails
        this.playNext();
      }
    }

    async playChunk(chunk) {
      // Expand contractions before sending to Edge TTS
      const expandedChunk = expandContractions(chunk);
      console.log('[AgentVibes Voice] Playing chunk via Edge TTS:', expandedChunk.substring(0, 60) + (expandedChunk.length > 60 ? '...' : ''));

      // Use Edge TTS WebSocket for synthesis and playback
      await speakWithEdgeTTS(expandedChunk, settings.voice, settings.rate, settings.volume);
    }

    clear() {
      this.queue = [];
      this.resetBuffer();
      this.clearProcessedSentences();
      this.isPlaying = false;
    }

    isActive() {
      return this.isPlaying || this.queue.length > 0 || this.pendingBuffer.length > 0;
    }
  }

  // Global chunk queue for streaming TTS (Fast Mode)
  const chunkQueue = new ChunkQueue();

  // ============================================
  // Sentence Streaming for Fast Mode
  // ============================================

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

      // Split long sentences into chunks to avoid TTS limits
      if (trimmed.length > MAX_UTTERANCE_LENGTH) {
        const chunks = splitLongSentence(trimmed);
        result.push(...chunks);
      } else {
        result.push(trimmed);
      }
    }

    return result;
  }

  function splitLongSentence(sentence) {
    const chunks = [];
    const words = sentence.split(' ');
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 > MAX_UTTERANCE_LENGTH && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  function getSentenceHash(sentence) {
    return hashMessage(sentence.trim().toLowerCase());
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
          speed: settings.rate,
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
  // speakText - queue a single sentence for TTS
  // ============================================

  function speakText(sentence) {
    if (!settings.enabled || isMuted) return;
    if (!sentence || sentence.trim().length === 0) return;

    if (settings.fastMode) {
      // Fast Mode: feed into ChunkQueue for batched Edge TTS
      chunkQueue.addText(sentence, false);
    } else {
      // Server Mode: feed into parallel audio player
      audioPlayer.playText(sentence).catch(error => {
        console.error('[AgentVibes Voice] speakText server TTS error:', error);
      });
    }
  }

  // ============================================
  // Unified Play Function (Fast Mode or Server)
  // ============================================

  function playText(text, options = {}) {
    if (!settings.enabled) return;
    // Honour mute state for auto-speak; replays via speaker icon are always allowed
    if (isMuted && !options.isReplay) return;

    if (settings.fastMode) {
      // Fast Mode: Use ChunkQueue + Edge TTS with sentence batching
      const sentences = splitIntoSentences(text);
      if (sentences.length === 0) {
        chunkQueue.addText(expandContractions(text), true);
        return;
      }
      // Clear processed sentences for a fresh replay
      if (options.isReplay) {
        chunkQueue.clearProcessedSentences();
      }
      sentences.forEach(sentence => {
        chunkQueue.addText(sentence, false);
      });
      // Flush remaining buffer
      chunkQueue.flushBuffer();
    } else {
      // Server Mode: Use parallel audio player
      audioPlayer.playText(text).catch(error => {
        console.error('[AgentVibes Voice] Server TTS playback failed:', error);
      });
    }
  }

  function createMuteButton() {
    const btn = document.createElement('button');
    btn.id = 'agentvibes-mute-btn';
    btn.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:10000;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    btn.style.background = isMuted ? '#888' : '#7c3aed';
    btn.textContent = isMuted ? '🔇' : '🔊';
    btn.title = isMuted ? 'Unmute (M)' : 'Mute (M)';
    btn.addEventListener('click', toggleMute);
    document.body.appendChild(btn);
    return btn;
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
      window.speechSynthesis.cancel();
    }
    if (muteButton) {
      muteButton.style.background = isMuted ? '#888' : '#7c3aed';
      muteButton.textContent = isMuted ? '🔇' : '🔊';
      muteButton.title = isMuted ? 'Unmute (M)' : 'Mute (M)';
    }
  }

  function showMuteButton() {
    if (!muteButton) {
      muteButton = createMuteButton();
    }
    muteButton.style.display = 'flex';
  }

  function stopAllPlayback() {
    isMuted = true;
    if (muteButton) {
      muteButton.style.background = '#888';
      muteButton.textContent = '🔇';
      muteButton.title = 'Unmute (M)';
    }
    console.log('[AgentVibes Voice] Stopping all playback...');

    // Kill browser's native speech synthesis queue completely
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop all monitoring intervals
    for (const [messageId, state] of monitoredMessages) {
      if (state.checkInterval) {
        clearInterval(state.checkInterval);
      }
    }
    monitoredMessages.clear();

    // Clear sentence tracking
    spokenSentences.clear();
    sentenceArray = [];
    nextSpeakIndex = 0;
    currentMessageId = null;

    // Clear chunk queue
    chunkQueue.clear();

    // Stop server TTS (audio player)
    audioPlayer.stop();

    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    // Stop Edge TTS and reset state
    stopEdgeTTS();
    isSpeakingEdgeTTS = false;

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

  /**
   * Split text into sentences with better handling of edge cases
   * Protects decimals, abbreviations, and handles multiple punctuation
   */
  function splitIntoSentences(text) {
    if (!text || !text.trim()) return [];
    
    // Protect decimal numbers and common abbreviations
    let protectedText = text;
    
    // Protect decimal numbers (e.g., "3.14", "2.5%")
    protectedText = protectedText.replace(/\d+\.\d+/g, match => `{{DECIMAL_${match.replace('.', '_')}}}`);
    
    // Protect common abbreviations
    const abbreviations = [
      /Mr\./g, /Mrs\./g, /Ms\./g, /Dr\./g, /Prof\./g, /Sr\./g, /Jr\./g,
      /vs\./g, /etc\./g, /i\.e\./g, /e\.g\./g, /a\.m\./g, /p\.m\./g,
      /A\.M\./g, /P\.M\./g, /U\.S\./g, /U\.K\./g, /E\.U\./g
    ];
    
    abbreviations.forEach(abbrev => {
      protectedText = protectedText.replace(abbrev, match => `{{ABBREV_${match.replace(/\./g, '_DOT_')}}}`);
    });
    
    // Split into sentences
    const sentenceRegex = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;
    const matches = protectedText.match(sentenceRegex) || [];
    
    // Restore protected content
    const sentences = matches.map(sentence => {
      sentence = sentence.trim();
      
      // Restore decimals
      sentence = sentence.replace(/\{\{DECIMAL_(\d+)_(\d+)\}\}/g, (match, int, dec) => `${int}.${dec}`);
      
      // Restore abbreviations
      sentence = sentence.replace(/\{\{ABBREV_(.*?)\}\}/g, (match, abbrev) => {
        return abbrev.replace(/_DOT_/g, '.');
      });
      
      return sentence;
    }).filter(sentence => sentence.length > 0);
    
    return sentences;
  }

  /**
   * Get sentence hash for duplicate detection
   */
  function getSentenceHash(sentence) {
    return hashMessage(sentence.trim().toLowerCase());
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
      lastSpokenSentenceIndex: -1,
      lastProcessedLength: 0,
      sentences: splitIntoSentences(initialText),
      nextSpeakIndex: 0,
      messageId: messageId
    };

    monitoredMessages.set(messageId, monitorState);

    console.log('[AgentVibes Voice] Started monitoring message:', messageId, 'Initial length:', initialText.length);

    // Reset global sentence tracking for this new message
    currentMessageId = messageId;
    sentenceArray = splitIntoSentences(initialText);
    nextSpeakIndex = 0;
    
    // Clear spoken sentences for new message
    spokenSentences.clear();

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

  // Fast Mode: Speak sentences as they appear during streaming using sentence arrays
  function checkMessageStreamingForFastMode(messageId) {
    const state = monitoredMessages.get(messageId);
    if (!state) return;

    const { textElement, element, platform, lastText, lastChangeTime, isComplete, sentences, nextSpeakIndex } = state;

    if (isComplete) return;

    const currentText = extractCleanText(textElement, platform);
    const now = Date.now();

    // Update last change time if text changed
    if (currentText !== lastText) {
      state.lastText = currentText;
      state.lastChangeTime = now;
    }

    // Split current text into sentences
    const allSentences = splitIntoSentences(currentText);
    state.sentences = allSentences;
    
    // Find new sentences that haven't been spoken yet
    const newSentences = [];
    for (let i = state.nextSpeakIndex; i < allSentences.length; i++) {
      const sentence = allSentences[i];
      const sentenceHash = getSentenceHash(sentence);
      
      // Check if this sentence has already been spoken
      if (!spokenSentences.has(sentenceHash)) {
        newSentences.push({ sentence, index: i, hash: sentenceHash });
      }
    }

    // Speak new sentences immediately
    for (const { sentence, index, hash } of newSentences) {
      spokenSentences.add(hash);
      state.nextSpeakIndex = index + 1;
      
      console.log(`[AgentVibes Voice] Speaking sentence ${index + 1}/${allSentences.length}: "${sentence.substring(0, 50)}..."`);
      
      // Direct sentence streaming - speak immediately
      speakText(sentence);
    }

    // Check if streaming has stopped completely
    const isStreaming = isMessageStreaming(element, platform);
    const timeSinceChange = now - state.lastChangeTime;

    if (!isStreaming && timeSinceChange >= STREAMING_STABLE_THRESHOLD) {
      // Message is complete
      state.isComplete = true;
      clearInterval(state.checkInterval);

      // Speak any remaining incomplete final sentence
      if (allSentences.length > 0 && state.nextSpeakIndex < allSentences.length) {
        const lastSentence = allSentences[allSentences.length - 1];
        const lastSentenceHash = getSentenceHash(lastSentence);
        
        if (!spokenSentences.has(lastSentenceHash)) {
          console.log('[AgentVibes Voice] Speaking final incomplete sentence');
          spokenSentences.add(lastSentenceHash);
          speakText(lastSentence);
        }
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
      playText(currentText, { isReplay: true });

      icon.style.color = '#10b981';
      setTimeout(() => {
        icon.style.color = '#6366f1';
      }, 1000);
    });

    messageElement.appendChild(icon);
  }

  function hideMuteButton() {
    if (muteButton) {
      muteButton.style.display = 'none';
    }
  }

  // ============================================
  // Stop Button
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
    // Show mute button alongside stop button
    showMuteButton();
  }

  function hideStopButton() {
    if (stopButton) {
      stopButton.style.display = 'none';
    }
    // Keep mute button visible when muted (so user can unmute); hide when unmuted
    if (!isMuted) {
      hideMuteButton();
    }
  }

  // Keyboard shortcut: Escape stops audio; M toggles mute
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopAllPlayback();
    }
    // M key toggles mute (only when focus is not in a text input)
    if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement && document.activeElement.tagName;
      const isEditable = document.activeElement && document.activeElement.isContentEditable;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
        if (!muteButton) muteButton = createMuteButton();
        toggleMute();
      }
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
        if (!isSpeakingEdgeTTS && !audioPlayer.isActive() && !chunkQueue.isActive()) {
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
    console.log('[AgentVibes Voice] Mode:', settings.fastMode ? 'Fast (Edge TTS)' : 'Server (Parallel TTS)');

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
        'enabled', 'volume', 'rate', 'voice', 'autoSpeak', 'fastMode', 'spokenMessages', 'isMuted'
      ]);

      settings = {
        enabled: result.enabled !== false,
        volume: result.volume || 1.0,
        rate: result.rate || 1.0,
        voice: result.voice || 'en-US-AndrewNeural',  // Default Edge TTS voice
        autoSpeak: result.autoSpeak !== false,
        fastMode: result.fastMode !== false  // Default to Fast Mode
      };

      // Load and apply persisted mute state
      if (result.isMuted) {
        isMuted = true;
        // Update mute button appearance without triggering side effects
        if (!muteButton) muteButton = createMuteButton();
        muteButton.style.background = '#52525b';
        muteButton.style.boxShadow = '0 4px 15px rgba(82, 82, 91, 0.4)';
        muteButton.title = 'Unmute AgentVibes Voice';
        muteButton.innerHTML = `
          <svg id="agentvibes-mute-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        `;
        console.log('[AgentVibes Voice] Restored muted state from storage');
      }

      console.log('[AgentVibes Voice] Settings loaded - Fast Mode:', settings.fastMode, 'Voice:', settings.voice);

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
    if (request.type === 'GET_EDGE_VOICES') {
      // Return available Edge TTS voices
      console.log('[AgentVibes Voice] Returning', EDGE_TTS_VOICES.length, 'Edge TTS voices to popup');
      sendResponse({
        success: true,
        voices: EDGE_TTS_VOICES
      });
      return true;
    }
    if (request.type === 'TEST_EDGE_TTS') {
      // Handle test voice from popup using Edge TTS
      const { text, voice, volume, rate } = request;

      // Show UI notifications
      showSpeakingNotification();
      showStopButton();
      isSpeakingEdgeTTS = true;

      // Speak using Edge TTS
      speakWithEdgeTTS(text || 'Hello! This is a test of the AgentVibes Edge TTS voice.', voice, rate, volume)
        .then(() => {
          console.log('[AgentVibes Voice] Test TTS completed');
        })
        .catch((error) => {
          console.error('[AgentVibes Voice] Test TTS error:', error);
          isSpeakingEdgeTTS = false;
          hideSpeakingNotification();
          hideStopButton();
        });

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
    console.log('[AgentVibes Voice] Edge TTS Fast Mode available');

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
