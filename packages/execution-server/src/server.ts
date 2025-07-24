import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ExecutionManager } from './execution-manager';
import type {
  ExecutionRequest,
  ApiResponse,
  ServerConfig,
  WebSocketMessage,
} from './types';

/**
 * Midscene Execution Server
 * Provides REST API and WebSocket interface for remote Android automation
 */
export class MidsceneExecutionServer {
  private app: express.Application;
  private server: any;
  private wss?: WebSocketServer;
  private executionManager: ExecutionManager;
  private config: ServerConfig;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 3001,
      enableCors: true,
      enableWebSocket: true,
      maxConcurrentExecutions: 5,
      defaultTimeout: 300000,
      logLevel: 'info',
      ...config,
    };

    this.executionManager = new ExecutionManager(this.config);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventListeners();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Body parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }));
    }

    // Request logging
    this.app.use((req, res, next) => {
      this.log('info', `${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.log('error', 'Express error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      } as ApiResponse);
    });
  }

  /**
   * Setup REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          version: process.env.npm_package_version || '0.23.3',
          uptime: process.uptime(),
        },
      } as ApiResponse);
    });

    // Get connected devices
    this.app.get('/api/devices', async (req, res) => {
      try {
        const devices = await this.executionManager.getConnectedDevices();
        res.json({
          success: true,
          data: devices,
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Start execution
    this.app.post('/api/execute', async (req, res) => {
      try {
        const request: ExecutionRequest = req.body;
        
        // Validate request
        if (!request.steps || !Array.isArray(request.steps) || request.steps.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request: steps array is required and must not be empty',
          } as ApiResponse);
        }

        const executionId = await this.executionManager.startExecution(request);
        
        res.json({
          success: true,
          data: { executionId },
          message: 'Execution started successfully',
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Get execution status
    this.app.get('/api/execute/:id/status', (req, res) => {
      try {
        const executionId = req.params.id;
        const status = this.executionManager.getExecutionStatus(executionId);
        
        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Execution not found',
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: status,
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Cancel execution
    this.app.post('/api/execute/:id/cancel', async (req, res) => {
      try {
        const executionId = req.params.id;
        const cancelled = await this.executionManager.cancelExecution(executionId);
        
        res.json({
          success: true,
          data: { cancelled },
          message: cancelled ? 'Execution cancelled successfully' : 'Execution not found or not running',
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Get all executions
    this.app.get('/api/executions', (req, res) => {
      try {
        const executions = this.executionManager.getAllExecutions();
        res.json({
          success: true,
          data: executions,
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Clean up old executions
    this.app.post('/api/executions/cleanup', (req, res) => {
      try {
        const maxAge = req.body.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
        const cleaned = this.executionManager.cleanupOldExecutions(maxAge);
        
        res.json({
          success: true,
          data: { cleaned },
          message: `Cleaned up ${cleaned} old executions`,
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });

    // Server stats
    this.app.get('/api/stats', (req, res) => {
      try {
        const executions = this.executionManager.getAllExecutions();
        const stats = {
          totalExecutions: executions.length,
          runningExecutions: executions.filter(e => e.status === 'running').length,
          completedExecutions: executions.filter(e => e.status === 'completed').length,
          failedExecutions: executions.filter(e => e.status === 'failed').length,
          cancelledExecutions: executions.filter(e => e.status === 'cancelled').length,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        };

        res.json({
          success: true,
          data: stats,
        } as ApiResponse);
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
      }
    });
  }

  /**
   * Setup WebSocket server for real-time updates
   */
  private setupWebSocket(): void {
    if (!this.config.enableWebSocket) return;

    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      this.log('info', 'WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.log('debug', 'WebSocket message received:', data);
          
          // Handle client messages if needed
          if (data.type === 'subscribe' && data.executionId) {
            // Store subscription info in ws object
            (ws as any).subscribedExecutions = (ws as any).subscribedExecutions || [];
            (ws as any).subscribedExecutions.push(data.executionId);
          }
        } catch (error) {
          this.log('error', 'Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.log('info', 'WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        this.log('error', 'WebSocket error:', error);
      });
    });
  }

  /**
   * Setup event listeners for execution manager
   */
  private setupEventListeners(): void {
    this.executionManager.on('statusUpdate', (status) => {
      this.broadcastMessage({
        type: 'status_update',
        executionId: status.id,
        payload: status,
      });
    });

    this.executionManager.on('stepCompleted', (executionId, stepResult) => {
      this.broadcastMessage({
        type: 'step_completed',
        executionId,
        payload: stepResult,
      });
    });

    this.executionManager.on('progressUpdate', (status) => {
      this.broadcastMessage({
        type: 'status_update',
        executionId: status.id,
        payload: status,
      });
    });
  }

  /**
   * Broadcast message to WebSocket clients
   */
  private broadcastMessage(message: WebSocketMessage): void {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serverInstance = this.server || this.app;
        
        serverInstance.listen(this.config.port, () => {
          this.log('info', `Midscene Execution Server running on port ${this.config.port}`);
          this.log('info', `Health check: http://localhost:${this.config.port}/health`);
          this.log('info', `API base URL: http://localhost:${this.config.port}/api`);
          if (this.config.enableWebSocket) {
            this.log('info', `WebSocket URL: ws://localhost:${this.config.port}`);
          }
          resolve();
        });

        serverInstance.on('error', (error: Error) => {
          this.log('error', 'Server error:', error);
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
      }
      
      const serverInstance = this.server || this.app;
      if (serverInstance && serverInstance.close) {
        serverInstance.close(() => {
          this.log('info', 'Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Log with configured level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [MidsceneServer] ${message}`, ...args);
    }
  }
}
