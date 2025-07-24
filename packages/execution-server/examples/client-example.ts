/**
 * Client example with real-time updates
 * 
 * This example demonstrates how to use the client SDK
 * to execute automation steps with WebSocket updates.
 */

import { MidsceneExecutionClient } from '@midscene/execution-server';

async function runClientExample() {
  const client = new MidsceneExecutionClient('http://localhost:3001');
  
  try {
    // Check if server is running
    console.log('🔍 Checking server health...');
    const health = await client.checkHealth();
    console.log('✅ Server is healthy:', health);
    
    // Get connected devices
    console.log('📱 Getting connected devices...');
    const devices = await client.getDevices();
    console.log(`Found ${devices.length} device(s):`, devices);
    
    if (devices.length === 0) {
      console.log('⚠️  No Android devices connected. Please connect a device and try again.');
      return;
    }
    
    // Connect WebSocket for real-time updates
    console.log('🔗 Connecting WebSocket...');
    await client.connectWebSocket();
    
    // Setup event listeners
    client.on('status_update', (message) => {
      const status = message.payload;
      console.log(`📊 Status: ${status.status} (${status.progress.percentage}%)`);
      if (status.progress.currentStep) {
        console.log(`   Current: ${status.progress.currentStep}`);
      }
    });
    
    client.on('step_completed', (message) => {
      const step = message.payload;
      console.log(`✅ Step ${step.stepIndex + 1} completed: ${step.type}`);
      if (step.data) {
        console.log(`   Result:`, step.data);
      }
    });
    
    // Define automation steps
    const steps = [
      { ai: "open calculator app" },
      { aiTap: "number 2" },
      { aiTap: "plus button" },
      { aiTap: "number 3" },
      { aiTap: "equals button" },
      { aiQuery: "string, the calculation result displayed" },
      { sleep: 2000 },
      { ai: "go back to home screen" }
    ];
    
    console.log(`🚀 Starting execution with ${steps.length} steps...`);
    
    // Start execution
    const executionId = await client.startExecution({
      deviceId: devices[0].udid,
      steps,
      config: {
        aiActionContext: "If any popup appears, close it first",
        generateReport: true,
        continueOnError: false
      }
    });
    
    console.log(`📋 Execution ID: ${executionId}`);
    
    // Subscribe to execution updates
    client.subscribeToExecution(executionId);
    
    // Wait for completion with timeout
    console.log('⏳ Waiting for execution to complete...');
    const result = await client.waitForCompletion(executionId, {
      timeout: 120000, // 2 minutes
      onProgress: (status) => {
        // Progress is already logged via WebSocket events
      }
    });
    
    // Handle results
    if (result.status === 'completed') {
      console.log('🎉 Execution completed successfully!');
      console.log('📄 Results:');
      result.results?.forEach((stepResult, index) => {
        console.log(`  Step ${index + 1}: ${stepResult.success ? '✅' : '❌'} ${stepResult.type}`);
        if (stepResult.data) {
          console.log(`    Data: ${JSON.stringify(stepResult.data)}`);
        }
        if (stepResult.error) {
          console.log(`    Error: ${stepResult.error}`);
        }
      });
      
      if (result.reportPath) {
        console.log(`📊 Report generated: ${result.reportPath}`);
      }
      
    } else if (result.status === 'failed') {
      console.error('❌ Execution failed:', result.error);
      
    } else if (result.status === 'cancelled') {
      console.log('🚫 Execution was cancelled');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    client.disconnectWebSocket();
  }
}

// Run the example
console.log('🎯 Midscene Client Example');
console.log('Make sure the execution server is running on http://localhost:3001');
console.log('');

runClientExample()
  .then(() => {
    console.log('✅ Example completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Example failed:', error);
    process.exit(1);
  });
