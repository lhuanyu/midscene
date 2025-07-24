import type {
  ExecutionRequest,
  ExecutionStatus,
  DeviceInfo,
  ApiResponse,
  WebSocketMessage,
} from './types';

/**
 * Client SDK for Midscene Execution Server
 */
export class MidsceneExecutionClient {
  private baseUrl: string;
  private ws?: WebSocket;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    const result = await response.json() as ApiResponse;
    return result.data;
  }

  /**
   * Get connected Android devices
   */
  async getDevices(): Promise<DeviceInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/devices`);
    if (!response.ok) {
      throw new Error(`Failed to get devices: ${response.statusText}`);
    }
    const result = await response.json() as ApiResponse<DeviceInfo[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get devices');
    }
    return result.data || [];
  }

  /**
   * Start execution
   */
  async startExecution(request: ExecutionRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to start execution: ${response.statusText}`);
    }

    const result = await response.json() as ApiResponse<{ executionId: string }>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to start execution');
    }

    return result.data!.executionId;
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const response = await fetch(`${this.baseUrl}/api/execute/${executionId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get execution status: ${response.statusText}`);
    }

    const result = await response.json() as ApiResponse<ExecutionStatus>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get execution status');
    }

    return result.data!;
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/execute/${executionId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel execution: ${response.statusText}`);
    }

    const result = await response.json() as ApiResponse<{ cancelled: boolean }>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel execution');
    }

    return result.data!.cancelled;
  }

  /**
   * Get all executions
   */
  async getAllExecutions(): Promise<ExecutionStatus[]> {
    const response = await fetch(`${this.baseUrl}/api/executions`);
    if (!response.ok) {
      throw new Error(`Failed to get executions: ${response.statusText}`);
    }

    const result = await response.json() as ApiResponse<ExecutionStatus[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get executions');
    }

    return result.data || [];
  }

  /**
   * Get server statistics
   */
  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    const result = await response.json() as ApiResponse;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get stats');
    }

    return result.data;
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.baseUrl.replace(/^http/, 'ws');
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.emit(message.type, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.emit('disconnected', {});
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Subscribe to execution updates
   */
  subscribeToExecution(executionId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        executionId,
      }));
    }
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Wait for execution to complete
   */
  async waitForCompletion(
    executionId: string, 
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (status: ExecutionStatus) => void;
    } = {}
  ): Promise<ExecutionStatus> {
    const { pollInterval = 1000, timeout = 300000, onProgress } = options;
    const startTime = Date.now();

    while (true) {
      const status = await this.getExecutionStatus(executionId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (['completed', 'failed', 'cancelled'].includes(status.status)) {
        return status;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Execution timeout after ${timeout}ms`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Execute steps and wait for completion
   */
  async executeAndWait(
    request: ExecutionRequest,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (status: ExecutionStatus) => void;
    } = {}
  ): Promise<ExecutionStatus> {
    const executionId = await this.startExecution(request);
    return this.waitForCompletion(executionId, options);
  }
}
