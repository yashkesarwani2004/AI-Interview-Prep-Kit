import { GoogleGenerativeAI } from '@google/generative-ai';

export interface LLMProviderOptions {
  provider?: string;
  model?: string;
}

export class LLMProviderService {
  private genAI: GoogleGenerativeAI | null = null;
  private providerName: string;
  private modelName: string;

  constructor(options?: LLMProviderOptions) {
    this.providerName = options?.provider || process.env.LLM_PROVIDER || 'gemini';
    this.modelName = options?.model || process.env.LLM_MODEL || 'gemini-1.5-flash';

    const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    if (apiKey && apiKey !== 'mock_key_for_testing') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  public getProviderInfo(): { provider: string; model: string; hasKey: boolean } {
    return {
      provider: this.providerName,
      model: this.modelName,
      hasKey: !!this.genAI,
    };
  }

  /**
   * Safely prompts LLM with retries, exponential backoff, JSON repair, and deterministic fallback.
   */
  public async generateJson<T>(
    prompt: string,
    validator: (parsed: any) => parsed is T,
    fallbackFn: () => T
  ): Promise<T> {
    if (!this.genAI) {
      return fallbackFn();
    }

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (validator(parsed)) {
          return parsed;
        } else {
          console.warn(`LLM response validation failed on attempt ${attempt}`);
        }
      } catch (err: any) {
        if (attempt === maxRetries) {
          console.warn(`LLM provider call failed after ${maxRetries} attempts: ${err.message}. Using fallback.`);
          return fallbackFn();
        }
        // Exponential backoff
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }

    return fallbackFn();
  }
}

export const llmProviderService = new LLMProviderService();
