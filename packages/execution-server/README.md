# @midscene/execution-server

Remote execution server for Midscene Android automation. This package provides a REST API and WebSocket interface for executing Midscene automation scripts remotely on Android devices.

## Features

- 🚀 **Remote Execution**: Execute Midscene automation scripts on Android devices via HTTP API
- 📊 **Real-time Progress**: WebSocket support for real-time execution updates
- 🔄 **Concurrent Execution**: Support for multiple concurrent automation sessions
- 📱 **Device Management**: Automatic detection and management of connected Android devices
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 📝 **Detailed Logging**: Configurable logging levels and execution reports
- ⚡ **Client SDK**: JavaScript/TypeScript client SDK for easy integration

## Installation

```bash
npm install @midscene/execution-server
```

## Quick Start

### 1. Start the Server

#### Using CLI (Recommended)

```bash
# Start with default settings
npx midscene-server

# Custom configuration
npx midscene-server --port 8080 --max-concurrent 10 --log-level debug
```

#### Using Code

```typescript
import { createServer } from '@midscene/execution-server';

async function startServer() {
  const server = await createServer({
    port: 3001,
    enableCors: true,
    enableWebSocket: true,
    maxConcurrentExecutions: 5,
    logLevel: 'info'
  });
  
  console.log('Server started on port 3001');
}

startServer();
```

### 2. Connect Android Device

Make sure you have an Android device connected via ADB:

```bash
# Check connected devices
adb devices

# Expected output:
# List of devices attached
# device_id    device
```

### 3. Execute Automation Scripts

#### Using REST API

```bash
# Start execution
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {"ai": "open browser and navigate to google.com"},
      {"aiInput": "Midscene", "locate": "search box"},
      {"aiTap": "search button"}
    ],
    "config": {
      "aiActionContext": "Close any popup dialogs",
      "generateReport": true
    }
  }'

# Response: {"success": true, "data": {"executionId": "uuid"}}

# Check status
curl http://localhost:3001/api/execute/{executionId}/status

# Cancel execution
curl -X POST http://localhost:3001/api/execute/{executionId}/cancel
```

#### Using Client SDK

```typescript
import { MidsceneExecutionClient } from '@midscene/execution-server';

async function runAutomation() {
  const client = new MidsceneExecutionClient('http://localhost:3001');
  
  // Check server health
  const health = await client.checkHealth();
  console.log('Server status:', health);
  
  // Get connected devices
  const devices = await client.getDevices();
  console.log('Connected devices:', devices);
  
  // Execute automation steps
  const executionId = await client.startExecution({
    deviceId: devices[0]?.udid, // Optional: use first device
    steps: [
      { ai: "open browser and navigate to google.com" },
      { aiInput: "Midscene", locate: "search box" },
      { aiTap: "search button" },
      { aiQuery: "string[], get search result titles" }
    ],
    config: {
      aiActionContext: "Close any popup dialogs",
      generateReport: true,
      continueOnError: false
    }
  });
  
  console.log('Execution started:', executionId);
  
  // Wait for completion with progress updates
  const result = await client.waitForCompletion(executionId, {
    onProgress: (status) => {
      console.log(`Progress: ${status.progress.percentage}% - ${status.progress.currentStep}`);
    }
  });
  
  console.log('Execution completed:', result);
  
  if (result.status === 'completed') {
    console.log('Results:', result.results);
    console.log('Report:', result.reportPath);
  } else {
    console.error('Execution failed:', result.error);
  }
}

runAutomation().catch(console.error);
```

#### Using WebSocket for Real-time Updates

```typescript
import { MidsceneExecutionClient } from '@midscene/execution-server';

async function runWithWebSocket() {
  const client = new MidsceneExecutionClient('http://localhost:3001');
  
  // Connect WebSocket
  await client.connectWebSocket();
  
  // Listen for events
  client.on('status_update', (message) => {
    console.log('Status update:', message.payload);
  });
  
  client.on('step_completed', (message) => {
    console.log('Step completed:', message.payload);
  });
  
  // Start execution
  const executionId = await client.startExecution({
    steps: [
      { ai: "open settings" },
      { aiTap: "wifi settings" }
    ]
  });
  
  // Subscribe to this execution
  client.subscribeToExecution(executionId);
  
  // Wait for completion
  const result = await client.waitForCompletion(executionId);
  console.log('Final result:', result);
  
  // Cleanup
  client.disconnectWebSocket();
}

runWithWebSocket().catch(console.error);
```

## API Reference

### REST API Endpoints

#### Server Information

- `GET /health` - Server health check
- `GET /api/stats` - Server statistics
- `GET /api/devices` - Get connected Android devices

#### Execution Management

- `POST /api/execute` - Start new execution
- `GET /api/execute/:id/status` - Get execution status
- `POST /api/execute/:id/cancel` - Cancel execution
- `GET /api/executions` - Get all executions
- `POST /api/executions/cleanup` - Clean up old executions

### TypeScript Types

