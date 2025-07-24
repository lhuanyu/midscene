import { AndroidAgent, AndroidDevice, getConnectedDevices } from '@midscene/android';
import type { MidsceneYamlFlowItem } from '@midscene/core';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'node:events';
import type {
  ExecutionRequest,
  ExecutionStatus,
  ExecutionStatusType,
  ExecutionStepResult,
  DeviceInfo,
  ServerConfig,
} from './types';

/**
 * Manages multiple execution sessions
 */
export class ExecutionManager extends EventEmitter {
  private executions = new Map<string, ExecutionStatus>();
  private runningAgents = new Map<string, AndroidAgent>();
  private config: ServerConfig;

  constructor(config: Partial<ServerConfig> = {}) {
    super();
    this.config = {
      port: 3001,
      enableCors: true,
      enableWebSocket: true,
      maxConcurrentExecutions: 5,
      defaultTimeout: 300000, // 5 minutes
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Start a new execution
   */
  async startExecution(request: ExecutionRequest): Promise<string> {
    // Check concurrent execution limit
    const runningCount = Array.from(this.executions.values())
      .filter(status => status.status === 'running').length;
    
    if (runningCount >= this.config.maxConcurrentExecutions) {
      throw new Error(`Maximum concurrent executions limit reached (${this.config.maxConcurrentExecutions})`);
    }

    const executionId = uuidv4();
    
    const status: ExecutionStatus = {
      id: executionId,
      status: 'pending',
      progress: {
        current: 0,
        total: request.steps.length,
        percentage: 0,
      },
      startTime: new Date(),
    };
    
    this.executions.set(executionId, status);
    this.emit('executionCreated', status);
    
    // Start execution asynchronously
    this.executeSteps(executionId, request).catch(error => {
      this.log('error', `Execution ${executionId} failed:`, error);
      this.updateExecutionStatus(executionId, 'failed', { error: error.message });
    });
    
    return executionId;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionStatus | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): ExecutionStatus[] {
    return Array.from(this.executions.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const status = this.executions.get(executionId);
    if (!status || status.status !== 'running') {
      return false;
    }

    this.updateExecutionStatus(executionId, 'cancelled');

    // Clean up running agent
    const agent = this.runningAgents.get(executionId);
    if (agent) {
      try {
        // Note: AndroidAgent doesn't have a direct stop method
        // This is where you might add cleanup logic if needed
        this.runningAgents.delete(executionId);
      } catch (error) {
        this.log('error', `Error stopping agent for execution ${executionId}:`, error);
      }
    }

    return true;
  }

  /**
   * Get connected Android devices
   */
  async getConnectedDevices(): Promise<DeviceInfo[]> {
    try {
      const devices = await getConnectedDevices();
      return devices.map(device => ({
        udid: device.udid,
        state: device.state,
        port: device.port,
      }));
    } catch (error) {
      this.log('error', 'Failed to get connected devices:', error);
      throw new Error('Failed to get connected devices');
    }
  }

  /**
   * Clean up old executions
   */
  cleanupOldExecutions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [executionId, status] of this.executions.entries()) {
      if (status.endTime && status.endTime < cutoffTime) {
        this.executions.delete(executionId);
        cleaned++;
      }
    }

    this.log('info', `Cleaned up ${cleaned} old executions`);
    return cleaned;
  }

  /**
   * Execute steps for a specific execution
   */
  private async executeSteps(executionId: string, request: ExecutionRequest): Promise<void> {
    const status = this.executions.get(executionId)!;
    
    try {
      this.updateExecutionStatus(executionId, 'running');
      
      // Get target device
      const devices = await getConnectedDevices();
      const targetDevice = request.deviceId 
        ? devices.find(d => d.udid === request.deviceId)
        : devices[0];
        
      if (!targetDevice) {
        throw new Error(
          request.deviceId 
            ? `Device with ID '${request.deviceId}' not found`
            : 'No Android devices connected'
        );
      }

      // Update device info
      status.device = {
        udid: targetDevice.udid,
        state: targetDevice.state,
        port: targetDevice.port,
      };

      // Create Android Agent
      const device = new AndroidDevice(targetDevice.udid);
      const agent = new AndroidAgent(device, {
        aiActionContext: request.config?.aiActionContext,
        generateReport: request.config?.generateReport !== false,
      });
      
      this.runningAgents.set(executionId, agent);
      await device.connect();

      const results: ExecutionStepResult[] = [];

      // Execute steps one by one
      for (let i = 0; i < request.steps.length; i++) {
        // Check if execution was cancelled
        const currentStatus = this.executions.get(executionId);
        if (currentStatus?.status === 'cancelled') {
          break;
        }

        const step = request.steps[i];
        const stepStartTime = new Date();
        
        // Update progress
        this.updateExecutionProgress(executionId, i, this.getStepDescription(step));

        try {
          this.log('info', `Executing step ${i + 1}/${request.steps.length} for ${executionId}:`, this.getStepDescription(step));
          
          const result = await this.executeStep(agent, step);
          const stepResult: ExecutionStepResult = {
            stepIndex: i,
            type: this.getStepType(step),
            success: true,
            data: result.data,
            duration: Date.now() - stepStartTime.getTime(),
            timestamp: stepStartTime,
          };
          
          results.push(stepResult);
          this.emit('stepCompleted', executionId, stepResult);
          
        } catch (stepError) {
          this.log('error', `Step ${i + 1} failed for execution ${executionId}:`, stepError);
          
          const stepResult: ExecutionStepResult = {
            stepIndex: i,
            type: this.getStepType(step),
            success: false,
            error: stepError instanceof Error ? stepError.message : String(stepError),
            duration: Date.now() - stepStartTime.getTime(),
            timestamp: stepStartTime,
          };
          
          results.push(stepResult);
          this.emit('stepCompleted', executionId, stepResult);
          
          // Stop execution if continueOnError is false
          if (!request.config?.continueOnError) {
            throw stepError;
          }
        }
      }

      // Update final status
      status.results = results;
      status.reportPath = agent.reportFile || undefined;
      this.updateExecutionStatus(executionId, 'completed');
      
      this.log('info', `Execution ${executionId} completed successfully`);

    } catch (error) {
      this.updateExecutionStatus(executionId, 'failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    } finally {
      this.runningAgents.delete(executionId);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(agent: AndroidAgent, step: MidsceneYamlFlowItem): Promise<{ type: string; data?: any }> {
    if ('aiAction' in step || 'ai' in step) {
      const actionStep = step as any;
      const prompt = actionStep.aiAction || actionStep.ai;
      if (!prompt) {
        throw new Error('ai step requires an aiAction or ai parameter');
      }
      await agent.aiAction(prompt, {
        cacheable: actionStep.cacheable,
      });
      return { type: 'aiAction' };
    } else if ('aiTap' in step) {
      await agent.aiTap(step.aiTap, step);
      return { type: 'aiTap' };
    } else if ('aiInput' in step) {
      if (!step.locate) {
        throw new Error('aiInput step requires a locate parameter');
      }
      await agent.aiInput(step.aiInput, step.locate, step);
      return { type: 'aiInput' };
    } else if ('aiQuery' in step) {
      const result = await agent.aiQuery(step.aiQuery);
      return { type: 'aiQuery', data: result };
    } else if ('aiAssert' in step) {
      await agent.aiAssert(step.aiAssert);
      return { type: 'aiAssert' };
    } else if ('aiKeyboardPress' in step) {
      await agent.aiKeyboardPress(step.aiKeyboardPress, step.locate, step);
      return { type: 'aiKeyboardPress' };
    } else if ('aiScroll' in step) {
      if (!step.aiScroll) {
        throw new Error('aiScroll step requires scroll parameters');
      }
      await agent.aiScroll(step.aiScroll, step.locate, step);
      return { type: 'aiScroll' };
    } else if ('sleep' in step) {
      await new Promise(resolve => setTimeout(resolve, step.sleep));
      return { type: 'sleep' };
    }
    
    throw new Error(`Unsupported step type: ${JSON.stringify(step)}`);
  }

  /**
   * Get step type name
   */
  private getStepType(step: MidsceneYamlFlowItem): string {
    if ('ai' in step) return 'aiAction';
    if ('aiTap' in step) return 'aiTap';
    if ('aiInput' in step) return 'aiInput';
    if ('aiQuery' in step) return 'aiQuery';
    if ('aiAssert' in step) return 'aiAssert';
    if ('aiKeyboardPress' in step) return 'aiKeyboardPress';
    if ('aiScroll' in step) return 'aiScroll';
    if ('sleep' in step) return 'sleep';
    return 'unknown';
  }

  /**
   * Get human-readable step description
   */
  private getStepDescription(step: MidsceneYamlFlowItem): string {
    if ('ai' in step) return `Execute action: ${step.ai}`;
    if ('aiTap' in step) return `Tap: ${step.aiTap}`;
    if ('aiInput' in step) return `Input: ${step.aiInput}`;
    if ('aiQuery' in step) return `Query: ${step.aiQuery}`;
    if ('aiAssert' in step) return `Assert: ${step.aiAssert}`;
    if ('aiKeyboardPress' in step) return `Press key: ${step.aiKeyboardPress}`;
    if ('aiScroll' in step) return `Scroll: ${JSON.stringify(step.aiScroll)}`;
    if ('sleep' in step) return `Sleep: ${step.sleep}ms`;
    return 'Unknown step';
  }

  /**
   * Update execution status
   */
  private updateExecutionStatus(
    executionId: string, 
    status: ExecutionStatusType, 
    updates: Partial<ExecutionStatus> = {}
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      execution.endTime = new Date();
    }

    Object.assign(execution, updates);
    this.emit('statusUpdate', execution);
  }

  /**
   * Update execution progress
   */
  private updateExecutionProgress(executionId: string, currentStep: number, stepDescription?: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.progress.current = currentStep + 1;
    execution.progress.percentage = Math.round((currentStep + 1) / execution.progress.total * 100);
    execution.progress.currentStep = stepDescription;

    this.emit('progressUpdate', execution);
  }

  /**
   * Log with configured level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      console[level](`[ExecutionManager] ${message}`, ...args);
    }
  }
}
