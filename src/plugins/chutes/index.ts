/**
 * Chutes API plugin for Eliza OS with enhanced reliability and error handling
 */

import {
  ChutesAction,
  ChutesPlugin,
  ChutesPluginConfig,
  ChutesChute,
  ChutesImage,
  ChutesCord
} from "./types.js";
import { ChutesClient, ChutesClientConfig } from "./client.js";
import {
  validateApiKey,
  validateChuteId,
  validateCordName,
  validateParams,
} from "../../common/utils.js";

import { ApiLogger } from "../../common/api-utils.js";

// Define types to avoid @ai16z/eliza dependency in development
interface IAgentRuntime {
  [key: string]: any;
}

// Interface for message content
interface Memory {
  content: {
    text: string;
  };
}

// Interface for plugin state
interface State {
  [key: string]: any;
}

/**
 * Default configuration for the Chutes plugin
 */
const DEFAULT_CONFIG: Partial<ChutesClientConfig> = {
  baseUrl: "https://api.chutes.ai",
  timeoutMs: 30000, // 30 seconds
  retries: 3
};

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

/**
 * Format and standardize error responses
 */
function formatErrorResponse(error: unknown): { success: false; response: string } {
  console.error("API Error:", error);
  
  // Create user-friendly error message
  let errorMessage: string;
  
  if (error instanceof Error) {
    // Extract API error details if available
    if (error.message.includes('API error:')) {
      errorMessage = error.message;
    } else if (error.message.includes('timed out')) {
      errorMessage = `The request timed out. Please try again later.`;
    } else if (error.message.includes('404')) {
      errorMessage = `The requested resource was not found. Please verify your input.`;
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage = `Authentication failed. Please check your API key and permissions.`;
    } else if (error.message.includes('Network error')) {
      errorMessage = `Cannot connect to the Chutes API. Please check your internet connection.`;
    } else {
      errorMessage = error.message;
    }
  } else {
    errorMessage = "An unknown error occurred";
  }
  
  return {
    success: false,
    response: `Error: ${errorMessage}`,
  };
}

/**
 * Implementation of the Chutes plugin for Eliza OS with enhanced reliability
 */
export class ChutesApiPlugin implements ChutesPlugin {
  readonly name: string = "chutes-api";
  readonly description: string = "Interact with the Chutes API for deploying and managing chutes";
  config: ChutesPluginConfig;
  client: ChutesClient;

  constructor(config: ChutesPluginConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    validateApiKey(this.config);
    this.client = new ChutesClient(this.config);
  }

