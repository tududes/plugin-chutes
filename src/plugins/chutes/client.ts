import {
  ChutesApiClient,
  ChutesChute,
  ChutesCord,
  ChutesImage,
  ChutesPluginConfig,
} from "./types.js";

/**
 * Client for interacting with the Chutes API
 */
export class ChutesClient implements ChutesApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ChutesPluginConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.chutes.ai";
  }

  /**
   * Helper method to make authenticated API requests
   */
  private async makeRequest<T>(
    endpoint: string,
    method: string = "GET",
    body?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chutes API error: ${response.status} - ${errorText}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error("Error calling Chutes API:", error);
      throw error;
    }
  }

  /**
   * Check if authentication is working
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.makeRequest<{ user: any }>("/users/me");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all images
   */
  async listImages(): Promise<ChutesImage[]> {
    return this.makeRequest<ChutesImage[]>("/images");
  }

  /**
   * Get image details
   */
  async getImage(id: string): Promise<ChutesImage> {
    return this.makeRequest<ChutesImage>(`/images/${id}`);
  }

  /**
   * List all chutes
   */
  async listChutes(): Promise<ChutesChute[]> {
    return this.makeRequest<ChutesChute[]>("/chutes");
  }

  /**
   * Get chute details
   */
  async getChute(id: string): Promise<ChutesChute> {
    return this.makeRequest<ChutesChute>(`/chutes/${id}`);
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
    return this.makeRequest<ChutesChute>("/chutes", "POST", params);
  }

  /**
   * Delete a chute
   */
  async deleteChute(id: string): Promise<boolean> {
    await this.makeRequest<void>(`/chutes/${id}`, "DELETE");
    return true;
  }

  /**
   * List available cords for a chute
   */
  async listCords(chuteId: string): Promise<ChutesCord[]> {
    return this.makeRequest<ChutesCord[]>(`/chutes/${chuteId}/cords`);
  }

  /**
   * Execute a cord function
   */
  async executeCord(chuteId: string, cordName: string, params: object): Promise<any> {
    return this.makeRequest<any>(`/chutes/${chuteId}/cords/${cordName}`, "POST", params);
  }
}
