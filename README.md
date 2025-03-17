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

### Agent Interactions with Chutes

When integrated into Eliza OS, characters (agents) can leverage the Chutes plugin for various AI-powered capabilities. Below are examples of how an Eliza character might use the plugin:

#### Discovering Available Chutes

```
User: "What AI models do I have access to?"

Eliza Character: "I can access your Chutes AI models. Let me check what's available...

I found the following chutes in your account:
- 'Text Summarizer' (specialized in condensing long documents)
- 'Image Analyzer' (can describe and analyze images)
- 'Code Assistant' (helps with programming tasks)

Would you like me to use any of these for a specific task?"
```

Behind the scenes, the character used `chutesPlugin.client.listChutes()` to retrieve this information.

#### Creating a Custom AI Assistant

```
User: "I need an assistant that can help me write marketing content."

Eliza Character: "I can help you create a specialized Chute for marketing content. What would you like it to focus on specifically?"

User: "Social media posts with a casual, friendly tone."

Eliza Character: "Great! I'll set up a new chute specialized in social media marketing content with a casual tone... 

I've created a new chute called 'Social Media Marketer'. It's designed to help you draft engaging social media posts with a friendly, conversational style. Would you like to try it out with a sample post?"
```

The character used `chutesPlugin.client.createChute()` to create this custom AI assistant based on the user's requirements.

#### Using a Chute for Specialized Tasks

```
User: "Can you summarize this report for me?" [attaches document]

Eliza Character: "I'll use the Text Summarizer chute to create a concise summary of your report...

Here's a summary of the key points:
1. Q2 sales increased 15% compared to Q1
2. New product line exceeded expectations with 22% market penetration
3. Customer retention improved to 85%, up from 78% last quarter
4. Three regions are underperforming: Southwest, Northeast, and Central

Would you like me to elaborate on any of these points?"
```

The character used `chutesPlugin.client.sendMessageToCord()` to process the document through the specialized Text Summarizer chute.

#### Checking Developer Status

```
User: "I want to create a custom AI model for my business data."

Eliza Character: "To create custom AI models, you'll need developer status on the Chutes platform. Let me check if your account has developer access...

I've checked your Chutes account status. You currently don't have developer status. To get developer privileges, you'll need to:
1. Make a deposit of approximately $250 USD in TAO cryptocurrency
2. This will allow you to create and deploy custom AI models

Would you like me to guide you through the process of obtaining developer status?"
```

The character used `chutesPlugin.client.checkDeveloperStatus()` to determine if the user has the necessary permissions.

### Advanced Integration Examples

Here are some advanced ways Eliza characters can integrate Chutes capabilities:

#### Multi-Chute Workflows

```
User: "I need to analyze these customer reviews and create a marketing strategy based on them."

Eliza Character: "I'll handle this as a multi-step process using specialized chutes:
1. First, I'll use the Text Analyzer chute to identify key themes and sentiment
2. Then, I'll pass those insights to the Strategy Advisor chute to develop marketing recommendations

Processing your request now..."

[Character processes the request through multiple chutes]

Eliza Character: "Analysis complete! Here are the key insights and recommended marketing strategies..."
```

#### Adaptive Chute Selection

Eliza characters can dynamically select the most appropriate chute based on the user's needs:

```
User: "What do you think about this design?" [shares image]

Eliza Character: "I notice you've shared an image. I'll use our specialized Image Analyzer chute to provide detailed feedback on your design..."

[Later in the conversation]

User: "Can you help me improve the copy on my website?"

Eliza Character: "For website copy, I'll switch to our Content Optimizer chute, which specializes in web content analysis and recommendations..."
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
