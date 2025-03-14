/**
 * API Utilities for Robust API Integration
 * 
 * This module provides utilities for handling common API issues:
 * - Request timeouts
 * - Retry mechanisms
 * - Error handling
 * - Response validation
 * - Logging
 */

// Type for API response with generic data
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    status?: number;
    details?: any;
  };
  metrics?: {
    responseTime: number;
    retries: number;
    endpoint: string;
  };
}

/**
 * Options for API requests with timeout and retry settings
 */
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  validateStatus?: (status: number) => boolean;
  fallbackEndpoints?: string[];
}

/**
 * Default request options
 */
export const DEFAULT_REQUEST_OPTIONS: RequestOptions = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  validateStatus: (status: number) => status >= 200 && status < 300,
};

/**
 * Error class for API request timeouts
 */
export class ApiTimeoutError extends Error {
  constructor(message: string, public operationName?: string) {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

/**
 * Error class for API response errors
 */
export class ApiResponseError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
    public responseBody?: any
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

/**
 * Utility to execute a promise with a timeout
 * 
 * @param promise The promise to execute or a function that returns a promise and accepts an AbortSignal
 * @param timeoutMs Timeout in milliseconds
 * @param operationName Name of the operation for error messages
 * @returns Promise result
 * @throws ApiTimeoutError if the operation times out
 */
export function withTimeout<T>(
  promise: Promise<T> | ((signal?: AbortSignal) => Promise<T>),
  timeoutMs: number = DEFAULT_REQUEST_OPTIONS.timeout!,
  operationName: string = 'API Request'
): Promise<T> {
  // AbortController is used to cancel fetch requests
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  // Create a timeout error if needed
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ApiTimeoutError(
        `Operation "${operationName}" timed out after ${timeoutMs}ms`,
        operationName
      ));
    }, timeoutMs);
  });
  
  // Return the first promise to resolve/reject
  return Promise.race([
    typeof promise === 'function' ? promise(signal) : promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  }) as Promise<T>;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry, receives retry count and abort signal
 * @param options Retry options
 * @returns Promise with the function result
 */
