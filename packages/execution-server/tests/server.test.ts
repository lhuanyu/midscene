import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MidsceneExecutionServer, MidsceneExecutionClient } from '../src';

describe('MidsceneExecutionServer', () => {
  let server: MidsceneExecutionServer;
  let client: MidsceneExecutionClient;
  const port = 3002; // Use different port for testing

  beforeAll(async () => {
    server = new MidsceneExecutionServer({
      port,
      logLevel: 'error', // Reduce noise in tests
    });
    await server.start();
    
    client = new MidsceneExecutionClient(`http://localhost:${port}`);
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should respond to health check', async () => {
    const health = await client.checkHealth();
    expect(health).toHaveProperty('status', 'healthy');
    expect(health).toHaveProperty('version');
    expect(health).toHaveProperty('uptime');
  });

  it('should get connected devices', async () => {
    const devices = await client.getDevices();
    expect(Array.isArray(devices)).toBe(true);
    // Note: This test may pass with empty array if no devices are connected
  });

  it('should get server statistics', async () => {
    const stats = await client.getStats();
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats).toHaveProperty('runningExecutions');
    expect(stats).toHaveProperty('uptime');
    expect(stats).toHaveProperty('memoryUsage');
  });

  it('should handle execution request validation', async () => {
    try {
      await client.startExecution({
        steps: [], // Empty steps should fail
      });
      expect.fail('Should have thrown an error for empty steps');
    } catch (error) {
      expect(error.message).toContain('steps array is required and must not be empty');
    }
  });

  it('should start execution with valid steps', async () => {
    // This test will fail if no device is connected, but demonstrates the API
    try {
      const executionId = await client.startExecution({
        steps: [
          { sleep: 1000 }, // Simple sleep step that doesn't require device interaction
        ],
        config: {
          generateReport: false,
          continueOnError: true,
        }
      });
      
      expect(typeof executionId).toBe('string');
      expect(executionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      
      // Check initial status
      const status = await client.getExecutionStatus(executionId);
      expect(status).toHaveProperty('id', executionId);
      expect(['pending', 'running']).toContain(status.status);
      
      // Cancel execution to cleanup
      await client.cancelExecution(executionId);
      
    } catch (error) {
      if (error.message.includes('No Android devices')) {
        console.warn('Skipping execution test - no Android devices connected');
      } else {
        throw error;
      }
    }
  });

  it('should return 404 for non-existent execution', async () => {
    try {
      await client.getExecutionStatus('non-existent-id');
      expect.fail('Should have thrown an error for non-existent execution');
    } catch (error) {
      expect(error.message).toContain('Execution not found');
    }
  });
});
