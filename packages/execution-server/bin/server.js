#!/usr/bin/env node

const { MidsceneExecutionServer } = require('../dist/lib/server');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
    port: 3001,
    enableCors: true,
    enableWebSocket: true,
    maxConcurrentExecutions: 5,
    logLevel: 'info',
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
        case '--port':
        case '-p':
            config.port = parseInt(args[++i]) || 3001;
            break;
        case '--no-cors':
            config.enableCors = false;
            break;
        case '--no-websocket':
            config.enableWebSocket = false;
            break;
        case '--max-concurrent':
        case '-c':
            config.maxConcurrentExecutions = parseInt(args[++i]) || 5;
            break;
        case '--log-level':
        case '-l':
            const level = args[++i];
            if (['debug', 'info', 'warn', 'error'].includes(level)) {
                config.logLevel = level;
            }
            break;
        case '--help':
        case '-h':
            console.log(`
Midscene Execution Server

Usage: midscene-server [options]

Options:
  -p, --port <port>              Server port (default: 3001)
  -c, --max-concurrent <number>  Maximum concurrent executions (default: 5)
  -l, --log-level <level>        Log level: debug, info, warn, error (default: info)
  --no-cors                      Disable CORS
  --no-websocket                 Disable WebSocket support
  -h, --help                     Show this help message

Examples:
  midscene-server                               # Start with default settings
  midscene-server -p 8080 -c 10                # Custom port and max concurrent executions
  midscene-server --log-level debug --no-cors  # Debug mode without CORS
      `);
            process.exit(0);
            break;
        default:
            if (arg.startsWith('-')) {
                console.error(`Unknown option: ${arg}`);
                console.error('Use --help for usage information');
                process.exit(1);
            }
            break;
    }
}

// Start server
async function startServer() {
    try {
        console.log('Starting Midscene Execution Server...');
        console.log('Configuration:', JSON.stringify(config, null, 2));

        const server = new MidsceneExecutionServer(config);
        await server.start();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nReceived SIGINT, shutting down gracefully...');
            try {
                await server.stop();
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

        process.on('SIGTERM', async () => {
            console.log('\nReceived SIGTERM, shutting down gracefully...');
            try {
                await server.stop();
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
