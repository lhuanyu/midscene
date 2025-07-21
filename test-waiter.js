#!/usr/bin/env node

import { waitForExternalRequest } from '@midscene/core';

async function testWaitForRequest() {
    console.log('Testing waitForExternalRequest function...');

    try {
        // Start waiting, set a short timeout for testing
        console.log('Starting to wait for external request...');
        const result = await waitForExternalRequest({
            endpoint: '/test-confirm',
            timeout: 10000, // 10-second timeout
            expectedStatus: 'any',
            port: 3767
        });

        console.log('Request received successfully:', result);
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testWaitForRequest().catch(console.error);
