/**
 * API Debugging Script for Chutes Plugin
 * 
 * This script provides a way to test and debug the Chutes API connectivity
 * outside of the main application. It implements comprehensive logging,
 * timeout handling, and error detection.
 */

import dotenv from 'dotenv';
import { ChutesClient } from '../plugins/chutes/client.js';
import { ChutesPluginConfig } from '../plugins/chutes/types.js';

// Configure environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logger utility
class Logger {
  static info(message: string): void {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
  }

  static success(message: string): void {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  }

  static error(message: string, error?: any): void {
    console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${colors.red}Details: ${error.message}${colors.reset}`);
        if (error.stack) {
          console.error(`${colors.red}Stack: ${error.stack}${colors.reset}`);
        }
      } else {
        console.error(`${colors.red}Details:${colors.reset}`, error);
      }
    }
  }

  static warn(message: string): void {
    console.warn(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
  }

  static debug(message: string, data?: any): void {
    console.log(`${colors.magenta}[DEBUG]${colors.reset} ${message}`);
    if (data) {
      console.log(data);
    }
  }

  static startTest(name: string): void {
    console.log(`\n${colors.cyan}===============================================${colors.reset}`);
    console.log(`${colors.cyan}[TEST] ${name}${colors.reset}`);
    console.log(`${colors.cyan}===============================================${colors.reset}\n`);
  }
}

// Timeout controller
class TimeoutController {
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([
      promise,
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId);
    }) as Promise<T>;
  }
}

// URL validator
class UrlValidator {
  static validateApiUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  static checkEndpointAccessibility(url: string, timeoutMs = 5000): Promise<boolean> {
    Logger.info(`Testing endpoint accessibility: ${url}`);
    return TimeoutController.withTimeout(
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            Logger.success(`Endpoint ${url} is accessible`);
            return true;
          } else {
            Logger.warn(`Endpoint ${url} returned status: ${response.status}`);
            return false;
          }
        })
        .catch(error => {
          Logger.error(`Failed to access ${url}`, error);
          return false;
        }),
      timeoutMs,
      `Test endpoint ${url}`
    );
  }
}

// Test runner
class ApiTester {
  private client: ChutesClient;
  private config: ChutesPluginConfig;
  private baseUrl: string;
  private defaultTimeout = 10000; // 10 seconds
  
  constructor() {
    const apiKey = process.env.CHUTES_API_KEY;
    if (!apiKey) {
      throw new Error("CHUTES_API_KEY environment variable is required");
    }
    
    this.baseUrl = process.env.CHUTES_API_BASE_URL || "https://api.chutes.ai";
    
    this.config = {
      apiKey,
      baseUrl: this.baseUrl,
    };
    
    this.client = new ChutesClient(this.config);
    
    Logger.info(`Initialized API tester with base URL: ${this.baseUrl}`);
  }
  
  async runTests(): Promise<void> {
    try {
      await this.testUrlValidation();
      await this.testAuthentication();
      await this.testListImages();
      await this.testListChutes();
      
      Logger.success("All tests completed");
    } catch (error) {
      Logger.error("Test suite failed", error);
    }
  }
  
  private async testUrlValidation(): Promise<void> {
    Logger.startTest("URL Validation");
    
    const isValid = UrlValidator.validateApiUrl(this.baseUrl);
    if (isValid) {
      Logger.success(`Base URL format is valid: ${this.baseUrl}`);
    } else {
      Logger.error(`Base URL format is invalid: ${this.baseUrl}`);
      throw new Error("Invalid base URL format");
    }
    
    // Check if base endpoint is accessible
    const isAccessible = await UrlValidator.checkEndpointAccessibility(this.baseUrl);
    if (!isAccessible) {
      Logger.warn("Base URL is not accessible, which may indicate connectivity issues");
    }
  }
  
  private async testAuthentication(): Promise<void> {
    Logger.startTest("Authentication");
    
    try {
      const isAuthenticated = await TimeoutController.withTimeout(
        this.client.checkAuth(),
        this.defaultTimeout,
        "Authentication check"
      );
      
      if (isAuthenticated) {
        Logger.success("Authentication successful");
      } else {
        Logger.error("Authentication failed");
        throw new Error("Authentication failed");
      }
    } catch (error) {
      Logger.error("Authentication test failed", error);
      throw error;
    }
  }
  
  private async testListImages(): Promise<void> {
    Logger.startTest("List Images");
    
    try {
      const images = await TimeoutController.withTimeout(
        this.client.listImages(),
        this.defaultTimeout,
        "List images"
      );
      
      Logger.success(`Successfully retrieved ${images.length} images`);
      Logger.debug("First few images:", images.slice(0, 2));
    } catch (error) {
      Logger.error("List images test failed", error);
      throw error;
    }
  }
  
  private async testListChutes(): Promise<void> {
    Logger.startTest("List Chutes");
    
    try {
      const chutes = await TimeoutController.withTimeout(
        this.client.listChutes(),
        this.defaultTimeout,
        "List chutes"
      );
      
      Logger.success(`Successfully retrieved ${chutes.length} chutes`);
      Logger.debug("First few chutes:", chutes.slice(0, 2));
    } catch (error) {
      Logger.error("List chutes test failed", error);
      throw error;
    }
  }
}

// Main execution
(async () => {
  Logger.info("Starting Chutes API debugging");
  
  try {
    const tester = new ApiTester();
    await tester.runTests();
  } catch (error) {
    Logger.error("API debugging failed", error);
    process.exit(1);
  }
})(); 