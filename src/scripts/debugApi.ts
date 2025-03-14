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
import { fetchWithRetry } from '../common/api-utils.js';

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
  private apiKey: string;
  private defaultTimeout = 10000; // 10 seconds
  
  constructor() {
    const apiKey = process.env.CHUTES_API_KEY;
    if (!apiKey) {
      throw new Error("CHUTES_API_KEY environment variable is required");
    }
    
    this.apiKey = apiKey;
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
      await this.testCheckDeveloperDeposit();
      await this.testListChutes();
      await this.testDirectEndpoints();
      
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
    Logger.startTest("Authentication Check");
    
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
  
  private async testCheckDeveloperDeposit(): Promise<void> {
    Logger.startTest("Developer Deposit Check");
    
    try {
      // Use direct fetch with retry to check developer deposit info
      const response = await fetchWithRetry(
        `${this.baseUrl}/developer_deposit`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.success) {
        Logger.success("Successfully retrieved developer deposit information");
        Logger.debug("Developer deposit details:", response.data);
      } else {
        Logger.warn("Failed to retrieve developer deposit info");
        Logger.debug("Response error:", response.error);
      }
    } catch (error) {
      Logger.error("Developer deposit check failed", error);
      // Don't throw here to continue other tests
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
      
      if (chutes.length > 0) {
        Logger.debug("First few chutes:", chutes.slice(0, 2));
        
        // If we have chutes, test getting details for the first one
        await this.testGetChuteDetails(chutes[0].id);
        
        // And test listing cords for it
        await this.testListCords(chutes[0].id);
      } else {
        Logger.info("No chutes found to test details or cords");
      }
    } catch (error) {
      Logger.error("List chutes test failed", error);
      // Continue with other tests
    }
  }
  
  private async testGetChuteDetails(chuteId: string): Promise<void> {
    Logger.startTest(`Get Chute Details (${chuteId})`);
    
    try {
      const chute = await TimeoutController.withTimeout(
        this.client.getChute(chuteId),
        this.defaultTimeout,
        `Get chute details for ${chuteId}`
      );
      
      Logger.success(`Successfully retrieved details for chute: ${chute.name}`);
      Logger.debug("Chute details:", {
        id: chute.id,
        name: chute.name,
        status: chute.status,
        created_at: chute.created_at
      });
    } catch (error) {
      Logger.error(`Get chute details test failed for ${chuteId}`, error);
    }
  }
  
  private async testListCords(chuteId: string): Promise<void> {
    Logger.startTest(`List Cords for Chute (${chuteId})`);
    
    try {
      const cords = await TimeoutController.withTimeout(
        this.client.listCords(chuteId),
        this.defaultTimeout,
        `List cords for chute ${chuteId}`
      );
      
      Logger.success(`Successfully retrieved ${cords.length} cords for chute`);
      
      if (cords.length > 0) {
        Logger.debug("Available cords:", cords.map(c => c.name));
      } else {
        Logger.info("No cords found for this chute");
      }
    } catch (error) {
      Logger.error(`List cords test failed for chute ${chuteId}`, error);
    }
  }
  
  private async testDirectEndpoints(): Promise<void> {
    Logger.startTest("Testing Direct API Endpoints");
    
    // Test endpoints from documentation
    const endpoints = [
      { path: '/users/me', description: 'Get user information' },
      { path: '/developer_deposit', description: 'Check developer deposit requirement' },
      { path: '/chutes', description: 'List chutes' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        Logger.info(`Testing endpoint: ${endpoint.path} (${endpoint.description})`);
        
        const response = await fetchWithRetry(
          `${this.baseUrl}${endpoint.path}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (response.success) {
          Logger.success(`Successfully accessed ${endpoint.path}`);
          Logger.debug(`Response metrics:`, response.metrics);
        } else {
          Logger.warn(`Failed to access ${endpoint.path}: ${response.error?.message}`);
        }
      } catch (error) {
        Logger.error(`Error testing ${endpoint.path}`, error);
      }
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