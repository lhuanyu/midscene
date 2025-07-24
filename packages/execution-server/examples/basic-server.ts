/**
 * Basic server example
 * 
 * This example shows how to start a Midscene execution server
 * and handle basic operations.
 */

import { MidsceneExecutionServer } from '@midscene/execution-server';

async function startBasicServer() {
  console.log('Starting Midscene Execution Server...');
  
  // Create server with custom configuration
  const server = new MidsceneExecutionServer({
    port: 3001,
    enableCors: true,
    enableWebSocket: true,
    maxConcurrentExecutions: 3,
    logLevel: 'info'
  });

  try {
    // Start the server
    await server.start();
    console.log('✅ Server started successfully!');
    console.log('🔗 Health check: http://localhost:3001/health');
    console.log('📱 Devices API: http://localhost:3001/api/devices');
    console.log('🚀 Execute API: POST http://localhost:3001/api/execute');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await server.stop();
      console.log('✅ Server stopped gracefully');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startBasicServer();
