#!/usr/bin/env node

/**
 * Example script for external requests
 * This script demonstrates how to send requests to Midscene from an external system
 */

const http = require('http');

const DEFAULT_PORT = 3767; // Avoid conflict with bridge-mode's 3766 port
const DEFAULT_HOST = 'localhost';

function sendRequest(options = {}) {
    const {
        endpoint = '/test',
        status = 'success',
        data = {},
        port = DEFAULT_PORT,
        host = DEFAULT_HOST
    } = options;

    const postData = JSON.stringify({
        status,
        timestamp: Date.now(),
        ...data
    });

    const requestOptions = {
        hostname: host,
        port: port,
        path: endpoint,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(requestOptions, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`✅ Request sent to ${endpoint}`);
                console.log(`📄 Response: ${responseData}`);
                console.log(`🔢 Status Code: ${res.statusCode}`);
                resolve({ statusCode: res.statusCode, data: responseData });
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Request failed: ${error.message}`);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    function showHelp() {
        console.log(`
🚀 Midscene External Request Sender

Usage:
  node external-request.js [options]

Options:
  --endpoint <path>    Target endpoint path (default: /test)
  --status <status>    Request status: success|failure (default: success)
  --port <port>        Target port (default: 3767)
  --host <host>        Target host (default: localhost)
  --data <json>        Additional data as a JSON string
  --help               Show help information

Examples:
  # Send a success request
  node external-request.js --endpoint /approval --status success

  # Send a failure request
  node external-request.js --endpoint /approval --status failure

  # Send a request with data
  node external-request.js --endpoint /user-data --data '{"username":"test","role":"admin"}'

  # Send to a different port
  node external-request.js --endpoint /callback --port 3767
    `);
    }

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    // Parse command line arguments
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];

        switch (key) {
            case '--endpoint':
                options.endpoint = value;
                break;
            case '--status':
                options.status = value;
                break;
            case '--port':
                options.port = parseInt(value, 10);
                break;
            case '--host':
                options.host = value;
                break;
            case '--data':
                try {
                    options.data = JSON.parse(value);
                } catch (error) {
                    console.error(`❌ Invalid JSON data: ${value}`);
                    process.exit(1);
                }
                break;
            default:
                console.error(`❌ Unknown option: ${key}`);
                showHelp();
                process.exit(1);
        }
    }

    console.log(`🎯 Sending request...`);
    console.log(`📍 Endpoint: ${options.endpoint || '/test'}`);
    console.log(`📊 Status: ${options.status || 'success'}`);
    console.log(`🔌 Target: ${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`);

    sendRequest(options)
        .then(() => {
            console.log(`✨ Request sent successfully`);
            process.exit(0);
        })
        .catch((error) => {
            console.error(`💥 Sending failed:`, error.message);
            process.exit(1);
        });
}

module.exports = { sendRequest };
