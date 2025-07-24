import type { MidsceneYamlFlowItem } from '@midscene/core';

/**
 * Execution request configuration
 */
export interface ExecutionRequest {
  /** Target Android device ID (optional, uses first available device if not specified) */
  deviceId?: string;
  /** Steps to execute */
  steps: MidsceneYamlFlowItem[];
  /** Execution configuration */
  config?: ExecutionConfig;
}

/**
 * Execution configuration options
 */
export interface ExecutionConfig {
  /** AI action context to provide background knowledge */
  aiActionContext?: string;
  /** Overall execution timeout in milliseconds */
  timeout?: number;
  /** Whether to generate execution report */
  generateReport?: boolean;
  /** Whether to continue execution on step failure */
  continueOnError?: boolean;
}

/**
 * Execution status and progress information
 */
export interface ExecutionStatus {
  /** Unique execution ID */
  id: string;
  /** Current execution status */
  status: ExecutionStatusType;
  /** Execution progress information */
  progress: ExecutionProgress;
  /** Execution results from each step */
  results?: ExecutionStepResult[];
  /** Error message if execution failed */
  error?: string;
  /** Path to generated report file */
  reportPath?: string;
  /** Execution start time */
  startTime: Date;
  /** Execution end time */
  endTime?: Date;
  /** Target device information */
  device?: DeviceInfo;
}

/**
 * Execution status types
 */
export type ExecutionStatusType = 
  | 'pending'    // Waiting to start
  | 'running'    // Currently executing
  | 'completed'  // Successfully completed
  | 'failed'     // Failed with error
  | 'cancelled'; // Cancelled by user

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  /** Current step index (0-based) */
  current: number;
  /** Total number of steps */
  total: number;
  /** Description of current step being executed */
  currentStep?: string;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Result from a single execution step
 */
export interface ExecutionStepResult {
  /** Step index (0-based) */
  stepIndex: number;
  /** Step type that was executed */
  type: string;
  /** Whether step completed successfully */
  success: boolean;
  /** Result data from step (for queries) */
  data?: any;
  /** Error message if step failed */
  error?: string;
  /** Step execution duration in milliseconds */
  duration?: number;
  /** Timestamp when step was executed */
  timestamp: Date;
}

/**
 * Android device information
 */
export interface DeviceInfo {
  /** Device unique identifier */
  udid: string;
  /** Device state (device, offline, etc.) */
  state: string;
  /** Device model information */
  model?: string;
  /** Device product information */
  product?: string;
  /** ADB connection port */
  port?: number;
}

/**
 * WebSocket message types for real-time updates
 */
export interface WebSocketMessage {
  /** Message type */
  type: 'status_update' | 'step_completed' | 'execution_completed' | 'error';
  /** Execution ID */
  executionId: string;
  /** Message payload */
  payload: any;
}

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Server port */
  port: number;
  /** Enable CORS */
  enableCors: boolean;
  /** Enable WebSocket for real-time updates */
  enableWebSocket: boolean;
  /** Maximum concurrent executions */
  maxConcurrentExecutions: number;
  /** Execution timeout in milliseconds */
  defaultTimeout: number;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Whether request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** Additional message */
  message?: string;
}
