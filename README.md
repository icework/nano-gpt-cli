# nano-gpt-cli

CLI and ClawHub/OpenClaw skill package for the NanoGPT API.

## What’s here

- `cli/`: TypeScript CLI published as `nano-gpt-cli`
- `scripts/`: wrapper scripts for skill-driven workflows
- `SKILL.md`: root skill definition for OpenClaw/ClawHub
- `references/`: concise command and workflow docs

## Install

```bash
npm install
npm run build
cd cli
npm link
```

## Configure

```bash
nano-gpt config set api-key YOUR_API_KEY
```

## Usage

```bash
nano-gpt prompt "Write one sentence proving this CLI is working."
nano-gpt chat
nano-gpt models --json
nano-gpt image "A red panda coding at a laptop" --output /tmp/red-panda.jpg
nano-gpt image "Turn this product photo into a watercolor ad" --image ./product.png --output /tmp/product-watercolor.png
```

## Development

```bash
npm run build
npm test
```

The CLI defaults to `moonshotai/kimi-k2.5` for text and `qwen-image` for image generation.

## License

MIT. See `LICENSE`.
