import { EventEmitter } from 'events';
import type { Server } from 'http';
import { createServer } from 'http';
import { parse as parseUrl } from 'url';

export interface WaitForRequestOptions {
  endpoint: string;
  timeout?: number;
  expectedStatus?: 'success' | 'failure' | 'any';
  port?: number;
}

export interface RequestResult {
  status: 'success' | 'failure';
  data?: any;
  timestamp: number;
}

export interface RequestWaiterEvent {
  endpoint: string;
  result: RequestResult;
}

/**
 * RequestWaiter - Waits for requests from external terminals
 * Defaults to port 3767 to avoid conflict with bridge-mode (3766)
 */
export class RequestWaiter extends EventEmitter {
  private server: Server | null = null;
  private port: number;
  private isListening = false;
  private pendingRequests = new Map<string, {
    resolve: (result: RequestResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    expectedStatus?: 'success' | 'failure' | 'any';
  }>();

  constructor(port = 3767) { // Changed to 3767 to avoid conflict with bridge-mode's 3766
    super();
    this.port = port;
  }

  /**
   * Starts the HTTP server to listen for requests
   */
  private async startServer(): Promise<void> {
    if (this.isListening) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const parsedUrl = parseUrl(req.url || '', true);
        const endpoint = parsedUrl.pathname || '';

        // Collect request body data
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            let requestData: any = {};
            if (body) {
              try {
                requestData = JSON.parse(body);
              } catch {
                requestData = { rawBody: body };
              }
            }

            // Get status from query parameters or request body
            const status = parsedUrl.query.status as string || 
                          requestData.status || 
                          (req.method === 'POST' ? 'success' : 'success');

            const result: RequestResult = {
              status: status === 'failure' ? 'failure' : 'success',
              data: requestData,
              timestamp: Date.now()
            };

            // Handle pending requests
            this.handleIncomingRequest(endpoint, result);

            // Respond to the client
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              received: true, 
              endpoint,
              timestamp: result.timestamp 
            }));

          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request' }));
          }
        });
      });

      this.server.listen(this.port, () => {
        this.isListening = true;
        console.log(`[RequestWaiter] Server listening on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Handles incoming requests
   */
  private handleIncomingRequest(endpoint: string, result: RequestResult): void {
    const pendingRequest = this.pendingRequests.get(endpoint);
    
    if (pendingRequest) {
      const { resolve, expectedStatus, timeout } = pendingRequest;
      
      // Check if the status matches the expectation
      if (expectedStatus && expectedStatus !== 'any' && expectedStatus !== result.status) {
        // Status mismatch, continue waiting
        console.log(`[RequestWaiter] Status mismatch for ${endpoint}. Expected: ${expectedStatus}, Got: ${result.status}`);
        return;
      }

      // Clear the timeout timer
      clearTimeout(timeout);
      this.pendingRequests.delete(endpoint);
      
      // Resolve the promise
      resolve(result);
      
      console.log(`[RequestWaiter] Request resolved for ${endpoint}:`, result);
    }

    // Emit an event (regardless of whether there was a pending request)
    this.emit('request', { endpoint, result } as RequestWaiterEvent);
  }

  /**
   * Waits for a request to a specific endpoint
   */
  async waitForRequest(options: WaitForRequestOptions): Promise<RequestResult> {
    const { endpoint, timeout = 30000, expectedStatus = 'any' } = options;

    // Ensure the server is running
    await this.startServer();

    return new Promise<RequestResult>((resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(endpoint);
        reject(new Error(`Timeout waiting for request to ${endpoint} after ${timeout}ms`));
      }, timeout);

      // Store the pending request
      this.pendingRequests.set(endpoint, {
        resolve,
        reject,
        timeout: timeoutId,
        expectedStatus
      });

      console.log(`[RequestWaiter] Waiting for request to ${endpoint} with expected status: ${expectedStatus}`);
    });
  }

  /**
   * Stops the server
   */
  async stopServer(): Promise<void> {
    if (!this.server || !this.isListening) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isListening = false;
        this.server = null;
        console.log(`[RequestWaiter] Server stopped`);
        resolve();
      });
    });
  }

  /**
   * Clears all pending requests
   */
  clearPendingRequests(): void {
    for (const [endpoint, { timeout, reject }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error(`Request waiting for ${endpoint} was cancelled`));
    }
    this.pendingRequests.clear();
  }

  /**
   * Gets the list of currently pending endpoints
   */
  getPendingEndpoints(): string[] {
    return Array.from(this.pendingRequests.keys());
  }
}

// Global instance
let globalRequestWaiter: RequestWaiter | null = null;

/**
 * Gets the global RequestWaiter instance
 */
export function getRequestWaiter(port?: number): RequestWaiter {
  if (!globalRequestWaiter) {
    globalRequestWaiter = new RequestWaiter(port);
  }
  return globalRequestWaiter;
}

/**
 * Convenience function to wait for an external request
 */
export async function waitForExternalRequest(options: WaitForRequestOptions): Promise<RequestResult> {
  const waiter = getRequestWaiter(options.port);
  return await waiter.waitForRequest(options);
}
