/**
 * TTS Provider Wrapper
 * 
 * Uses Windows SAPI (System.Speech.Synthesis) via PowerShell
 * Generates audio files without local playback for browser-based playback
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
  private currentVoice: string = 'Microsoft David Desktop';
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
   * Synthesize text to speech using Windows SAPI via PowerShell
   * @param options TTS options including text, voice, personality
   * @returns Path to generated audio file
   */
  async speak(options: TTSOptions): Promise<TTSResult> {
    const { text, voice, personality, language, sentiment } = options;

    // Sanitize input for PowerShell
    const sanitizedText = this.sanitizeTextForPowerShell(text);
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
      // Save personality if provided
      if (personalityToUse) {
        this.currentPersonality = personalityToUse;
        this.saveSettings();
      }

      // Save sentiment if provided
      if (sentiment) {
        const sentimentFile = path.join(this.projectRoot, '.claude', 'tts-sentiment.txt');
        fs.writeFileSync(sentimentFile, sentiment, 'utf-8');
      }

      // Save language if provided
      if (language) {
        this.currentLanguage = language;
        const languageFile = path.join(this.projectRoot, '.claude', 'tts-language.txt');
        fs.writeFileSync(languageFile, language, 'utf-8');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const audioFileName = `tts_${timestamp}.wav`;
      const audioPath = path.join(this.audioDir, audioFileName);

      // Build PowerShell command using Windows SAPI
      // Uses System.Speech.Synthesis.SpeechSynthesizer to generate .wav file silently
      const psCommand = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SelectVoice('${voiceToUse}'); $synth.SetOutputToWaveFile('${audioPath.replace(/'/g, "''")}'); $synth.Speak('${sanitizedText.replace(/'/g, "''")}'); $synth.Dispose()`;

      // Execute PowerShell command
      const command = `powershell.exe -NoProfile -NonInteractive -Command "${psCommand}"`;

      if (process.env.NODE_ENV === 'development') {
        console.log('TTS PowerShell command:', command);
      }

      await execAsync(command, {
        cwd: this.projectRoot,
        timeout: 60000, // 60 second timeout for TTS generation
        windowsHide: true, // Hide PowerShell window on Windows
      });

      // Verify the audio file was created
      if (!fs.existsSync(audioPath)) {
        return {
          audioPath: '',
          voice: voiceToUse,
          success: false,
          error: 'Failed to generate audio file',
        };
      }

      return {
        audioPath,
        voice: voiceToUse,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      if (process.env.NODE_ENV === 'development') {
        console.error('TTS Error:', errorMessage);
      }
      return {
        audioPath: '',
        voice: voiceToUse,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * List available voices using Windows SAPI via PowerShell
   * @returns Array of available voices
   */
  async listVoices(): Promise<Voice[]> {
    try {
      // PowerShell command to get installed SAPI voices
      const psCommand = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }`;
      const command = `powershell.exe -NoProfile -NonInteractive -Command "${psCommand}"`;
      
      const { stdout } = await execAsync(command, { 
        cwd: this.projectRoot,
        windowsHide: true,
      });
      
      // Parse voice list
      const voices: Voice[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const voiceName = line.trim();
        if (voiceName && voiceName.length > 0) {
          voices.push({
            name: voiceName,
            provider: 'windows-sapi',
            description: 'Windows SAPI voice',
          });
        }
      }

      return voices;
    } catch (error) {
      // Return default Windows voices if PowerShell query fails
      return [
        { name: 'Microsoft David Desktop', provider: 'windows-sapi', description: 'Male English (US)' },
        { name: 'Microsoft Zira Desktop', provider: 'windows-sapi', description: 'Female English (US)' },
        { name: 'Microsoft Mark Desktop', provider: 'windows-sapi', description: 'Male English (US)' },
      ];
    }
  }

  /**
   * Set the active voice
   * @param voiceName Name of the voice to use
   * @returns Success status
   */
  async setVoice(voiceName: string): Promise<boolean> {
    try {
      // Validate that the voice exists by trying to list voices
      const availableVoices = await this.listVoices();
      const voiceExists = availableVoices.some(v => v.name.toLowerCase() === voiceName.toLowerCase());
      
      // If exact match not found, try case-insensitive partial match
      if (!voiceExists) {
        const partialMatch = availableVoices.find(v => 
          v.name.toLowerCase().includes(voiceName.toLowerCase())
        );
        if (partialMatch) {
          voiceName = partialMatch.name;
        }
      }
      
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
    let activeProvider = 'windows-sapi';
    let currentVoice = this.currentVoice;
    let sapiAvailable = false;

    // Check current voice from file
    const voiceFile = path.join(this.projectRoot, '.claude', 'tts-voice.txt');
    if (fs.existsSync(voiceFile)) {
      currentVoice = fs.readFileSync(voiceFile, 'utf-8').trim();
    }

    // Check if Windows SAPI is available
    try {
      const psCommand = `Add-Type -AssemblyName System.Speech; Write-Output 'SAPI_AVAILABLE'`;
      const command = `powershell.exe -NoProfile -Command "${psCommand}"`;
      execSync(command, { stdio: 'pipe', windowsHide: true });
      sapiAvailable = true;
    } catch {
      sapiAvailable = false;
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
      piperInstalled: sapiAvailable, // Reusing field for backward compatibility
      voicesAvailable: voices.length,
    };
  }

  /**
   * Sanitize text for shell execution (legacy, kept for compatibility)
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
   * Sanitize text for PowerShell execution
   * Escapes single quotes by doubling them
   */
  private sanitizeTextForPowerShell(text: string): string {
    return text
      .replace(/'/g, "''")  // Escape single quotes for PowerShell
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // Remove control characters
      .trim();
  }

  /**
   * Parse audio file path from script output (legacy, kept for compatibility)
   * Handles ANSI color codes and various output formats
   */
  private parseAudioPath(output: string): string | null {
    // Strip ANSI color codes (format: \x1b[...m)
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

    // Look for patterns like:
    // "💾 Saved to: /path/to/audio.wav"
    // The path may contain spaces, so capture everything after "Saved to:" until emoji or end of line
    const savedMatch = cleanOutput.match(/Saved to:\s*([^\n💾]+\.wav)/i);
    if (savedMatch) {
      const potentialPath = savedMatch[1].trim();
      // Verify this is a valid-looking path (starts with / or ~)
      if (potentialPath.startsWith('/') || potentialPath.startsWith('~')) {
        return potentialPath;
      }
    }

    // Look for any .wav file path (absolute paths only)
    const wavMatch = cleanOutput.match(/(\/[^\s]+\.wav)/i);
    if (wavMatch) {
      return wavMatch[1];
    }

    // Look in the audio directory for the most recent file (fallback)
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
        // Return the most recent file
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
