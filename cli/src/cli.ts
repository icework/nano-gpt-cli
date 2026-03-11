import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Command } from "commander";

import { NanoGptClient } from "./client.js";
import { readConfig, redactConfig, resolveSettings, setConfigValue, type ConfigKey } from "./config.js";
import { normalizeImageGenerationInputs } from "./image-input.js";
import { buildUserMessage } from "./messages.js";
import type { AppConfig, ChatMessage, ImageGenerationResponse } from "./types.js";

type PromptOptions = {
  model?: string;
  system?: string;
  json?: boolean;
  stream?: boolean;
  image: string[];
};

type ChatOptions = {
  model?: string;
  system?: string;
  json?: boolean;
};

type ModelsOptions = {
  json?: boolean;
};

type ImageOptions = {
  model?: string;
  size?: string;
  quality?: string;
  output?: string;
  json?: boolean;
  image: string[];
};

type ConfigListOptions = {
  json?: boolean;
};

const CONFIG_KEYS: ConfigKey[] = [
  "api-key",
  "default-model",
  "default-image-model",
  "output-format",
  "base-url",
];

export function createProgram(): Command {
  const program = new Command();

  program
    .name("nano-gpt")
    .description("CLI for NanoGPT text and image APIs")
    .showHelpAfterError();

  program
    .command("prompt")
    .description("Send a one-shot prompt to NanoGPT")
    .argument("[text...]", "Prompt text. Reads stdin when omitted.")
    .option("-m, --model <model>", "Model override")
    .option("-s, --system <prompt>", "System prompt")
    .option("--json", "Print the raw JSON response")
    .option("--no-stream", "Disable streaming text output")
    .option("--image <pathOrUrl>", "Attach an image path or URL", collectValues, [])
    .action(async (textParts: string[], options: PromptOptions) => {
      const prompt = await resolvePromptText(textParts);
      const settings = await resolveSettings({
        defaultModel: options.model,
        outputFormat: options.json ? "json" : undefined,
      });
      ensureApiKey(settings.apiKey);
      const jsonOutput = shouldUseJsonOutput(settings.outputFormat);

      const model = options.model ?? settings.defaultModel;
      const messages = await buildConversation(options.system, prompt, options.image);
      const client = new NanoGptClient(settings);

      if (jsonOutput) {
        const response = await client.createChatCompletion({ model, messages });
        writeJson(response);
        return;
      }

      if (options.stream !== false) {
        let sawOutput = false;
        for await (const chunk of client.streamChatCompletion({ model, messages })) {
          sawOutput = true;
          output.write(chunk);
        }

        if (sawOutput) {
          output.write("\n");
        }
        return;
      }

      const response = await client.createChatCompletion({ model, messages });
      const text = NanoGptClient.extractResponseText(response);
      output.write(`${text}\n`);
    });

  program
    .command("chat")
    .description("Start an interactive NanoGPT session")
    .argument("[text...]", "Optional initial user prompt")
    .option("-m, --model <model>", "Model override")
    .option("-s, --system <prompt>", "System prompt")
    .option("--json", "Print each turn as JSON instead of plain text")
    .action(async (textParts: string[], options: ChatOptions) => {
      const settings = await resolveSettings({
        defaultModel: options.model,
        outputFormat: options.json ? "json" : undefined,
      });
      ensureApiKey(settings.apiKey);
      const jsonOutput = shouldUseJsonOutput(settings.outputFormat);

      const client = new NanoGptClient(settings);
      const history: ChatMessage[] = [];
      if (options.system) {
        history.push({
          role: "system",
          content: options.system,
        });
      }

      let currentModel = options.model ?? settings.defaultModel;
      const initialPrompt = textParts.join(" ").trim();
      if (initialPrompt) {
        await runChatTurn(client, history, currentModel, initialPrompt, jsonOutput);
      }

      const rl = createInterface({ input, output });
      try {
        while (true) {
          const line = (await rl.question("> ")).trim();
          if (!line) {
            continue;
          }

          if (line === "/exit") {
            break;
          }

          if (line === "/clear") {
            history.splice(options.system ? 1 : 0);
            output.write("Conversation cleared.\n");
            continue;
          }

          if (line.startsWith("/model ")) {
            currentModel = line.slice(7).trim();
            output.write(`Model set to ${currentModel}\n`);
            continue;
          }

          await runChatTurn(client, history, currentModel, line, jsonOutput);
        }
      } finally {
        rl.close();
      }
    });

  program
    .command("models")
    .description("List available NanoGPT models")
    .option("--json", "Print the raw JSON response")
    .action(async (options: ModelsOptions) => {
      const settings = await resolveSettings({
        outputFormat: options.json ? "json" : undefined,
      });
      ensureApiKey(settings.apiKey);
      const jsonOutput = shouldUseJsonOutput(settings.outputFormat);

      const client = new NanoGptClient(settings);
      const response = await client.listModels();
      if (jsonOutput) {
        writeJson(response);
        return;
      }

      for (const model of response.data ?? []) {
        output.write(`${model.id ?? "<unknown>"}\n`);
      }
    });

  program
    .command("image")
    .description("Generate or transform an image with NanoGPT")
    .argument("[prompt...]", "Image prompt. Reads stdin when omitted.")
    .option("-m, --model <model>", "Model override")
    .option("--size <size>", "Image size override")
    .option("--quality <quality>", "Image quality override")
    .option("--image <pathOrUrl>", "Source image path, URL, or data URL", collectValues, [])
    .option("-o, --output <path>", "Write the image artifact to a file")
    .option("--json", "Print the raw JSON response")
    .action(async (promptParts: string[], options: ImageOptions) => {
      const prompt = await resolvePromptText(promptParts);
      const settings = await resolveSettings({
        defaultImageModel: options.model,
        outputFormat: options.json ? "json" : undefined,
      });
      ensureApiKey(settings.apiKey);
      const jsonOutput = shouldUseJsonOutput(settings.outputFormat);

      const client = new NanoGptClient(settings);
      const imageInputs = await normalizeImageGenerationInputs(options.image);
      const response = await client.generateImage({
        model: options.model ?? settings.defaultImageModel,
        prompt,
        size: options.size,
        quality: options.quality,
        ...imageInputs,
      });

      const savedPath = options.output
        ? await persistImageOutput(client, response, options.output)
        : undefined;

      if (jsonOutput) {
        writeJson({
          ...response,
          outputPath: savedPath,
        });
        return;
      }

      const first = response.data?.[0];
      if (savedPath) {
        output.write(`${savedPath}\n`);
        return;
      }

      if (first?.url) {
        output.write(`${first.url}\n`);
        return;
      }

      if (first?.b64_json) {
        output.write(`${first.b64_json}\n`);
        return;
      }

      output.write("NanoGPT did not return image data.\n");
    });

  const configCommand = program
    .command("config")
    .description("Manage user configuration");

  configCommand
    .command("set")
    .argument("<key>", `One of: ${CONFIG_KEYS.join(", ")}`)
    .argument("<value>", "Value to store")
    .action(async (key: string, value: string) => {
      assertConfigKey(key);
      await setConfigValue(key, value);
      output.write(`Saved ${key}\n`);
    });

  configCommand
    .command("get")
    .argument("<key>", `One of: ${CONFIG_KEYS.join(", ")}`)
    .action(async (key: string) => {
      assertConfigKey(key);
      const config = await readConfig();
      const mapped = getConfigValue(config, key);
      if (mapped) {
        output.write(`${mapped}\n`);
      }
    });

  configCommand
    .command("list")
    .option("--json", "Print config as JSON")
    .action(async (options: ConfigListOptions) => {
      const config = await readConfig();
      if (options.json) {
        writeJson(redactConfig(config));
        return;
      }

      for (const key of CONFIG_KEYS) {
        const value = getConfigValue(redactConfig(config), key);
        if (value) {
          output.write(`${key}=${value}\n`);
        }
      }
    });

  return program;
}

