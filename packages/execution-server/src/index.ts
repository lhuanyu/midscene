export { ExecutionManager } from './execution-manager';
export { MidsceneExecutionServer } from './server';
export { MidsceneExecutionClient } from './client';
export type {
  ExecutionRequest,
  ExecutionConfig,
  ExecutionStatus,
  ExecutionStatusType,
  ExecutionProgress,
  ExecutionStepResult,
  DeviceInfo,
  WebSocketMessage,
  ServerConfig,
  ApiResponse,
} from './types';

// Import classes for use in utility functions
import { ExecutionManager } from './execution-manager';
import { MidsceneExecutionServer } from './server';

/**
 * Create and start a Midscene execution server with default configuration
 */
export async function createServer(config?: Partial<import('./types').ServerConfig>) {
  const server = new MidsceneExecutionServer(config);
  await server.start();
  return server;
}

/**
 * Create an execution manager instance
 */
export function createExecutionManager(config?: Partial<import('./types').ServerConfig>) {
  return new ExecutionManager(config);
}
