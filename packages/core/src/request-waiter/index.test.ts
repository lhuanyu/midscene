import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RequestWaiter, getRequestWaiter, waitForExternalRequest } from '../index';

describe('RequestWaiter', () => {
  let waiter: RequestWaiter;
  const testPort = 3767; // Use a different port to avoid conflicts

  beforeEach(() => {
    waiter = new RequestWaiter(testPort);
  });

  afterEach(async () => {
    await waiter.stopServer();
    waiter.clearPendingRequests();
  });

  describe('Basic functionality', () => {
    it('should be able to wait for and receive a success request', async () => {
      // Start waiting
      const waitPromise = waiter.waitForRequest({
        endpoint: '/test',
        timeout: 5000,
        expectedStatus: 'success'
      });

      // Simulate sending a request
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${testPort}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'success', data: { test: true } })
          });
          expect(response.ok).toBe(true);
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      const result = await waitPromise;
      expect(result.status).toBe('success');
      expect(result.data).toEqual({ status: 'success', data: { test: true } });
      expect(typeof result.timestamp).toBe('number');
    });

    it('should be able to wait for and receive a failure request', async () => {
      const waitPromise = waiter.waitForRequest({
        endpoint: '/test-failure',
        timeout: 5000,
        expectedStatus: 'failure'
      });

      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/test-failure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failure', reason: 'test failure' })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      const result = await waitPromise;
      expect(result.status).toBe('failure');
      expect(result.data.reason).toBe('test failure');
    });

    it('should throw an error on timeout', async () => {
      const waitPromise = waiter.waitForRequest({
        endpoint: '/timeout-test',
        timeout: 100
      });

      await expect(waitPromise).rejects.toThrow('Timeout waiting for request');
    });

    it('should support status from query parameters', async () => {
      const waitPromise = waiter.waitForRequest({
        endpoint: '/query-test',
        timeout: 5000,
        expectedStatus: 'success'
      });

      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/query-test?status=success`);
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      const result = await waitPromise;
      expect(result.status).toBe('success');
    });
  });

  describe('Status matching', () => {
    it('should only accept matching statuses', async () => {
      const waitPromise = waiter.waitForRequest({
        endpoint: '/status-match',
        timeout: 5000,
        expectedStatus: 'success'
      });

      // Send a failure request first (should be ignored)
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/status-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failure' })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      // Then send a success request (should be accepted)
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/status-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'success', data: { matched: true } })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 200);

      const result = await waitPromise;
      expect(result.status).toBe('success');
      expect(result.data.data.matched).toBe(true);
    });

    it('should accept any status when set to "any"', async () => {
      const waitPromise = waiter.waitForRequest({
        endpoint: '/any-status',
        timeout: 5000,
        expectedStatus: 'any'
      });

      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/any-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failure', data: { any: true } })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      const result = await waitPromise;
      expect(result.status).toBe('failure');
      expect(result.data.data.any).toBe(true);
    });
  });

  describe('Multiple waiters', () => {
    it('should support waiting for multiple different endpoints simultaneously', async () => {
      const wait1 = waiter.waitForRequest({
        endpoint: '/endpoint1',
        timeout: 5000
      });

      const wait2 = waiter.waitForRequest({
        endpoint: '/endpoint2',
        timeout: 5000
      });

      // Send requests to different endpoints
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/endpoint1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { endpoint: 1 } })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/endpoint2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { endpoint: 2 } })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 200);

      const [result1, result2] = await Promise.all([wait1, wait2]);
      expect(result1.data.data.endpoint).toBe(1);
      expect(result2.data.data.endpoint).toBe(2);
    });
  });

  describe('Event system', () => {
    it('should emit a request event', async () => {
      let eventReceived = false;
      let eventData: any;

      waiter.on('request', (event) => {
        eventReceived = true;
        eventData = event;
      });

      setTimeout(async () => {
        try {
          await fetch(`http://localhost:${testPort}/event-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { event: true } })
          });
        } catch (error) {
          console.log('Request failed (expected in test):', error);
        }
      }, 100);

      // Wait for a short period to ensure the event is triggered
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(eventReceived).toBe(true);
      expect(eventData.endpoint).toBe('/event-test');
      expect(eventData.result.data.data.event).toBe(true);
    });
  });
});

describe('Global instance functions', () => {
  afterEach(async () => {
    const globalWaiter = getRequestWaiter();
    await globalWaiter.stopServer();
    globalWaiter.clearPendingRequests();
  });

  it('getRequestWaiter should return a singleton instance', () => {
    const waiter1 = getRequestWaiter();
    const waiter2 = getRequestWaiter();
    expect(waiter1).toBe(waiter2);
  });

  it('waitForExternalRequest should use the global instance', async () => {
    const waitPromise = waitForExternalRequest({
      endpoint: '/global-test',
      timeout: 5000,
      port: 3767  // Update to the new default port
    });

    setTimeout(async () => {
      try {
        await fetch('http://localhost:3767/global-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ global: true })
        });
      } catch (error) {
        console.log('Request failed (expected in test):', error);
      }
    }, 100);

    const result = await waitPromise;
    expect(result.data.global).toBe(true);
  });
});
