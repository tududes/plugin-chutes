# Chutes Plugin for Eliza OS

A powerful Eliza OS plugin that enables seamless integration with the Chutes AI platform, allowing you to create, manage, and interact with AI-powered chutes directly from Eliza OS.

## What is Chutes?

Chutes is an AI middleware platform that helps developers build and deploy AI applications. The platform provides:

- Access to state-of-the-art AI models
- Infrastructure for deploying and scaling AI applications  
- Tools for monitoring and managing AI workflows
- Developer-friendly APIs for integration

This plugin brings the power of Chutes directly to Eliza OS.

## Features

- **🔌 Seamless Eliza OS Integration**: Easily access Chutes functionality within the Eliza OS environment
- **📋 Chute Management**: Create, list, and manage your AI chutes
- **💬 Cord Messaging**: Send and receive messages through AI-powered cords
- **🚀 Reliable API Integration**: Implements timeout handling, retries, and fallback mechanisms
- **🛠️ Comprehensive Error Handling**: Gracefully manages API errors with user-friendly messages
- **🧪 Debugging Utilities**: Includes dedicated tools for API troubleshooting

## Installation

### Prerequisites

- Eliza OS environment
- Node.js 14+
- npm or pnpm
- Chutes API key (get one at [chutes.ai](https://chutes.ai))

### Setup

1. Install the plugin in your Eliza OS environment:
   ```bash
   npm install @eliza-os/plugin-chutes
   ```

2. Configure the plugin with your Chutes API key:
   ```typescript
   import { ChutesPlugin } from '@eliza-os/plugin-chutes';

   // Register the plugin
   elizaOS.registerPlugin(new ChutesPlugin({
     apiKey: 'your_chutes_api_key_here'
   }));
   ```

3. Alternatively, create a `.env` file with your API key:
   ```
   CHUTES_API_KEY=your_api_key_here
   ```

## Usage Examples

### Basic Usage

```typescript
// Access the plugin through Eliza OS
const chutesPlugin = elizaOS.getPlugin('chutes');

// List all available chutes
const chutes = await chutesPlugin.client.listChutes();
console.log('Available chutes:', chutes);

// Get information about a specific chute
const chuteInfo = await chutesPlugin.client.getChuteInfo('chute-id-here');
console.log('Chute details:', chuteInfo);
```

### Creating a New Chute

```typescript
// Define your chute configuration
const chuteConfig = {
  name: 'My First Chute',
  description: 'A demo chute for testing purposes',
  modelName: 'gpt-4',
  prompts: {
    system: 'You are a helpful assistant specialized in answering questions about AI.',
    user: '{{message}}'
  }
};

// Create the chute
const newChute = await chutesPlugin.client.createChute(chuteConfig);
console.log('New chute created:', newChute);
```

### Sending Messages to a Cord

```typescript
// Send a message to a specific cord
const response = await chutesPlugin.client.sendMessageToCord(
  'cord-id-here',
  'What are the main challenges in AI development?'
);

console.log('Cord response:', response.message);
```

### Working with Developer Status

```typescript
// Check if you have developer status
const devStatus = await chutesPlugin.client.checkDeveloperStatus();

if (devStatus.isDeveloper) {
  console.log('You have developer status!');
} else {
  console.log(`Developer status required: ${devStatus.requirementMessage}`);
  console.log(`Deposit amount: $${devStatus.depositInfo.usd} USD (${devStatus.depositInfo.tao_estimate} TAO)`);
}
```

## Advanced Configuration

```typescript
const config = {
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.chutes.ai',
  timeoutMs: 30000, // 30 seconds timeout
  retries: 3, // Retry up to 3 times
  fallbackEndpoints: [
    'https://api-backup.chutes.ai', 
    'https://api-fallback.chutes.ai'
  ]
};

// Register with advanced configuration
elizaOS.registerPlugin(new ChutesPlugin(config));
```

## API Debugging and Common Issues

### Using the Debug Script

This plugin includes a dedicated debugging script that can help diagnose API connectivity issues:

```
node --loader ts-node/esm ./src/scripts/debugApi.ts
```

The debugging script tests:
- API URL validation
- Authentication
- Developer deposit requirements
- Chutes and cords access
- Direct API endpoint availability

### Understanding API Access Requirements

Based on our debugging and the Chutes documentation, here are important notes about API access:

1. **API Key Permissions**:
   - API keys can have different scopes: admin, images, specific chutes
   - To create or modify images and chutes, you need a key with appropriate permissions

2. **Developer Status Requirements**:
   - To create images or chutes, you must have developer status
   - Developer status requires a deposit of TAO cryptocurrency (approximately $250 USD)
   - The plugin automatically checks developer status and provides guidance if required

3. **Common 404 Errors**:
   - "No matching chute found!" error on the `/chutes` endpoint usually means:
     - No chutes have been deployed yet (normal case)
     - API key lacks permission to view chutes
     - Developer status is required

## Error Handling

The plugin implements a comprehensive error handling strategy:

1. **Network Errors**: Connection issues are clearly identified
2. **Timeout Errors**: Requests that take too long are properly terminated
3. **API Errors**: Invalid responses from the API are handled gracefully
4. **User-Friendly Messages**: Technical errors are translated into understandable messages
5. **Detailed Logging**: All errors are logged with relevant context

## Development

### Building from Source

If you want to build the plugin from source:

1. Clone the repository:
   ```
   git clone https://github.com/eliza-os/plugin-chutes.git
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Build the plugin:
   ```
   pnpm build
   ```

### Running Tests

```
pnpm test
```

### Debugging

The plugin includes extensive logging throughout the API request lifecycle. To view detailed logs:

```typescript
// Enable verbose logging
process.env.DEBUG = 'chutes:*';
```

## License

MIT
