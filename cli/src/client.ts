import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { extractTextContent } from "./messages.js";
import { parseChatCompletionStream } from "./stream.js";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModelsResponse,
  ResolvedSettings,
} from "./types.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NanoGptClient {
  constructor(
    private readonly settings: Pick<ResolvedSettings, "apiKey" | "baseUrl">,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async listModels(): Promise<ModelsResponse> {
    const response = await this.fetchJson<ModelsResponse>("/api/v1/models", {
      method: "GET",
    });
    return response;
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    return this.fetchJson<ChatCompletionResponse>("/api/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });
  }

  async *streamChatCompletion(
    request: ChatCompletionRequest,
  ): AsyncGenerator<string> {
    const response = await this.fetchImpl(this.makeUrl("/api/v1/chat/completions"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw await toApiError(response);
    }

    if (!response.body) {
      throw new Error("NanoGPT returned an empty stream response.");
    }

    yield* parseChatCompletionStream(response.body);
  }

  async generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    return this.fetchJson<ImageGenerationResponse>("/v1/images/generations", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async downloadToFile(url: string, outputPath: string): Promise<void> {
    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw await toApiError(response);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes);
  }

  static extractResponseText(response: ChatCompletionResponse): string {
    return extractTextContent(response.choices?.[0]?.message?.content);
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(this.makeUrl(path), {
      ...init,
      headers: this.headers(),
    });

    if (!response.ok) {
      throw await toApiError(response);
    }

    return (await response.json()) as T;
  }

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.settings.apiKey ?? ""}`,
    };
  }

  private makeUrl(path: string): string {
    return new URL(path, `${this.settings.baseUrl}/`).toString();
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const raw = await response.text();
  const details = parseJson(raw);
  const message =
    pickErrorMessage(details) ??
    (raw.trim() || `NanoGPT request failed with status ${response.status}.`);

  return new ApiError(response.status, message, details);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function pickErrorMessage(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  if ("error" in details && typeof details.error === "object" && details.error) {
    const nested = details.error as { message?: unknown };
    if (typeof nested.message === "string") {
      return nested.message;
    }
  }

  if ("message" in details && typeof details.message === "string") {
    return details.message;
  }

  return undefined;
}

