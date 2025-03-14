/**
 * Chutes API plugin for Eliza OS
 */

import {
  ChutesAction,
  ChutesPlugin,
  ChutesPluginConfig,
  ChutesChute,
  ChutesImage,
  ChutesCord
} from "./types.js";
import { ChutesClient } from "./client.js";
import {
  validateApiKey,
  validateChuteId,
  validateCordName,
  validateParams,
  handleApiError
} from "../../common/utils.js";

// Define types to avoid @ai16z/eliza dependency in development
interface IAgentRuntime {
  [key: string]: any;
}

interface Memory {
  user: string;
  content: any;
}

interface State {
  [key: string]: any;
}

/**
 * Default configuration for the Chutes plugin
 */
const DEFAULT_CONFIG: Partial<ChutesPluginConfig> = {
  baseUrl: "https://api.chutes.ai"
};

/**
 * Implementation of the Chutes plugin for Eliza OS
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
      name: "LIST_CHUTES",
      description: "List available chutes on Chutes.ai",
      examples: [
        [
          {
            user: "user",
            content: { text: "List all my chutes" }
          }
        ],
        [
          {
            user: "user",
            content: { text: "Show my deployed chutes on Chutes.ai" }
          }
        ]
      ],
      similes: ["listchutes", "getchutes", "showchutes"],
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        return message.content && 
          typeof message.content.text === "string" && 
          (
            message.content.text.toLowerCase().includes("list") ||
            message.content.text.toLowerCase().includes("show") ||
            message.content.text.toLowerCase().includes("get")
          ) && 
          message.content.text.toLowerCase().includes("chute");
      },
      handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        try {
          const chutes = await this.client.listChutes();
          
          if (chutes.length === 0) {
            return {
              success: true,
              response: "You don't have any chutes deployed yet.",
            };
          }

          const formattedChutes = chutes.map(chute => ({
            id: chute.id,
            name: `${chute.username}/${chute.name}`,
            status: chute.status,
            public: chute.public ? "Yes" : "No",
            created: new Date(chute.created_at).toLocaleString()
          }));

          return {
            success: true,
            response: `Your deployed chutes:\n\n${formattedChutes.map(c => 
              `- ID: ${c.id}\n  Name: ${c.name}\n  Status: ${c.status}\n  Public: ${c.public}\n  Created: ${c.created}`
            ).join('\n\n')}`
          };
        } catch (error: any) {
          return handleApiError(error);
        }
      }
    },

    // Get Chute Details
    {
      name: "GET_CHUTE_DETAILS",
      description: "Get detailed information about a specific chute",
      examples: [
        [
          {
            user: "user",
            content: { text: "Show details for chute abc123" }
          }
        ]
      ],
      similes: ["chutedetails", "chuteinfo", "describeChute"],
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        return message.content && 
          typeof message.content.text === "string" && 
          message.content.text.toLowerCase().includes("chute") &&
          (
            message.content.text.toLowerCase().includes("detail") ||
            message.content.text.toLowerCase().includes("info") ||
            message.content.text.toLowerCase().includes("describe")
          );
      },
      handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        try {
          // Extract chute ID from message
          const text = message.content.text.toLowerCase();
          const words = text.split(/\s+/);
          let chuteId = "";

          // Find the word that might be a chute ID
          for (let i = 0; i < words.length; i++) {
            if (words[i] === "chute" && i < words.length - 1) {
              chuteId = words[i + 1];
              break;
            }
          }

          if (!chuteId) {
            return {
              success: false,
              response: "Please specify a chute ID. Example: 'Show details for chute abc123'"
            };
          }

          // Validate and get chute details
          try {
            validateChuteId(chuteId);
          } catch (error: any) {
            return {
              success: false,
              response: `Invalid chute ID format: ${error.message}`
            };
          }

          const chute = await this.client.getChute(chuteId);
          const cords = await this.client.listCords(chuteId);

          return {
            success: true,
            response: `
Chute Details:
- Name: ${chute.username}/${chute.name}
- ID: ${chute.id}
- Status: ${chute.status}
- Public: ${chute.public ? "Yes" : "No"}
- Created: ${new Date(chute.created_at).toLocaleString()}
- Node Selector:
  - GPU Count: ${chute.node_selector.gpu_count}
  - Min VRAM per GPU: ${chute.node_selector.min_vram_gb_per_gpu} GB
  ${chute.node_selector.include ? `- Include: ${chute.node_selector.include.join(', ')}` : ''}
  ${chute.node_selector.exclude ? `- Exclude: ${chute.node_selector.exclude.join(', ')}` : ''}

Available Cords:
${cords.map(cord => `- ${cord.name}${cord.description ? `: ${cord.description}` : ''}`).join('\n')}
`
          };
        } catch (error: any) {
          return handleApiError(error);
        }
      }
    },

    // Execute Cord
    {
      name: "EXECUTE_CORD",
      description: "Execute a cord function on a specific chute",
      examples: [
        [
          {
            user: "user",
            content: { text: "Run echo cord on chute abc123 with parameters foo=bar" }
          }
        ]
      ],
      similes: ["runcord", "executecord", "callchute"],
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        return message.content && 
          typeof message.content.text === "string" && 
          (
            message.content.text.toLowerCase().includes("run") ||
            message.content.text.toLowerCase().includes("execute") ||
            message.content.text.toLowerCase().includes("call")
          ) &&
          message.content.text.toLowerCase().includes("cord") && 
          message.content.text.toLowerCase().includes("chute");
      },
      handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        try {
          // Parse input to extract chute ID, cord name, and parameters
          const text = message.content.text.toLowerCase();
          const words = text.split(/\s+/);
          
          let chuteId = "";
          let cordName = "";
          let paramsText = "";

          // Extract chute ID
          for (let i = 0; i < words.length; i++) {
            if (words[i] === "chute" && i < words.length - 1) {
              chuteId = words[i + 1];
              break;
            }
          }

          // Extract cord name
          for (let i = 0; i < words.length; i++) {
            if (words[i] === "cord" && i > 0) {
              cordName = words[i - 1];
              break;
            }
          }

          // Extract parameters
          const paramIndex = text.indexOf("parameters");
          if (paramIndex !== -1) {
            paramsText = text.substring(paramIndex + "parameters".length).trim();
          } else {
            const withIndex = text.indexOf("with");
            if (withIndex !== -1) {
              paramsText = text.substring(withIndex + "with".length).trim();
            }
          }

          // Validate inputs
          if (!chuteId || !cordName) {
            return {
              success: false,
              response: "Please specify both a chute ID and cord name. Example: 'Run echo cord on chute abc123 with parameters foo=bar'"
            };
          }

          // Parse parameters
          const params: Record<string, any> = {};
          if (paramsText) {
            const paramPairs = paramsText.split(/\s+/);
            for (const pair of paramPairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                // Try to parse as number or boolean if possible
                if (value === 'true') {
                  params[key] = true;
                } else if (value === 'false') {
                  params[key] = false;
                } else if (!isNaN(Number(value))) {
                  params[key] = Number(value);
                } else {
                  params[key] = value;
                }
              }
            }
          }

          // Execute the cord
          const result = await this.client.executeCord(chuteId, cordName, params);

          return {
            success: true,
            response: `Cord execution result:\n${JSON.stringify(result, null, 2)}`
          };
        } catch (error: any) {
          return handleApiError(error);
        }
      }
    },

    // List Images
    {
      name: "LIST_IMAGES",
      description: "List available images on Chutes.ai",
      examples: [
        [
          {
            user: "user",
            content: { text: "List all chutes images" }
          }
        ]
      ],
      similes: ["getimages", "showimages", "chuteimages"],
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        return message.content && 
          typeof message.content.text === "string" && 
          (
            message.content.text.toLowerCase().includes("list") ||
            message.content.text.toLowerCase().includes("show") ||
            message.content.text.toLowerCase().includes("get")
          ) && 
          message.content.text.toLowerCase().includes("image");
      },
      handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
      ) => {
        try {
          const images = await this.client.listImages();
          
          if (images.length === 0) {
            return {
              success: true,
              response: "No images found.",
            };
          }

          const formattedImages = images.map(image => ({
            id: image.id,
            name: `${image.username}/${image.name}:${image.tag}`,
            public: image.public ? "Yes" : "No",
            created: new Date(image.created_at).toLocaleString()
          }));

          return {
            success: true,
            response: `Available images:\n\n${formattedImages.map(img => 
              `- ID: ${img.id}\n  Name: ${img.name}\n  Public: ${img.public}\n  Created: ${img.created}`
            ).join('\n\n')}`
          };
        } catch (error: any) {
          return handleApiError(error);
        }
      }
    }
  ];
}

// Create and export a default instance of the plugin
export default new ChutesApiPlugin({
  apiKey: "",  // Set your API key here or use environment variables in production
});