function collectValues(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

async function resolvePromptText(textParts: string[]): Promise<string> {
  const inline = textParts.join(" ").trim();
  if (inline) {
    return inline;
  }

  if (!input.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of input) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const stdinText = Buffer.concat(chunks).toString("utf8").trim();
    if (stdinText) {
      return stdinText;
    }
  }

  throw new Error("Prompt text is required. Pass text as an argument or pipe stdin.");
}

async function buildConversation(
  systemPrompt: string | undefined,
  prompt: string,
  imageInputs: string[],
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }
  messages.push(await buildUserMessage(prompt, imageInputs));
  return messages;
}

async function runChatTurn(
  client: NanoGptClient,
  history: ChatMessage[],
  model: string,
  prompt: string,
  json: boolean,
): Promise<void> {
  history.push({
    role: "user",
    content: prompt,
  });

  if (json) {
    const response = await client.createChatCompletion({ model, messages: history });
    writeJson(response);
    history.push({
      role: "assistant",
      content: NanoGptClient.extractResponseText(response),
    });
    return;
  }

  let assistantText = "";
  for await (const chunk of client.streamChatCompletion({ model, messages: history })) {
    assistantText += chunk;
    output.write(chunk);
  }
  output.write("\n");

  history.push({
    role: "assistant",
    content: assistantText,
  });
}

async function persistImageOutput(
  client: NanoGptClient,
  response: ImageGenerationResponse,
  outputPath: string,
): Promise<string> {
  const absolutePath = resolve(outputPath);
  const image = response.data?.[0];
  if (!image) {
    throw new Error("NanoGPT did not return an image.");
  }

  if (image.b64_json) {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(image.b64_json, "base64"));
    return absolutePath;
  }

  if (image.url) {
    await client.downloadToFile(image.url, absolutePath);
    return absolutePath;
  }

  throw new Error("NanoGPT returned an image response without data.");
}

function ensureApiKey(apiKey?: string): asserts apiKey is string {
  if (!apiKey) {
    throw new Error(
      "Missing NanoGPT API key. Set NANO_GPT_API_KEY or run `nano-gpt config set api-key ...`.",
    );
  }
}

function assertConfigKey(key: string): asserts key is ConfigKey {
  if (!CONFIG_KEYS.includes(key as ConfigKey)) {
    throw new Error(`Invalid config key: ${key}`);
  }
}

function getConfigValue(config: AppConfig, key: ConfigKey): string | undefined {
  switch (key) {
    case "api-key":
      return config.apiKey;
    case "default-model":
      return config.defaultModel;
    case "default-image-model":
      return config.defaultImageModel;
    case "output-format":
      return config.outputFormat;
    case "base-url":
      return config.baseUrl;
  }
}

function writeJson(value: unknown): void {
  output.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function shouldUseJsonOutput(outputFormat: AppConfig["outputFormat"]): boolean {
  return outputFormat === "json";
}
