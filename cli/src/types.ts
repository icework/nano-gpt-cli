export type OutputFormat = "text" | "json";

export interface AppConfig {
  apiKey?: string;
  defaultModel?: string;
  defaultImageModel?: string;
  outputFormat?: OutputFormat;
  baseUrl?: string;
}

export interface ResolvedSettings {
  apiKey?: string;
  defaultModel: string;
  defaultImageModel: string;
  outputFormat: OutputFormat;
  baseUrl: string;
}

export type MessageRole = "system" | "user" | "assistant";

export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageContentPart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type MessageContentPart = TextContentPart | ImageContentPart;
export type MessageContent = string | MessageContentPart[];

export interface ChatMessage {
  role: MessageRole;
  content: MessageContent;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: MessageRole;
      content?: MessageContent;
    };
    delta?: {
      role?: MessageRole;
      content?: MessageContent;
    };
    finish_reason?: string | null;
  }>;
  usage?: Record<string, number>;
}

export interface ModelsResponse {
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
  }>;
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
  imageDataUrl?: string;
  imageDataUrls?: string[];
}

export interface ImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}
