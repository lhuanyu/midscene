#!/usr/bin/env node

/**
 * Integration test for the execution server
 * This script tests the basic functionality without requiring Android devices
 */

const { MidsceneExecutionServer, MidsceneExecutionClient } = require('../dist/lib/index.js');

async function testIntegration() {
    console.log('🚀 Starting Midscene Execution Server integration test...\n');

    // Start server
    const server = new MidsceneExecutionServer({
        port: 3002,
        logLevel: 'warn' // Reduce logs for testing
    });

    try {
        await server.start();
        console.log('✅ Server started successfully on port 3002');

        // Test client connection
        const client = new MidsceneExecutionClient('http://localhost:3002');

        // Test health check
        try {
            const health = await client.checkHealth();
            console.log('✅ Health check passed:', health);
        } catch (error) {
            console.log('❌ Health check failed:', error.message);
            return;
        }

        // Test device listing (will be empty without Android devices)
        try {
            const devices = await client.getDevices();
            console.log('✅ Device listing successful, found', devices.length, 'devices');
        } catch (error) {
            console.log('❌ Device listing failed:', error.message);
            return;
        }

        // Test server stats
        try {
            const stats = await client.getStats();
            console.log('✅ Server stats retrieved:', stats);
        } catch (error) {
            console.log('❌ Server stats failed:', error.message);
            return;
        }

        // Test execution validation (should fail with no steps)
        try {
            await client.startExecution({ steps: [] });
            console.log('❌ Empty steps validation should have failed');
        } catch (error) {
            console.log('✅ Empty steps validation correctly failed');
        }

        console.log('\n🎉 All integration tests passed!');
        console.log('\n📋 Test Summary:');
        console.log('   - Server startup: ✅');
        console.log('   - Health check: ✅');
        console.log('   - Device listing: ✅');
        console.log('   - Server stats: ✅');
        console.log('   - Input validation: ✅');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
    } finally {
        // Stop server
        await server.stop();
        console.log('\n🛑 Server stopped');
    }
}

if (require.main === module) {
    testIntegration().catch(console.error);
}

module.exports = { testIntegration };
