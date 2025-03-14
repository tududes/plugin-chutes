# Chutes API Plugin for Eliza OS

This plugin allows Eliza OS to interact with the [Chutes.ai](https://chutes.ai) API, which provides access to GPU compute resources for deploying models and applications.

## Features

The Chutes API plugin provides the following capabilities:

1. **List Chutes**: View all your deployed chutes on Chutes.ai
2. **Get Chute Details**: Get detailed information about a specific chute
3. **Execute Cord**: Run functions (cords) on deployed chutes
4. **List Images**: View available Docker images for building chutes

## Prerequisites

- A Chutes.ai account
- A Chutes API key

## Setup

1. Add your Chutes API key to the `.env` file:
   ```
   CHUTES_API_KEY=your_api_key_here
   ```

2. Import the plugin in your Eliza OS configuration:
   ```typescript
   import { ChutesApiPlugin } from '@ai16z/eliza';
   ```

## Usage

Once the plugin is installed and configured, you can use it with Eliza OS to interact with the Chutes API. Here are some example commands:

- "List all my chutes"
- "Show details for chute abc123"
- "Run echo cord on chute abc123 with parameters foo=bar"
- "List all available images"

## API Reference

### List Chutes

Lists all the chutes you have deployed on Chutes.ai.

Example: "List all my chutes"

### Get Chute Details

Shows detailed information about a specific chute, including its status, node selector configuration, and available cords.

Example: "Show details for chute abc123"

### Execute Cord

Executes a cord function on a specific chute with the provided parameters.

Example: "Run echo cord on chute abc123 with parameters foo=bar"

### List Images

Lists all available Docker images that can be used for building chutes.

Example: "List all available images"

## Development

If you want to contribute to this plugin, you can clone the repository and make your changes. Here's how to set up the development environment:

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Make your changes
4. Build the plugin: `pnpm tsc`
5. Test your changes

## License

This plugin is licensed under the MIT License. 