# NanoGPT CLI Reference

The skill wraps the local `nano-gpt` executable.

## Commands

```bash
nano-gpt prompt [text] [--model MODEL] [--system PROMPT] [--image PATH_OR_URL] [--json] [--no-stream]
nano-gpt chat [text] [--model MODEL] [--system PROMPT] [--json]
nano-gpt models [--json]
nano-gpt image [prompt] [--model MODEL] [--size SIZE] [--quality QUALITY] [--image PATH_OR_URL] [--output FILE] [--json]
nano-gpt config get KEY
nano-gpt config set KEY VALUE
nano-gpt config list
```

## Config keys

- `api-key`
- `default-model`
- `default-image-model`
- `output-format`
- `base-url`

## Environment overrides

- `NANO_GPT_API_KEY`
- `NANO_GPT_MODEL`
- `NANO_GPT_IMAGE_MODEL`
- `NANO_GPT_OUTPUT_FORMAT`
- `NANO_GPT_BASE_URL`