export async function withRetry<T>(
  fn: (retryCount: number, signal?: AbortSignal) => Promise<T>,
  options: RequestOptions = DEFAULT_REQUEST_OPTIONS
): Promise<T & { _retries?: number }> {
  const maxRetries = options.retries ?? DEFAULT_REQUEST_OPTIONS.retries!;
  const initialDelay = options.retryDelay ?? DEFAULT_REQUEST_OPTIONS.retryDelay!;
  
  let lastError: any;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const controller = new AbortController();
      const result = await withTimeout<T>(
        (signal) => fn(retryCount, signal),
        options.timeout,
        `API request (attempt ${retryCount + 1}/${maxRetries + 1})`
      );
      
      // Add retry metadata to the result if it's an object
      if (result && typeof result === 'object') {
        (result as any)._retries = retryCount;
      }
      
      return result as T & { _retries?: number };
    } catch (error) {
      lastError = error;
      retryCount++;
      
      // Don't wait if we've used all retries
      if (retryCount > maxRetries) break;
      
      // Don't retry certain errors
      if (error instanceof ApiResponseError && error.status) {
        // Don't retry 4xx errors except for 408 (timeout) and 429 (rate limit)
        if (error.status >= 400 && error.status < 500 && 
            error.status !== 408 && error.status !== 429) {
          throw error;
        }
      }
      
      // Calculate backoff delay with exponential backoff + jitter
      const delay = initialDelay * Math.pow(2, retryCount - 1) * (0.8 + Math.random() * 0.4);
      
      // Log the retry attempt
      console.warn(
        `API request failed (attempt ${retryCount}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : error
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries have failed
  throw lastError;
}

/**
 * Make a fetch request with timeout, retries and error handling
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @param requestOptions Custom request options
 * @returns Response data
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  requestOptions: RequestOptions = DEFAULT_REQUEST_OPTIONS
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  let currentUrl = url;
  let retryAttempt = 0;
  let fallbackIndex = 0;
  
  // Use alternative endpoints if provided and main one fails
  const fallbackEndpoints = requestOptions.fallbackEndpoints || [];
  const allEndpoints = [url, ...fallbackEndpoints];
  
  return withRetry(async (retry, signal) => {
    retryAttempt = retry;
    
    // If retrying and fallbacks exist, use next fallback URL
    if (retry > 0 && fallbackEndpoints.length > 0) {
      fallbackIndex = retry % allEndpoints.length;
      currentUrl = allEndpoints[fallbackIndex];
      console.log(`Trying fallback endpoint ${fallbackIndex}: ${currentUrl}`);
    }
    
    // Add abort signal to fetch options
    const fetchOptions: RequestInit = {
      ...options,
      signal,
    };
    
    // Add custom headers if provided
    if (requestOptions.headers) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        ...requestOptions.headers,
      };
    }
    
    try {
      const response = await fetch(currentUrl, fetchOptions);
      const responseTime = Date.now() - startTime;
      
      // Validate status code
      const isValidStatus = requestOptions.validateStatus 
        ? requestOptions.validateStatus(response.status)
        : response.status >= 200 && response.status < 300;
      
      if (!isValidStatus) {
        let errorMessage: string;
        let errorDetails: any;
        
        try {
          errorDetails = await response.json();
          errorMessage = errorDetails.message || `HTTP Error ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          try {
            errorMessage = await response.text();
          } catch (textError) {
            errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
          }
        }
        
        throw new ApiResponseError(
          errorMessage,
          response.status,
          currentUrl,
          errorDetails
        );
      }
      
      // Parse response based on content type
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (response.status === 204) { // No content
        data = {} as T;
      } else {
        // For non-JSON responses, return text
        data = await response.text() as unknown as T;
      }
      
      return {
        success: true,
        data,
        metrics: {
          responseTime,
          retries: retryAttempt,
          endpoint: currentUrl,
        },
      };
      
    } catch (error) {
      // Format error for consistent handling
      if (error instanceof ApiResponseError) {
        return {
          success: false,
          error: {
            message: error.message,
            status: error.status,
            details: error.responseBody,
          },
          metrics: {
            responseTime: Date.now() - startTime,
            retries: retryAttempt,
            endpoint: currentUrl,
          },
        };
      } 
      
      if (error instanceof ApiTimeoutError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: 'TIMEOUT',
          },
          metrics: {
            responseTime: Date.now() - startTime,
            retries: retryAttempt,
            endpoint: currentUrl,
          },
        };
      }
      
      // Handle fetch cancellation (abort)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request was aborted',
            code: 'ABORTED',
          },
          metrics: {
            responseTime: Date.now() - startTime,
            retries: retryAttempt,
            endpoint: currentUrl,
          },
        };
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: {
            message: 'Network error: Unable to connect to the server',
            code: 'NETWORK_ERROR',
            details: error.message,
          },
          metrics: {
            responseTime: Date.now() - startTime,
            retries: retryAttempt,
            endpoint: currentUrl,
          },
        };
      }
      
      // Generic error handler
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'UNKNOWN_ERROR',
          details: error,
        },
        metrics: {
          responseTime: Date.now() - startTime,
          retries: retryAttempt,
          endpoint: currentUrl,
        },
      };
    }
  }, requestOptions) as Promise<ApiResponse<T>>;
}

/**
 * API logger helper functions
 */
export const ApiLogger = {
  request: (method: string, url: string, options?: any) => {
    console.log(`🌐 API Request: ${method} ${url}`, options ? { options } : '');
  },
  
  response: (method: string, url: string, response: ApiResponse<any>) => {
    if (response.success) {
      console.log(
        `✅ API Success: ${method} ${url} (${response.metrics?.responseTime}ms)`,
        { metrics: response.metrics }
      );
    } else {
      console.error(
        `❌ API Error: ${method} ${url} - ${response.error?.message}`,
        { error: response.error, metrics: response.metrics }
      );
    }
  },
  
  error: (method: string, url: string, error: any) => {
    console.error(`❌ API Exception: ${method} ${url}`, error);
  }
};

/**
 * Validate and normalize API response data against an expected schema
 * 
 * @param data Response data to validate
 * @param requiredKeys Array of required keys
 * @param defaultValues Default values for missing optional fields
 * @returns Normalized data
 */
export function validateResponseData<T>(
  data: any,
  requiredKeys: string[],
  defaultValues: Partial<T> = {}
): T {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response: expected an object');
  }
  
  // Check for required keys
  for (const key of requiredKeys) {
    if (data[key] === undefined) {
      throw new Error(`Missing required field in API response: ${key}`);
    }
  }
  
  // Merge with default values for any missing optional fields
  return { ...defaultValues, ...data } as T;
} 