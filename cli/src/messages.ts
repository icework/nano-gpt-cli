import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import type { ChatMessage, MessageContent, MessageContentPart } from "./types.js";

export async function buildUserMessage(
  prompt: string,
  imageInputs: string[],
): Promise<ChatMessage> {
  return {
    role: "user",
    content: await buildMessageContent(prompt, imageInputs),
  };
}

export async function buildMessageContent(
  prompt: string,
  imageInputs: string[],
): Promise<MessageContent> {
  if (imageInputs.length === 0) {
    return prompt;
  }

  const parts: MessageContentPart[] = [];
  if (prompt.trim()) {
    parts.push({
      type: "text",
      text: prompt,
    });
  }

  for (const input of imageInputs) {
    parts.push({
      type: "image_url",
      image_url: {
        url: await normalizeImageInput(input),
      },
    });
  }

  return parts;
}

export function extractTextContent(content?: MessageContent): string {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

async function normalizeImageInput(input: string): Promise<string> {
  if (/^https?:\/\//i.test(input) || input.startsWith("data:")) {
    return input;
  }

  const absolutePath = resolve(input);
  await access(absolutePath);
  const bytes = await readFile(absolutePath);
  const mimeType = detectMimeType(absolutePath, bytes);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function detectMimeType(path: string, bytes: Buffer): string {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 6) {
    const header = bytes.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 2 && bytes.subarray(0, 2).toString("ascii") === "BM") {
    return "image/bmp";
  }

  const textPrefix = bytes.subarray(0, 512).toString("utf8").trimStart();
  if (textPrefix.startsWith("<svg") || textPrefix.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  switch (extname(path).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    case ".svg":
      return "image/svg+xml";
    default:
      throw new Error(
        `Unsupported local image file: ${path}. Use png, jpg, webp, gif, bmp, svg, or pass a remote URL/data URL.`,
      );
  }
}
