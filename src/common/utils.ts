/**
 * Enhanced Utility functions for Eliza plugins
 *
 * This module provides improved validation and error handling utilities
 * to ensure robustness and reliability in API operations.
 */

import { ApiLogger } from "./api-utils.js";

/**
 * Error class for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate that an API key is provided
 */
export function validateApiKey(config: { apiKey: string }): void {
  if (!config.apiKey) {
    throw new ValidationError(
      "API key is required. Please set CHUTES_API_KEY environment variable.",
      "apiKey"
    );
  }
  
  // Check if API key has a reasonable format (not empty, not a placeholder)
  if (config.apiKey === "YOUR_API_KEY" || config.apiKey.trim().length < 8) {
    ApiLogger.error("CONFIG", "API Key", new ValidationError(
      "API key appears to be invalid or a placeholder. Please set a valid CHUTES_API_KEY.",
      "apiKey"
    ));
  }
}

/**
 * Validate a search query from user input
 */
export function validateSearchQuery(content: any): string {
  if (!content) {
    throw new ValidationError("Search content must be provided", "content");
  }
  
  if (typeof content.text !== "string" || !content.text.trim()) {
    throw new ValidationError("Search query must be a non-empty string", "text");
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
 * Create a rate limiter with token bucket algorithm
 * @param limit Maximum number of tokens (requests)
 * @param timeWindow Time in ms to refill tokens
 * @returns An object with functions to check and manage rate limits
 */
export function createRateLimiter(limit: number, timeWindow: number) {
  let tokens = limit;
  let lastRefill = Date.now();
  let totalThrottled = 0;
  
  return {
    /**
     * Check if a request can be made within the rate limit
     * @returns true if within limit, false if throttled
     */
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
      
      totalThrottled++;
      return false;
    },
    
    /**
     * Get rate limit metrics
     * @returns Current rate limit statistics
     */
    getMetrics: () => ({
      availableTokens: tokens,
      totalThrottled,
      timeSinceLastRefill: Date.now() - lastRefill,
      nextRefillMs: Math.max(0, timeWindow - (Date.now() - lastRefill)),
    }),
    
    /**
     * Reset the rate limiter to initial state
     */
    reset: () => {
      tokens = limit;
      lastRefill = Date.now();
      totalThrottled = 0;
    }
  };
}

/**
 * Validate a chute ID with enhanced checks
 */
export function validateChuteId(id: string): void {
  if (!id) {
    throw new ValidationError("Chute ID must be provided", "id");
  }
  
  if (typeof id !== "string") {
    throw new ValidationError(
      `Chute ID must be a string, got ${typeof id}`,
      "id"
    );
  }
  
  // Check if it looks like a UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const simpleIdPattern = /^[a-zA-Z0-9_-]+$/;
  
  if (!uuidPattern.test(id) && !simpleIdPattern.test(id)) {
    throw new ValidationError(
      "Invalid chute ID format. Should be a UUID or alphanumeric string with dashes/underscores.",
      "id"
    );
  }
  
  // If not UUID, also check length
  if (!uuidPattern.test(id)) {
    if (id.length < 3 || id.length > 64) {
      throw new ValidationError(
        "Chute ID must be between 3 and 64 characters if not a UUID",
        "id"
      );
    }
  }
}

/**
 * Validate a cord name
 */
export function validateCordName(name: string): void {
  if (!name) {
    throw new ValidationError("Cord name must be provided", "name");
  }
  
  if (typeof name !== "string") {
    throw new ValidationError(
      `Cord name must be a string, got ${typeof name}`,
      "name"
    );
  }
  
  // Only allow alphanumeric, underscore, dash
  const validNamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!validNamePattern.test(name)) {
    throw new ValidationError(
      "Cord name must contain only letters, numbers, underscores, and dashes",
      "name"
    );
  }
  
  if (name.length < 1 || name.length > 64) {
    throw new ValidationError(
      "Cord name must be between 1 and 64 characters",
      "name"
    );
  }
}

/**
 * Validate parameters for cord execution with enhanced checks
 */
export function validateParams(params: any): void {
  if (params === null || typeof params !== "object") {
    throw new ValidationError(
      `Parameters must be an object, got ${params === null ? 'null' : typeof params}`,
      "params"
    );
  }
  
  // Check for circular references which can cause JSON stringify to fail
  try {
    JSON.stringify(params);
  } catch (error) {
    throw new ValidationError(
      "Parameters contain circular references or cannot be serialized to JSON",
      "params"
    );
  }
}
