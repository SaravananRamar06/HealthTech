import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const AI_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Returns true if the Gemini API key is configured on the server.
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Creates a server-side GoogleGenAI client using the server-only GEMINI_API_KEY.
 * Throws if the API key is not configured.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on server');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Safely executes a Gemini generation call with strict timeout and sanitized logging.
 * Returns null if the call fails or times out, allowing immediate graceful fallback.
 */
export async function generateGeminiContentSafe(
  contents: string | Array<Record<string, unknown> | string>,
  options?: {
    systemInstruction?: string;
    responseMimeType?: string;
    model?: string;
    timeoutMs?: number;
  }
): Promise<string | null> {
  if (!isGeminiConfigured()) {
    return null;
  }

  const timeoutMs = options?.timeoutMs || AI_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const client = getGeminiClient();
    const model = options?.model || DEFAULT_GEMINI_MODEL;

    const response = await client.models.generateContent({
      model,
      contents: Array.isArray(contents) ? contents : [contents],
      config: {
        systemInstruction: options?.systemInstruction,
        responseMimeType: options?.responseMimeType || 'application/json',
        abortSignal: controller.signal,
      },
    });

    return response.text || null;
  } catch (err) {
    // Audit rule: Never log sensitive prompts or health payloads in logs.
    const errName = err instanceof Error ? err.name : 'UnknownAIError';
    console.warn(`[CareBridge AI] Gemini call non-fatal fallback (${errName})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
