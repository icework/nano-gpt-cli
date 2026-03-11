# Repository Guidelines

## Project Structure & Module Organization

This repository is split between a ClawHub/OpenClaw skill package at the root and the TypeScript CLI in `cli/`.

- `SKILL.md`, `agents/openai.yaml`: skill metadata and agent-facing instructions.
- `references/`: short docs for command usage and common workflows.
- `scripts/`: thin shell wrappers such as `prompt.sh` and `image.sh` that resolve and invoke `nano-gpt`.
- `cli/src/`: CLI source code. Keep command wiring in `cli.ts`, API transport in `client.ts`, config logic in `config.ts`, and shared types in `types.ts`.
- `cli/test/`: Node test files compiled and run from `dist/test/`.

## Build, Test, and Development Commands

- `npm install`: install workspace dependencies.
- `npm run build`: compile the CLI to `cli/dist/`.
- `npm test`: rebuild the CLI and run the Node test suite.
- `node cli/dist/src/bin.js --help`: inspect the built CLI directly.
- `./scripts/prompt.sh "Hello"`: test the wrapper-based skill entrypoints.
- `cd cli && npm link`: expose `nano-gpt` as a local global command for manual testing.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings and 2-space indentation. Prefer small focused modules over large multi-purpose files. Use:

- `camelCase` for functions and variables
- `PascalCase` for classes and types
- `UPPER_SNAKE_CASE` for exported constants
- `*.test.ts` for tests

There is no formatter or linter configured yet, so keep style consistent with the existing files and avoid unrelated refactors.

## Testing Guidelines

Tests use the built-in Node test runner via `node --test`. Add unit tests in `cli/test/` for new parsing, config, transport, and stream behavior. Keep tests deterministic and mock network calls instead of hitting NanoGPT directly. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines

This repository has no commit history yet. Use short imperative commit messages, preferably Conventional Commit style such as `feat: add image output handling` or `fix: preserve config precedence`. PRs should include a concise summary, testing notes, and any user-visible CLI changes. Include terminal output examples when changing commands or skill wrapper behavior.

## Security & Configuration Tips

Do not hardcode API keys. Use `NANO_GPT_API_KEY` or `nano-gpt config set api-key ...`. Treat config files and generated outputs as local artifacts, and avoid committing secrets or large generated files.
