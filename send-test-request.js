#!/usr/bin/env node

// Simple request sender for testing the waitForRequest feature

const http = require('http');

const endpoint = process.argv[2] || '/test-confirm';
const status = process.argv[3] || 'success';
const port = process.argv[4] || 3767;

const postData = JSON.stringify({
    status: status,
    data: { message: 'Test confirmation from external script', timestamp: Date.now() }
});

const options = {
    hostname: 'localhost',
    port: port,
    path: endpoint,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log(`Sending ${status} request to http://localhost:${port}${endpoint}`);

const req = http.request(options, (res) => {
    console.log(`Response status: ${res.statusCode}`);
    console.log(`Response headers:`, res.headers);

    res.on('data', (chunk) => {
        console.log(`Response body: ${chunk}`);
    });

    res.on('end', () => {
        console.log('Request completed');
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.write(postData);
req.end();
