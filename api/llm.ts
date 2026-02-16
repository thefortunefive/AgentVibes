/**
 * LLM Provider Abstraction
 * 
 * Supports 3 providers via environment variables:
 * - OpenAI (GPT-4o) - LLM_PROVIDER=openai, OPENAI_API_KEY
 * - Anthropic (Claude) - LLM_PROVIDER=anthropic, ANTHROPIC_API_KEY
 * - Generic OpenAI-compatible (Kimi, GLM-5, Groq) - LLM_PROVIDER=generic, GENERIC_LLM_API_KEY, GENERIC_LLM_BASE_URL
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'generic';
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class LLMProvider {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    const provider = (process.env.LLM_PROVIDER || 'openai') as LLMConfig['provider'];
    
    this.config = {
      provider,
      apiKey: this.getApiKey(provider),
      baseUrl: this.getBaseUrl(provider),
      model: this.getDefaultModel(provider),
      maxTokens: config?.maxTokens || 2048,
      temperature: config?.temperature || 0.7,
      ...config,
    };

    if (!this.config.apiKey) {
      console.warn(`⚠️  API key not found for provider: ${provider}. Set the appropriate env var in .env file.`);
    }
  }

  private getApiKey(provider: string): string {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'generic':
        return process.env.GENERIC_LLM_API_KEY || process.env.OPENAI_API_KEY || '';
      default:
        return '';
    }
  }

  private getBaseUrl(provider: string): string | undefined {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'generic':
        return process.env.GENERIC_LLM_BASE_URL || 'https://api.openai.com/v1';
      default:
        return undefined;
    }
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      case 'generic':
        return process.env.GENERIC_LLM_MODEL || 'gpt-4o';
      default:
        return 'gpt-4o';
    }
  }

  /**
   * Send a message to the LLM and return the response
   * @param prompt - The user's message
   * @param history - Previous chat messages (optional)
   * @returns The LLM's response string
   */
  async sendMessage(prompt: string, history: ChatMessage[] = []): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error(`API key not configured for provider: ${this.config.provider}. Check your .env file.`);
    }

    try {
      switch (this.config.provider) {
        case 'openai':
        case 'generic':
          return await this.callOpenAICompatible(prompt, history);
        case 'anthropic':
          return await this.callAnthropic(prompt, history);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error(`Failed to get response from ${this.config.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callOpenAICompatible(prompt: string, history: ChatMessage[]): Promise<string> {
    const messages: ChatMessage[] = [
      ...history,
      { role: 'user', content: prompt }
    ];

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI-compatible API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    return data.choices[0]?.message?.content || '';
  }

  private async callAnthropic(prompt: string, history: ChatMessage[]): Promise<string> {
    // Convert history to Anthropic format
    const messages = history.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      content: Array<{
        type: string;
        text: string;
      }>;
    };

    return data.content[0]?.text || '';
  }

  /**
   * Get current configuration (sanitized - no API keys)
   */
  getConfig(): Omit<LLMConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance for server use
let defaultProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!defaultProvider) {
    defaultProvider = new LLMProvider();
  }
  return defaultProvider;
}

export function resetLLMProvider(): void {
  defaultProvider = null;
}
