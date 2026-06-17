/** Provider-agnostic AI interfaces. The orchestrator (ai/index.ts) composes a
 * primary (Gemini) and a secondary (NVIDIA NIM) implementation with fallback. */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  /** Logical operation name for metrics/logs, e.g. "summarize.email". */
  operation: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask the provider to return strict JSON (used for classification). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  provider: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface ChatProvider {
  readonly name: string;
  generate(messages: ChatTurn[], opts: GenerateOptions): Promise<GenerateResult>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  /** `taskType` lets some models optimise query vs document embeddings. */
  embed(texts: string[], taskType?: 'query' | 'document'): Promise<number[][]>;
}
