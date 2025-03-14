import {
  ChutesApiClient,
  ChutesChute,
  ChutesCord,
  ChutesImage,
  ChutesPluginConfig,
} from "./types.js";

import {
  ApiLogger,
  ApiResponse,
  DEFAULT_REQUEST_OPTIONS,
  RequestOptions,
  fetchWithRetry,
  validateResponseData,
} from "../../common/api-utils.js";

/**
 * Client configuration with additional API settings
 */
export interface ChutesClientConfig extends ChutesPluginConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fallbackEndpoints?: string[];
}

/**
 * Default client configuration options
 */
const DEFAULT_CLIENT_CONFIG: Partial<ChutesClientConfig> = {
  baseUrl: "https://api.chutes.ai",
  timeoutMs: 30000, // 30 seconds
  retries: 3,
};

/**
 * Alternative API endpoints to try if the main one fails
 */
const FALLBACK_ENDPOINTS = [
  "https://api-backup.chutes.ai",
  "https://api-fallback.chutes.ai",
];

/**
 * Client for interacting with the Chutes API with enhanced reliability
 */
export class ChutesClient implements ChutesApiClient {
  private apiKey: string;
  private baseUrl: string;
  private config: ChutesClientConfig;
  private requestOptions: RequestOptions;

  constructor(config: ChutesPluginConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
    this.apiKey = this.config.apiKey;
    this.baseUrl = this.config.baseUrl || DEFAULT_CLIENT_CONFIG.baseUrl!;
    
    // Configure request options
    this.requestOptions = {
      timeout: this.config.timeoutMs,
      retries: this.config.retries,
      fallbackEndpoints: this.config.fallbackEndpoints || FALLBACK_ENDPOINTS,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
  }

  /**
   * Helper method to make authenticated API requests with enhanced reliability
   * Includes timeout handling, retries, and fallback endpoints
   */
  private async makeRequest<T>(
    endpoint: string,
    method: string = "GET",
    body?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Log the API request
    ApiLogger.request(method, url, { method, hasBody: !!body });

    // Prepare fetch options
    const options: RequestInit = {
      method,
      headers: this.requestOptions.headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Make the request with enhanced error handling and timeout
    const response = await fetchWithRetry<T>(url, options, this.requestOptions);
    
    // Log the API response
    ApiLogger.response(method, url, response);

    // Handle the response
    if (!response.success) {
      const errorMessage = response.error?.message || "Unknown API error";
      console.error(`API Error: ${method} ${url} - ${errorMessage}`);
      
      // Return more details about the error depending on the API's response structure
      throw new Error(`Chutes API error: ${errorMessage}`);
    }

    // Return the data
    return response.data as T;
  }

  /**
   * Check if authentication is working
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.makeRequest<{ user: any }>("/users/me");
      return true;
    } catch (error) {
      console.error("Authentication check failed:", error);
      return false;
    }
  }

  /**
   * List all images
   */
  async listImages(): Promise<ChutesImage[]> {
    const response = await this.makeRequest<ChutesImage[]>("/images");
    
    // Validate and normalize response data
    return Array.isArray(response) 
      ? response.map(image => validateResponseData<ChutesImage>(
          image, 
          ['id', 'username', 'name', 'tag', 'created_at'],
          { public: false }
        ))
      : [];
  }

  /**
   * Get image details
   */
  async getImage(id: string): Promise<ChutesImage> {
    if (!id) throw new Error("Image ID must be provided");
    
    const image = await this.makeRequest<ChutesImage>(`/images/${id}`);
    
    // Validate the response
    return validateResponseData<ChutesImage>(
      image, 
      ['id', 'username', 'name', 'tag', 'created_at'],
      { public: false }
    );
  }

  /**
   * List all chutes
   */
  async listChutes(): Promise<ChutesChute[]> {
    const response = await this.makeRequest<ChutesChute[]>("/chutes");
    
    // Validate and normalize response data
    return Array.isArray(response) 
      ? response.map(chute => validateResponseData<ChutesChute>(
          chute, 
          ['id', 'username', 'name', 'image_id', 'created_at', 'status'],
          { public: false }
        ))
      : [];
  }

  /**
   * Get chute details
   */
  async getChute(id: string): Promise<ChutesChute> {
    if (!id) throw new Error("Chute ID must be provided");
    
    const chute = await this.makeRequest<ChutesChute>(`/chutes/${id}`);
    
    // Validate the response
    return validateResponseData<ChutesChute>(
      chute, 
      ['id', 'username', 'name', 'image_id', 'created_at', 'status'],
      { public: false }
    );
  }

  /**
   * Deploy a new chute
   */
  async deployChute(params: {
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
  }): Promise<ChutesChute> {
    // Validate required parameters
    if (!params.username) throw new Error("Username is required");
    if (!params.name) throw new Error("Chute name is required");
    if (!params.image_id) throw new Error("Image ID is required");
    if (!params.node_selector) throw new Error("Node selector is required");
    if (params.node_selector.gpu_count === undefined) 
      throw new Error("GPU count is required");
    if (params.node_selector.min_vram_gb_per_gpu === undefined) 
      throw new Error("Minimum VRAM per GPU is required");
    
    const chute = await this.makeRequest<ChutesChute>("/chutes", "POST", params);
    
    // Validate the response
    return validateResponseData<ChutesChute>(
      chute, 
      ['id', 'username', 'name', 'image_id', 'created_at', 'status'],
      { public: false }
    );
  }

  /**
   * Delete a chute
   */
  async deleteChute(id: string): Promise<boolean> {
    if (!id) throw new Error("Chute ID must be provided");
    
    try {
      await this.makeRequest<void>(`/chutes/${id}`, "DELETE");
      return true;
    } catch (error) {
      // Handle special case where a 404 might mean the chute is already deleted
      if (error instanceof Error && error.message.includes("404")) {
        console.warn(`Chute with ID ${id} not found (may already be deleted)`);
        return true;
      }
      throw error;
    }
  }

  /**
   * List available cords for a chute
   */
  async listCords(chuteId: string): Promise<ChutesCord[]> {
    if (!chuteId) throw new Error("Chute ID must be provided");
    
    const response = await this.makeRequest<ChutesCord[]>(`/chutes/${chuteId}/cords`);
    
    // Validate and normalize response data
    return Array.isArray(response) 
      ? response.map(cord => validateResponseData<ChutesCord>(
          cord, 
          ['name'],
          {}
        ))
      : [];
  }

  /**
   * Execute a cord function
   */
  async executeCord(chuteId: string, cordName: string, params: object): Promise<any> {
    if (!chuteId) throw new Error("Chute ID must be provided");
    if (!cordName) throw new Error("Cord name must be provided");
    if (!params || typeof params !== 'object') throw new Error("Parameters must be an object");
    
    // For cord execution, we might want a longer timeout since it could be a long-running operation
    const cordOptions: RequestOptions = {
      ...this.requestOptions,
      timeout: 60000, // 1 minute for cord execution
    };
    
    const url = `${this.baseUrl}/chutes/${chuteId}/cords/${cordName}`;
    const options: RequestInit = {
      method: "POST",
      headers: this.requestOptions.headers,
      body: JSON.stringify(params),
    };
    
    // Log the cord execution request
    ApiLogger.request("POST", url, { hasParams: true });
    
    // Execute the cord with enhanced error handling
    const response = await fetchWithRetry<any>(url, options, cordOptions);
    
    // Log the cord execution response
    ApiLogger.response("POST", url, response);
    
    if (!response.success) {
      const errorMessage = response.error?.message || "Unknown API error";
      throw new Error(`Cord execution failed: ${errorMessage}`);
    }
    
    return response.data;
  }
}
