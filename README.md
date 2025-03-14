# Chutes API Plugin for Eliza OS

This repository contains a plugin for the [Eliza](https://github.com/ai16z/eliza) AI agent framework that integrates with the [Chutes.ai](https://chutes.ai) API. It allows Eliza OS to interact with Chutes.ai, a platform for deploying and managing GPU-accelerated applications and models.

## Features

The Chutes API plugin provides the following capabilities:

1. **List Chutes**: View all your deployed chutes on Chutes.ai
2. **Get Chute Details**: Get detailed information about a specific chute
3. **Execute Cord**: Run functions (cords) on deployed chutes
4. **List Images**: View available Docker images for building chutes

## Prerequisites

- Node.js 23+
- pnpm
- A Chutes.ai account
- A Chutes API key

## Getting Started

1. Clone this repository:
```bash
git clone https://github.com/yourusername/eliza-plugin-chutes.git
cd eliza-plugin-chutes
```

2. Install dependencies:
```bash
pnpm install
```

3. Add your Chutes API key to the `.env` file:
```
CHUTES_API_KEY=your_api_key_here
```

4. Compile the TypeScript code:
```bash
pnpm tsc
```

5. Run the project using the 'direct' client:
```bash
pnpm exec node --loader ts-node/esm ./src/scripts/load-with-plugin.ts --characters=./characters/eternalai.character.json
```

## Plugin Usage

Once the plugin is installed and configured, you can use it with Eliza OS to interact with the Chutes API. Here are some example commands:

- "List all my chutes"
- "Show details for chute abc123"
- "Run echo cord on chute abc123 with parameters foo=bar"
- "List all available images"

## Project Structure

```
src/
  ├── plugins/
  │   ├── chutes/    # Chutes API plugin implementation
  │   │   ├── index.ts       # Main plugin implementation
  │   │   ├── types.ts       # Type definitions
  │   │   ├── client.ts      # Chutes API client
  │   │   └── README.md      # Plugin documentation
  │   ├── tavily/     # Tavily search plugin implementation
  │   └── exa/        # Exa search plugin implementation
  ├── common/         # Shared utilities and types
  └── index.ts        # Main entry point
```

## About Chutes.ai

Chutes.ai is a platform for deploying and managing GPU-accelerated applications and models. It provides:

- On-demand access to GPU compute resources
- Easy deployment of AI models and applications
- A standardized API for interacting with deployed applications
- Integration with vLLM for high-performance LLM inference

For more information about Chutes.ai, visit the [official website](https://chutes.ai).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
