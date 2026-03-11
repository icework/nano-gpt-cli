---
name: nano-gpt
description: Use when tasks need NanoGPT text or image generation through the local `nano-gpt` CLI and bundled wrapper scripts for OpenClaw or ClawHub workflows.
---

# NanoGPT Skill

Use this skill when the task should run through NanoGPT from a local terminal environment. Prefer the bundled wrapper scripts in `scripts/` so OpenClaw and direct CLI usage share the same behavior.

## Prerequisite check

Before invoking the skill, ensure the CLI is available:

```bash
./scripts/models.sh --json
```

If that fails because the local CLI is not built yet:

```bash
npm install
npm run build
```

If the repo is not present locally, install the published CLI instead:

```bash
npm install -g nano-gpt-cli
```

Authentication is API-key based. Set `NANO_GPT_API_KEY` or configure it once:

```bash
nano-gpt config set api-key YOUR_API_KEY
```

## Quick start

Text prompt:

```bash
./scripts/prompt.sh "Summarize the latest build logs."
```

Streaming multimodal prompt:

```bash
./scripts/prompt.sh "Describe this image." --image ./assets/example.png
```

Interactive chat:

```bash
./scripts/chat.sh
```

Image generation:

```bash
./scripts/image.sh "A cinematic product shot of a silver mechanical keyboard" --output output/keyboard.png
```

## Workflow

1. Use `scripts/prompt.sh` for one-shot text or vision prompts.
2. Use `scripts/chat.sh` for iterative back-and-forth.
3. Use `scripts/image.sh` when the task needs image generation.
4. Use `scripts/models.sh --json` when model discovery matters.
5. Prefer flags over editing scripts. The wrappers should stay thin.

## References

Open only what you need:

- Command reference: `references/cli.md`
- Common OpenClaw workflows: `references/workflows.md`

## Guardrails

- Prefer the wrapper scripts over calling NanoGPT HTTP APIs directly.
- Keep secrets out of prompts and logs; use config or env vars for API keys.
- Use `--json` when another tool or agent will parse the output.
- Use `--output` on `scripts/image.sh` when a file artifact is required.

