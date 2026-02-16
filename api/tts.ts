/**
 * TTS Provider Wrapper
 * 
 * Wraps the existing AgentVibes bash scripts via child_process.exec()
 * Provides a TypeScript interface for voice synthesis
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

export interface TTSOptions {
  text: string;
  voice?: string;
  personality?: string;
  language?: string;
  sentiment?: string;
}

export interface TTSResult {
  audioPath: string;
  voice: string;
  success: boolean;
  error?: string;
}

export interface Voice {
  name: string;
  provider: string;
  description?: string;
}

export interface TTSStatus {
  activeProvider: string;
  currentVoice: string;
  currentPersonality?: string;
  currentSentiment?: string;
  currentLanguage?: string;
  piperInstalled: boolean;
  voicesAvailable: number;
}

export class TTSProvider {
  private hooksDir: string;
  private projectRoot: string;
  private audioDir: string;
  private currentVoice: string = 'en_US-lessac-medium';
  private currentPersonality: string | undefined;
  private currentLanguage: string = 'english';

  constructor() {
    // Determine project root - look for .claude directory
    this.projectRoot = this.findProjectRoot();
    this.hooksDir = path.join(this.projectRoot, '.claude', 'hooks');
    this.audioDir = path.join(this.projectRoot, '.claude', 'audio');
    
    // Ensure audio directory exists
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }

    // Load current settings
    this.loadSettings();
  }

  private findProjectRoot(): string {
    // Priority:
    // 1. AGENTVIBES_ROOT env var
    // 2. Current working directory (if has .claude)
    // 3. Look up from current file location
    // 4. Fallback to home directory ~/.agentvibes or ~/.claude

    if (process.env.AGENTVIBES_ROOT) {
      return process.env.AGENTVIBES_ROOT;
    }

    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.claude'))) {
      return cwd;
    }

    // Try to find from this file's location
    let currentDir = __dirname;
    while (currentDir !== '/') {
      if (fs.existsSync(path.join(currentDir, '.claude'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // Fallback to home
    const homeDir = os.homedir();
    const homeClaude = path.join(homeDir, '.claude');
    if (fs.existsSync(homeClaude)) {
      return homeDir;
    }

    // Create in home if nothing exists
    const agentVibesDir = path.join(homeDir, '.agentvibes');
    if (!fs.existsSync(agentVibesDir)) {
      fs.mkdirSync(agentVibesDir, { recursive: true });
      fs.mkdirSync(path.join(agentVibesDir, '.claude'), { recursive: true });
    }
    return agentVibesDir;
  }

  private loadSettings(): void {
    // Load current voice
    const voiceFile = path.join(this.projectRoot, '.claude', 'tts-voice.txt');
    if (fs.existsSync(voiceFile)) {
      this.currentVoice = fs.readFileSync(voiceFile, 'utf-8').trim();
    }

    // Load current personality
    const personalityFile = path.join(this.projectRoot, '.claude', 'tts-personality.txt');
    if (fs.existsSync(personalityFile)) {
      this.currentPersonality = fs.readFileSync(personalityFile, 'utf-8').trim();
    }

    // Load current language
    const languageFile = path.join(this.projectRoot, '.claude', 'tts-language.txt');
    if (fs.existsSync(languageFile)) {
      this.currentLanguage = fs.readFileSync(languageFile, 'utf-8').trim();
    }
  }

  private saveSettings(): void {
    // Save current voice
    const voiceFile = path.join(this.projectRoot, '.claude', 'tts-voice.txt');
    fs.writeFileSync(voiceFile, this.currentVoice, 'utf-8');

    // Save personality if set
    if (this.currentPersonality) {
      const personalityFile = path.join(this.projectRoot, '.claude', 'tts-personality.txt');
      fs.writeFileSync(personalityFile, this.currentPersonality, 'utf-8');
    }
  }

  /**
   * Synthesize text to speech
   * @param options TTS options including text, voice, personality
   * @returns Path to generated audio file
   */
  async speak(options: TTSOptions): Promise<TTSResult> {
    const { text, voice, personality, language, sentiment } = options;

    // Sanitize input
    const sanitizedText = this.sanitizeText(text);
    if (!sanitizedText) {
      return {
        audioPath: '',
        voice: voice || this.currentVoice,
        success: false,
        error: 'Empty text provided',
      };
    }

    // Update settings if provided
    const voiceToUse = voice || this.currentVoice;
    const personalityToUse = personality || this.currentPersonality;

    try {
      // Set environment variables for the script
      const env = {
        ...process.env,
        AGENTVIBES_NO_PLAYBACK: 'true', // Don't auto-play, just generate
        CLAUDE_PROJECT_DIR: this.projectRoot,
      };

      // Set personality if provided
      if (personalityToUse) {
        const personalityFile = path.join(this.projectRoot, '.claude', 'tts-personality.txt');
        fs.writeFileSync(personalityFile, personalityToUse, 'utf-8');
        this.currentPersonality = personalityToUse;
      }

      // Set sentiment if provided
      if (sentiment) {
        const sentimentFile = path.join(this.projectRoot, '.claude', 'tts-sentiment.txt');
        fs.writeFileSync(sentimentFile, sentiment, 'utf-8');
      }

      // Set language if provided
      if (language) {
        const languageFile = path.join(this.projectRoot, '.claude', 'tts-language.txt');
        fs.writeFileSync(languageFile, language, 'utf-8');
        this.currentLanguage = language;
      }

      // Build the command
      const playTTSScript = path.join(this.hooksDir, 'play-tts.sh');
      const command = `"${playTTSScript}" "${sanitizedText}" "${voiceToUse}"`;

      // Execute the script
      const { stdout, stderr } = await execAsync(command, { env, cwd: this.projectRoot });

      // Parse the output to find the audio file path
      const audioPath = this.parseAudioPath(stdout + stderr);

      if (!audioPath || !fs.existsSync(audioPath)) {
        return {
          audioPath: '',
          voice: voiceToUse,
          success: false,
          error: `Failed to generate audio. Output: ${stdout} ${stderr}`,
        };
      }

      return {
        audioPath,
        voice: voiceToUse,
        success: true,
      };
    } catch (error) {
      return {
        audioPath: '',
        voice: voiceToUse,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error',
      };
    }
  }

  /**
   * List available voices
   * @returns Array of available voices
   */
  async listVoices(): Promise<Voice[]> {
    try {
      const voiceManagerScript = path.join(this.hooksDir, 'voice-manager.sh');
      const command = `"${voiceManagerScript}" list-simple`;
      
      const { stdout } = await execAsync(command, { cwd: this.projectRoot });
      
      // Parse voice list
      const voices: Voice[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const voiceName = line.trim();
        if (voiceName && !voiceName.startsWith('(')) {
          voices.push({
            name: voiceName,
            provider: this.inferProvider(voiceName),
          });
        }
      }

      // If no voices found via script, try to get from voice directory
      if (voices.length === 0) {
        return this.listVoicesFromDirectory();
      }

      return voices;
    } catch (error) {
      // Fallback to directory listing
      return this.listVoicesFromDirectory();
    }
  }

  private listVoicesFromDirectory(): Voice[] {
    const voices: Voice[] = [];
    
    // Check Piper voices directory
    const piperVoicesDir = path.join(os.homedir(), '.local', 'share', 'piper', 'voices');
    const altPiperDir = path.join(os.homedir(), '.claude', 'piper-voices');
    
    const voiceDirs = [piperVoicesDir, altPiperDir];
    
    for (const dir of voiceDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.endsWith('.onnx')) {
              const voiceName = file.replace('.onnx', '');
              voices.push({
                name: voiceName,
                provider: 'piper',
              });
            }
          }
        } catch {
          // Ignore errors reading directory
        }
      }
    }

    return voices;
  }

  private inferProvider(voiceName: string): string {
    // Piper voices typically have pattern: en_US-lessac-medium
    if (voiceName.includes('_') && voiceName.includes('-')) {
      return 'piper';
    }
    // macOS voices are typically single words like "Samantha"
    if (/^[A-Z][a-z]+$/.test(voiceName)) {
      return 'macos';
    }
    return 'unknown';
  }

  /**
   * Set the active voice
   * @param voiceName Name of the voice to use
   * @returns Success status
   */
  async setVoice(voiceName: string): Promise<boolean> {
    try {
      const voiceManagerScript = path.join(this.hooksDir, 'voice-manager.sh');
      const command = `"${voiceManagerScript}" switch --silent "${voiceName}"`;
      
      await execAsync(command, { cwd: this.projectRoot });
      
      this.currentVoice = voiceName;
      this.saveSettings();
      
      return true;
    } catch (error) {
      console.error('Failed to set voice:', error);
      return false;
    }
  }

  /**
   * Get current TTS status
   * @returns Status object with provider info
   */
  async getStatus(): Promise<TTSStatus> {
    let activeProvider = 'piper';
    let currentVoice = this.currentVoice;
    let piperInstalled = false;

    // Check provider
    const providerFile = path.join(this.projectRoot, '.claude', 'tts-provider.txt');
    if (fs.existsSync(providerFile)) {
      activeProvider = fs.readFileSync(providerFile, 'utf-8').trim();
    }

    // Check current voice from file
    const voiceFile = path.join(this.projectRoot, '.claude', 'tts-voice.txt');
    if (fs.existsSync(voiceFile)) {
      currentVoice = fs.readFileSync(voiceFile, 'utf-8').trim();
    }

    // Check if piper is installed
    try {
      execSync('which piper', { stdio: 'pipe' });
      piperInstalled = true;
    } catch {
      piperInstalled = false;
    }

    // Count available voices
    const voices = await this.listVoices();

    // Get personality
    let personality: string | undefined;
    const personalityFile = path.join(this.projectRoot, '.claude', 'tts-personality.txt');
    if (fs.existsSync(personalityFile)) {
      personality = fs.readFileSync(personalityFile, 'utf-8').trim();
    }

    // Get sentiment
    let sentiment: string | undefined;
    const sentimentFile = path.join(this.projectRoot, '.claude', 'tts-sentiment.txt');
    if (fs.existsSync(sentimentFile)) {
      sentiment = fs.readFileSync(sentimentFile, 'utf-8').trim();
    }

    return {
      activeProvider,
      currentVoice,
      currentPersonality: personality,
      currentSentiment: sentiment,
      currentLanguage: this.currentLanguage,
      piperInstalled,
      voicesAvailable: voices.length,
    };
  }

  /**
   * Sanitize text for shell execution
   */
  private sanitizeText(text: string): string {
    // Remove dangerous characters
    return text
      .replace(/[;|&$`<>(){}]/g, '')
      .replace(/\\!/g, '!')
      .replace(/\\\$/g, '$')
      .replace(/\\\?/g, '?')
      .replace(/\\,/g, ',')
      .replace(/\\\./g, '.')
      .trim();
  }

  /**
   * Parse audio file path from script output
   */
  private parseAudioPath(output: string): string | null {
    // Look for patterns like:
    // "💾 Saved to: /path/to/audio.wav"
    // Or just any .wav path in the output
    
    const savedMatch = output.match(/Saved to:\s*(\S+)/i);
    if (savedMatch) {
      return savedMatch[1];
    }

    // Look for any .wav file path
    const wavMatch = output.match(/(\S+\.wav)/i);
    if (wavMatch) {
      return wavMatch[1];
    }

    // Look in the audio directory for the most recent file
    if (fs.existsSync(this.audioDir)) {
      const files = fs.readdirSync(this.audioDir)
        .filter(f => f.endsWith('.wav'))
        .map(f => ({
          name: f,
          path: path.join(this.audioDir, f),
          time: fs.statSync(path.join(this.audioDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length > 0) {
        return files[0].path;
      }
    }

    return null;
  }

  /**
   * Get the audio directory path
   */
  getAudioDir(): string {
    return this.audioDir;
  }

  /**
   * Clean up old audio files
   * @param maxAgeMinutes Files older than this will be deleted
   */
  async cleanup(maxAgeMinutes: number = 60): Promise<number> {
    if (!fs.existsSync(this.audioDir)) {
      return 0;
    }

    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    let deletedCount = 0;

    const files = fs.readdirSync(this.audioDir);
    for (const file of files) {
      const filePath = path.join(this.audioDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// Singleton instance
let defaultProvider: TTSProvider | null = null;

export function getTTSProvider(): TTSProvider {
  if (!defaultProvider) {
    defaultProvider = new TTSProvider();
  }
  return defaultProvider;
}

export function resetTTSProvider(): void {
  defaultProvider = null;
}