  /**
   * Actions available in the Chutes plugin
   */
  actions: ChutesAction[] = [
    // List Chutes
    {
      name: "list_chutes",
      description: "List all available chutes in your account",
      examples: [
        [{ user: "user", content: { text: "List all my chutes" } }],
        [{ user: "user", content: { text: "Show me my chutes" } }],
      ],
      similes: ["show chutes", "get chutes", "list chutes"],
      validate: async () => true,
      handler: async (runtime, message, state) => {
        try {
          ApiLogger.request("GET", "/chutes", { action: "list_chutes" });
          const chutes = await this.client.listChutes();
          
          if (chutes.length === 0) {
            return {
              success: true,
              response: "You don't have any chutes yet.",
            };
          }
          
          const formattedChutes = chutes.map(chute => (
            `- **${chute.name}** (ID: \`${chute.id}\`)
              Status: ${chute.status}
              Created: ${new Date(chute.created_at).toLocaleString()}`
          )).join("\n\n");
          
          return {
            success: true,
            response: `Here are your chutes:\n\n${formattedChutes}`,
            chutes,
          };
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    },
    
    // Get Chute Details
    {
      name: "get_chute",
      description: "Get detailed information about a specific chute",
      examples: [
        [{ user: "user", content: { text: "Get details for chute abc-123" } }],
        [{ user: "user", content: { text: "Show me info about chute my-model" } }],
      ],
      similes: ["chute info", "chute details", "show chute"],
      validate: async (runtime, message) => {
        try {
          const content = message.content;
          const text = content?.text;
          
          if (!text) return false;
          
          // Extract chute ID or name from the message
          const match = text.match(/chute\s+(?:details|info|for|about)?\s*["|']?([a-zA-Z0-9_-]+)["|']?/i);
          return !!match;
        } catch (error) {
          console.error("Validation error:", error);
          return false;
        }
      },
      handler: async (runtime, message) => {
        try {
          // Extract chute ID or name from the message
          const match = message.content.text.match(/chute\s+(?:details|info|for|about)?\s*["|']?([a-zA-Z0-9_-]+)["|']?/i);
          
          if (!match || !match[1]) {
            return {
              success: false,
              response: "Please specify a chute ID or name.",
            };
          }
          
          const chuteIdOrName = match[1];
          
          // First try to get the chute directly by ID
          try {
            validateChuteId(chuteIdOrName);
            ApiLogger.request("GET", `/chutes/${chuteIdOrName}`, { action: "get_chute", chuteId: chuteIdOrName });
            const chute = await this.client.getChute(chuteIdOrName);
            
            return {
              success: true,
              response: `
### Chute: ${chute.name}

- **ID**: \`${chute.id}\`
- **Status**: ${chute.status}
- **Owner**: ${chute.username}
- **Created**: ${new Date(chute.created_at).toLocaleString()}
- **Image**: ${chute.image_id}
- **Public**: ${chute.public ? "Yes" : "No"}
- **GPU**: ${chute.node_selector.gpu_count} x ${chute.node_selector.min_vram_gb_per_gpu}GB

${chute.readme ? `\n### Description\n\n${chute.readme}\n` : ''}
              `,
              chute,
            };
          } catch (error) {
            // If it fails by ID, try to find it by name in the list
            const chutes = await this.client.listChutes();
            const matchedChute = chutes.find(c => c.name.toLowerCase() === chuteIdOrName.toLowerCase());
            
            if (matchedChute) {
              ApiLogger.request("GET", `/chutes/${matchedChute.id}`, { action: "get_chute", chuteId: matchedChute.id });
              const chute = await this.client.getChute(matchedChute.id);
              
              return {
                success: true,
                response: `
### Chute: ${chute.name}

- **ID**: \`${chute.id}\`
- **Status**: ${chute.status}
- **Owner**: ${chute.username}
- **Created**: ${new Date(chute.created_at).toLocaleString()}
- **Image**: ${chute.image_id}
- **Public**: ${chute.public ? "Yes" : "No"}
- **GPU**: ${chute.node_selector.gpu_count} x ${chute.node_selector.min_vram_gb_per_gpu}GB

${chute.readme ? `\n### Description\n\n${chute.readme}\n` : ''}
                `,
                chute,
              };
            } else {
              return {
                success: false,
                response: `Could not find a chute with ID or name "${chuteIdOrName}".`,
              };
            }
          }
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    },
    
    // List Cords for a Chute
    {
      name: "list_cords",
      description: "List all available cord functions for a specific chute",
      examples: [
        [{ user: "user", content: { text: "List cords for chute abc-123" } }],
        [{ user: "user", content: { text: "Show me functions in chute my-model" } }],
      ],
      similes: ["show cords", "get cords", "list functions"],
      validate: async (runtime, message) => {
        try {
          const content = message.content;
          const text = content?.text;
          
          if (!text) return false;
          
          // Extract chute ID or name from the message
          const match = text.match(/(?:cords|functions)\s+(?:for|in|of)\s+(?:chute\s+)?["|']?([a-zA-Z0-9_-]+)["|']?/i);
          return !!match;
        } catch (error) {
          console.error("Validation error:", error);
          return false;
        }
      },
      handler: async (runtime, message) => {
        try {
          // Extract chute ID or name from the message
          const match = message.content.text.match(/(?:cords|functions)\s+(?:for|in|of)\s+(?:chute\s+)?["|']?([a-zA-Z0-9_-]+)["|']?/i);
          
          if (!match || !match[1]) {
            return {
              success: false,
              response: "Please specify a chute ID or name.",
            };
          }
          
          const chuteIdOrName = match[1];
          let chuteId = chuteIdOrName;
          
          // If it doesn't look like an ID, try to find the chute by name
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chuteIdOrName)) {
            const chutes = await this.client.listChutes();
            const matchedChute = chutes.find(c => c.name.toLowerCase() === chuteIdOrName.toLowerCase());
            
            if (matchedChute) {
              chuteId = matchedChute.id;
            } else {
              return {
                success: false,
                response: `Could not find a chute with name "${chuteIdOrName}".`,
              };
            }
          }
          
          // Validate and get cords
          validateChuteId(chuteId);
          ApiLogger.request("GET", `/chutes/${chuteId}/cords`, { action: "list_cords", chuteId });
          const cords = await this.client.listCords(chuteId);
          
          if (cords.length === 0) {
            return {
              success: true,
              response: `The chute "${chuteIdOrName}" doesn't have any exposed cord functions.`,
            };
          }
          
          const formattedCords = cords.map(cord => {
            let description = `- **${cord.name}**`;
            
            if (cord.description) {
              description += `\n  ${cord.description}`;
            }
            
            if (cord.public_api_path) {
              description += `\n  API: ${cord.public_api_method || 'POST'} ${cord.public_api_path}`;
            }
            
            return description;
          }).join("\n\n");
          
          return {
            success: true,
            response: `Available functions for chute "${chuteIdOrName}":\n\n${formattedCords}`,
            cords,
          };
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    },
    
    // Execute a Cord
    {
      name: "execute_cord",
      description: "Execute a cord function on a chute",
      examples: [
        [{ user: "user", content: { text: 'Execute "generate" on chute abc-123 with params {"prompt": "Hello"}' } }],
        [{ user: "user", content: { text: 'Call chat function on my-model with {"message": "What is AI?"}' } }],
      ],
      similes: ["run cord", "call function", "invoke cord"],
      validate: async (runtime, message) => {
        try {
          const content = message.content;
          const text = content?.text;
          
          if (!text) return false;
          
          // Check for patterns like "execute X on Y with Z" or "call X on Y with Z"
          return /(?:execute|run|call|invoke)\s+["']?([a-zA-Z0-9_-]+)["']?\s+(?:on|in|for)\s+(?:chute\s+)?["']?([a-zA-Z0-9_-]+)["']?\s+(?:with|using)\s+({.+})/i.test(text);
        } catch (error) {
          console.error("Validation error:", error);
          return false;
        }
      },
      handler: async (runtime, message) => {
        try {
          // Extract cord name, chute ID/name and params from the message
          const match = message.content.text.match(/(?:execute|run|call|invoke)\s+["']?([a-zA-Z0-9_-]+)["']?\s+(?:on|in|for)\s+(?:chute\s+)?["']?([a-zA-Z0-9_-]+)["']?\s+(?:with|using)\s+({.+})/i);
          
          if (!match || !match[1] || !match[2] || !match[3]) {
            return {
              success: false,
              response: 'Please specify the cord name, chute ID/name, and parameters. For example: Execute "generate" on chute abc-123 with params {"prompt": "Hello"}',
            };
          }
          
          const cordName = match[1];
          const chuteIdOrName = match[2];
          let paramsJson = match[3];
          
          // Parse the JSON parameters
          let params: object;
          try {
            params = JSON.parse(paramsJson);
          } catch (parseError) {
            return {
              success: false,
              response: `Invalid JSON parameters: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            };
          }
          
          // Validate the params
          validateParams(params);
          validateCordName(cordName);
          
          // Resolve chute ID from name if needed
          let chuteId = chuteIdOrName;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chuteIdOrName)) {
            const chutes = await this.client.listChutes();
            const matchedChute = chutes.find(c => c.name.toLowerCase() === chuteIdOrName.toLowerCase());
            
            if (matchedChute) {
              chuteId = matchedChute.id;
            } else {
              return {
                success: false,
                response: `Could not find a chute with name "${chuteIdOrName}".`,
              };
            }
          }
          
          // Execute the cord with proper logging and timeout handling
          ApiLogger.request("POST", `/chutes/${chuteId}/cords/${cordName}`, { 
            action: "execute_cord", 
            chuteId, 
            cordName, 
            hasParams: true 
          });
          
          const result = await this.client.executeCord(chuteId, cordName, params);
          
          // Format the response depending on the type
          let response: string;
          
          if (typeof result === 'string') {
            response = result;
          } else if (result && typeof result === 'object') {
            if (result.text || result.message || result.content || result.response) {
              // Handle common response patterns
              response = result.text || result.message || result.content || result.response;
            } else {
              // Fallback to JSON stringification with pretty printing
              response = `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
            }
          } else {
            response = String(result);
          }
          
          return {
            success: true,
            response: `Result from ${cordName}:\n\n${response}`,
            result,
          };
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    },
    
    // Deploy a Chute
    {
      name: "deploy_chute",
      description: "Deploy a new chute from an existing image",
      examples: [
        [{ user: "user", content: { text: 'Deploy chute "my-llm" from image abc-123 with 1 GPU with 24GB RAM' } }],
      ],
      similes: ["create chute", "launch chute", "start chute"],
      validate: async (runtime, message) => {
        try {
          const content = message.content;
          const text = content?.text;
          
          if (!text) return false;
          
          return /deploy\s+(?:a\s+)?(?:new\s+)?(?:chute\s+)?["']?([a-zA-Z0-9_-]+)["']?\s+(?:from|with|using)\s+(?:image\s+)?["']?([a-zA-Z0-9_-]+)["']?/i.test(text);
        } catch (error) {
          console.error("Validation error:", error);
          return false;
        }
      },
      handler: async (runtime, message, state) => {
        try {
          // This would require more complex parsing to extract all parameters
          // For simplicity, we'll focus on the core parameters
          const match = message.content.text.match(/deploy\s+(?:a\s+)?(?:new\s+)?(?:chute\s+)?["']?([a-zA-Z0-9_-]+)["']?\s+(?:from|with|using)\s+(?:image\s+)?["']?([a-zA-Z0-9_-]+)["']?/i);
          
          if (!match || !match[1] || !match[2]) {
            return {
              success: false,
              response: 'Please specify the chute name and image ID. For example: Deploy chute "my-llm" from image abc-123 with 1 GPU with 24GB RAM',
            };
          }
          
          const chuteName = match[1];
          const imageIdOrName = match[2];
          
          // Parse GPU requirements - this is simplified and could be enhanced
          const gpuMatch = message.content.text.match(/with\s+(\d+)\s+GPU(?:s)?\s+(?:with|having)\s+(\d+)(?:GB|G)\s+(?:RAM|VRAM|memory)/i);
          const gpuCount = gpuMatch ? parseInt(gpuMatch[1], 10) : 1;
          const vramPerGpu = gpuMatch ? parseInt(gpuMatch[2], 10) : 24;
          
          // Get username - in a real implementation, this would come from the user's account
          // For this demo, we'll use a placeholder or extract from state
          const username = state?.username || "current-user";
          
          // Resolve image ID from name if needed
          let imageId = imageIdOrName;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageIdOrName)) {
            const images = await this.client.listImages();
            const matchedImage = images.find(img => img.name.toLowerCase() === imageIdOrName.toLowerCase());
            
            if (matchedImage) {
              imageId = matchedImage.id;
            } else {
              return {
                success: false,
                response: `Could not find an image with name "${imageIdOrName}".`,
              };
            }
          }
          
          // Prepare deployment parameters
          const deployParams = {
            username,
            name: chuteName,
            image_id: imageId,
            node_selector: {
              gpu_count: gpuCount,
              min_vram_gb_per_gpu: vramPerGpu,
            },
          };
          
          // Deploy the chute with proper logging
          ApiLogger.request("POST", "/chutes", { 
            action: "deploy_chute", 
            params: deployParams 
          });
          
          const chute = await this.client.deployChute(deployParams);
          
          return {
            success: true,
            response: `Successfully deployed chute "${chuteName}" with ID \`${chute.id}\`.\nStatus: ${chute.status}\nIt may take a few minutes for the chute to become ready.`,
            chute,
          };
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    },
  ];
}

// Default export
export default ChutesApiPlugin;
