/**
 * Utility functions for Eliza plugins
 */

/**
 * Validate that an API key is provided
 */
export function validateApiKey(config: { apiKey: string }): void {
  if (!config.apiKey) {
    throw new Error("API key is required. Please set CHUTES_API_KEY environment variable.");
  }
}

/**
 * Validate a search query from user input
 */
export function validateSearchQuery(content: any): string {
  if (!content || typeof content.text !== "string" || !content.text.trim()) {
    throw new Error("Search query must be a non-empty string");
  }
  return content.text.trim();
}

/**
 * Handle errors from API calls
 */
export function handleApiError(error: unknown): { success: false; response: string } {
  console.error("API Error:", error);
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return {
    success: false,
    response: `Error: ${errorMessage}`,
  };
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: any[]): string {
  if (!results || results.length === 0) {
    return "No results found.";
  }
  
  return results.map((result, index) => {
    const title = result.title || `Result ${index + 1}`;
    const url = result.url || "";
    const snippet = result.snippet || result.content || "";
    
    return `
### ${title}

${snippet}

${url ? `URL: ${url}` : ""}
`;
  }).join("\n---\n");
}

/**
 * Create a rate limiter
 */
export function createRateLimiter(limit: number, timeWindow: number) {
  let tokens = limit;
  let lastRefill = Date.now();
  
  return {
    checkLimit: () => {
      const now = Date.now();
      const timePassed = now - lastRefill;
      
      // Refill tokens based on time passed
      if (timePassed > 0) {
        const refillAmount = Math.floor(timePassed / timeWindow) * limit;
        tokens = Math.min(limit, tokens + refillAmount);
        lastRefill = now;
      }
      
      if (tokens > 0) {
        tokens--;
        return true;
      }
      
      return false;
    },
  };
}

/**
 * Validate a chute ID
 */
export function validateChuteId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new Error("Chute ID must be provided");
  }
  
  // Check if it looks like a UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    // If not UUID, just check length
    if (id.length < 3 || id.length > 64) {
      throw new Error("Invalid chute ID format");
    }
  }
}

/**
 * Validate a cord name
 */
export function validateCordName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new Error("Cord name must be provided");
  }
  
  if (name.length < 1 || name.length > 64) {
    throw new Error("Cord name must be between 1 and 64 characters");
  }
}

/**
 * Validate parameters for cord execution
 */
export function validateParams(params: any): void {
  if (params === null || typeof params !== "object") {
    throw new Error("Parameters must be an object");
  }
}