```typescript
interface ExecutionRequest {
  deviceId?: string;                    // Target device ID (optional)
  steps: MidsceneYamlFlowItem[];       // Automation steps
  config?: ExecutionConfig;            // Execution configuration
}

interface ExecutionConfig {
  aiActionContext?: string;            // AI context prompt
  timeout?: number;                    // Execution timeout (ms)
  generateReport?: boolean;            // Generate HTML report
  continueOnError?: boolean;           // Continue on step failure
}

interface ExecutionStatus {
  id: string;                          // Execution ID
  status: ExecutionStatusType;         // Current status
  progress: ExecutionProgress;         // Progress information
  results?: ExecutionStepResult[];     // Step results
  error?: string;                      // Error message (if failed)
  reportPath?: string;                 // Report file path
  startTime: Date;                     // Start timestamp
  endTime?: Date;                      // End timestamp
  device?: DeviceInfo;                 // Device information
}

type ExecutionStatusType = 
  | 'pending'    // Waiting to start
  | 'running'    // Currently executing
  | 'completed'  // Successfully completed
  | 'failed'     // Failed with error
  | 'cancelled'; // Cancelled by user
```

### Supported Step Types

The execution server supports all Midscene automation steps:

```typescript
// Auto Planning
{ ai: "natural language description of actions" }

// Instant Actions
{ aiTap: "element description", deepThink?: boolean }
{ aiInput: "text to input", locate: "input field description", deepThink?: boolean }
{ aiKeyboardPress: "Enter", locate?: "element description", deepThink?: boolean }
{ aiScroll: { direction: "down", scrollType: "once" }, locate?: "element description" }

// Data Extraction
{ aiQuery: "data description and format", name?: "result name" }
{ aiAssert: "condition to verify" }

// Utility
{ sleep: 3000 }  // Wait in milliseconds
```

## Configuration

### Server Configuration

```typescript
interface ServerConfig {
  port: number;                        // Server port (default: 3001)
  enableCors: boolean;                 // Enable CORS (default: true)
  enableWebSocket: boolean;            // Enable WebSocket (default: true)
  maxConcurrentExecutions: number;     // Max parallel executions (default: 5)
  defaultTimeout: number;              // Default timeout ms (default: 300000)
  logLevel: 'debug' | 'info' | 'warn' | 'error';  // Log level (default: 'info')
}
```

### CLI Options

```bash
midscene-server [options]

Options:
  -p, --port <port>              Server port (default: 3001)
  -c, --max-concurrent <number>  Maximum concurrent executions (default: 5)
  -l, --log-level <level>        Log level: debug, info, warn, error (default: info)
  --no-cors                      Disable CORS
  --no-websocket                 Disable WebSocket support
  -h, --help                     Show help message
```

## Integration Examples

### With React Frontend

```tsx
import React, { useState, useEffect } from 'react';
import { MidsceneExecutionClient } from '@midscene/execution-server';

export function AutomationRunner() {
  const [client] = useState(() => new MidsceneExecutionClient());
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Load devices on mount
    client.getDevices().then(setDevices);
    
    // Setup WebSocket
    client.connectWebSocket().then(() => {
      client.on('status_update', (message) => {
        setStatus(message.payload);
      });
    });

    return () => client.disconnectWebSocket();
  }, []);

  const runAutomation = async () => {
    const executionId = await client.startExecution({
      deviceId: devices[0]?.udid,
      steps: [
        { ai: "open calculator app" },
        { aiTap: "number 2" },
        { aiTap: "plus button" },
        { aiTap: "number 3" },
        { aiTap: "equals button" },
        { aiQuery: "string, the calculation result" }
      ]
    });

    client.subscribeToExecution(executionId);
  };

  return (
    <div>
      <h2>Midscene Remote Execution</h2>
      <p>Connected Devices: {devices.length}</p>
      <button onClick={runAutomation}>Run Automation</button>
      {status && (
        <div>
          <p>Status: {status.status}</p>
          <p>Progress: {status.progress.percentage}%</p>
          <p>Current Step: {status.progress.currentStep}</p>
        </div>
      )}
    </div>
  );
}
```

### With Express.js Middleware

```typescript
import express from 'express';
import { MidsceneExecutionClient } from '@midscene/execution-server';

const app = express();
const client = new MidsceneExecutionClient('http://localhost:3001');

app.post('/automation/run', async (req, res) => {
  try {
    const { steps, deviceId } = req.body;
    
    const executionId = await client.startExecution({
      steps,
      deviceId,
      config: {
        generateReport: true,
        continueOnError: false
      }
    });
    
    res.json({ executionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/automation/:id/status', async (req, res) => {
  try {
    const status = await client.getExecutionStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Error Handling

```typescript
try {
  const result = await client.executeAndWait({
    steps: [{ ai: "invalid action" }]
  });
} catch (error) {
  if (error.message.includes('Device not found')) {
    console.error('Please connect an Android device');
  } else if (error.message.includes('timeout')) {
    console.error('Execution timed out');
  } else {
    console.error('Execution failed:', error.message);
  }
}
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Process Manager (PM2)

```json
{
  "name": "midscene-server",
  "script": "./bin/server.js",
  "args": ["--port", "3001", "--log-level", "info"],
  "instances": 1,
  "exec_mode": "fork",
  "env": {
    "NODE_ENV": "production"
  }
}
```

## License

MIT - See [LICENSE](../../LICENSE) file for details.

## Related

- [@midscene/android](../android) - Android automation library
- [@midscene/core](../core) - Core Midscene functionality
- [Midscene Documentation](https://midscenejs.com) - Full documentation
