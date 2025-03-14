/**
 * Type definitions for the Chutes API plugin
 */

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

type Handler = (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<any>;
type Validator = (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;

interface ActionExample {
  user: string;
  content: any;
}

interface Action {
  name: string;
  description: string;
  examples: ActionExample[][];
  similes: string[];
  handler: Handler;
  validate: Validator;
}

interface Plugin {
  name: string;
  description: string;
  actions: Action[];
}

/**
 * Configuration for the Chutes API plugin
 */
export interface ChutesPluginConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Represents an image in the Chutes API
 */
export interface ChutesImage {
  id: string;
  username: string;
  name: string;
  tag: string;
  readme?: string;
  public: boolean;
  created_at: string;
}

/**
 * Represents a chute in the Chutes API
 */
export interface ChutesChute {
  id: string;
  username: string;
  name: string;
  readme?: string;
  image_id: string;
  public: boolean;
  created_at: string;
  status: string;
  node_selector: {
    gpu_count: number;
    min_vram_gb_per_gpu: number;
    include?: string[];
    exclude?: string[];
  };
}

/**
 * Represents a cord function in the Chutes API
 */
export interface ChutesCord {
  name: string;
  description?: string;
  input_schema?: object;
  output_schema?: object;
  public_api_path?: string;
  public_api_method?: string;
}

/**
 * Chutes API client interface
 */
export interface ChutesApiClient {
  // Authentication
  checkAuth(): Promise<boolean>;
  
  // Images
  listImages(): Promise<ChutesImage[]>;
  getImage(id: string): Promise<ChutesImage>;
  
  // Chutes
  listChutes(): Promise<ChutesChute[]>;
  getChute(id: string): Promise<ChutesChute>;
  deployChute(params: {
    username: string;
    name: string;
    image_id: string;
    readme?: string;
    node_selector: {
      gpu_count: number;
      min_vram_gb_per_gpu: number;
      include?: string[];
      exclude?: string[];
    };
  }): Promise<ChutesChute>;
  deleteChute(id: string): Promise<boolean>;
  
  // Cords
  listCords(chuteId: string): Promise<ChutesCord[]>;
  executeCord(chuteId: string, cordName: string, params: object): Promise<any>;
}

/**
 * Chutes API action interface
 */
export interface ChutesAction extends Action {
  name: string;
  description: string;
  examples: ActionExample[][];
  similes: string[];
  handler: Handler;
  validate: Validator;
}

/**
 * Chutes plugin interface
 */
export interface ChutesPlugin extends Plugin {
  name: string;
  description: string;
  actions: ChutesAction[];
  config: ChutesPluginConfig;
  client: ChutesApiClient;
}
