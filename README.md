# Chutes API Plugin with Enhanced Reliability

A robust plugin for integrating with the Chutes API, featuring comprehensive error handling, timeout management, and fallback mechanisms.

## Features

- **🚀 Reliable API Integration**: Implements timeout handling, retries with exponential backoff, and fallback endpoints
- **🛠️ Comprehensive Error Handling**: Gracefully manages API errors with user-friendly messages
- **📊 Detailed Logging**: Tracks API requests, responses, and performance metrics
- **🧪 Debugging Utilities**: Includes dedicated debugging tools for API troubleshooting
- **🔄 Multiple Endpoint Attempts**: Automatically tries alternative endpoints when the primary one fails
- **⏱️ Configurable Timeouts**: Customizable timeout settings for different operations

## Getting Started

### Prerequisites

- Node.js 14+
- npm or pnpm

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Copy the example environment file and edit it:
   ```
   cp .env.example .env
   ```
4. Edit `.env` and add your Chutes API key:
   ```
   CHUTES_API_KEY=your_api_key_here
   ```

### Building

```
pnpm build
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

### Handling Developer Requirements

The plugin now includes methods to check developer status and requirements:

```typescript
// Check developer status
const devStatus = await chutesPlugin.client.checkDeveloperStatus();

if (!devStatus.isDeveloper) {
  console.log(`Developer status required: ${devStatus.requirementMessage}`);
  console.log(`Deposit amount: $${devStatus.depositInfo.usd} USD (${devStatus.depositInfo.tao_estimate} TAO)`);
}
```

## Usage

### Basic Usage

```typescript
import { ChutesApiPlugin } from './plugins/chutes';

// Create a new instance of the plugin
const chutesPlugin = new ChutesApiPlugin({
  apiKey: 'your_api_key_here',
  // Optional configuration
  baseUrl: 'https://api.chutes.ai',
  timeoutMs: 30000,
  retries: 3
});

// Use the plugin
const chutes = await chutesPlugin.client.listChutes();
console.log(chutes);
```

### Advanced Configuration

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

const chutesPlugin = new ChutesApiPlugin(config);
```

## API Integration Improvements

This plugin implements several improvements for reliable API integration:

### 1. Timeout Handling

All API requests use the `withTimeout` utility to prevent indefinitely hanging requests:

```typescript
const result = await withTimeout(
  promise,
  timeoutMs,
  operationName
);
```

### 2. Retry Mechanism

Failed API requests are automatically retried with exponential backoff:

```typescript
const result = await withRetry(
  (retry, signal) => apiFunction(params, signal),
  { retries: 3, timeout: 10000 }
);
```

### 3. Fallback Endpoints

If the primary API endpoint fails, the plugin automatically tries alternative endpoints:

```typescript
const fallbackEndpoints = [
  'https://api-backup.chutes.ai',
  'https://api-fallback.chutes.ai'
];
```

### 4. Response Validation

Responses are validated to ensure they contain the expected data:

```typescript
const validatedData = validateResponseData(
  data,
  ['id', 'name', 'status'],
  { defaultValue: 'fallback' }
);
```

### 5. Enhanced Error Handling

API errors are processed into user-friendly messages:

```typescript
try {
  // API call
} catch (error) {
  return formatErrorResponse(error);
}
```

## Error Handling

The plugin implements a comprehensive error handling strategy:

1. **Network Errors**: Connection issues are clearly identified
2. **Timeout Errors**: Requests that take too long are properly terminated
3. **API Errors**: Invalid responses from the API are handled gracefully
4. **User-Friendly Messages**: Technical errors are translated into understandable messages
5. **Detailed Logging**: All errors are logged with relevant context

## Development

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
