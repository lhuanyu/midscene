# Wait for External Request Feature (waitForRequest)

## Overview

The `waitForRequest` feature allows Midscene test workflows to pause during execution and wait for external systems to send HTTP requests to determine whether to continue to the next step. This is very useful for scenarios that require manual intervention, external system confirmation, or complex integration testing.

## Design Principles

1. **HTTP Server Listening**: Start an HTTP server on a specified port to listen for external requests
2. **Endpoint Matching**: Match incoming requests based on configured endpoint paths
3. **Status Checking**: Support checking success/failure status of requests
4. **Timeout Handling**: Support configurable timeout to avoid infinite waiting
5. **Result Passing**: Can pass data from external requests to subsequent steps

## Configuration Format

### YAML Configuration

```yaml
tasks:
  - name: "Wait for external system confirmation"
    flow:
      - waitForRequest:
          endpoint: "/approval"           # Required: endpoint path to listen for
          timeout: 30000                 # Optional: timeout in milliseconds, default 30 seconds
          expectedStatus: "success"      # Optional: expected status success|failure|any, default any
          port: 3767                     # Optional: listening port, default 3767
        name: "approval_result"          # Optional: result storage name
      
      - aiAction: "Click submit button"  # Continue execution after receiving confirmation
```

### JavaScript API

```typescript
import { waitForExternalRequest } from '@midscene/core';

// Basic usage
const result = await waitForExternalRequest({
  endpoint: '/approval',
  timeout: 30000,
  expectedStatus: 'success'
});

console.log('External request received:', result);
// { status: 'success', data: {...}, timestamp: 1672531200000 }
```

## External System Integration

External systems can trigger waiting workflows to continue through HTTP requests:

### Success Requests

```bash
# GET request (defaults to success)
curl "http://localhost:3767/approval"

# POST request explicitly specifying success
curl -X POST "http://localhost:3767/approval" \
  -H "Content-Type: application/json" \
  -d '{"status": "success", "data": {"approved_by": "admin"}}'

# GET request specifying status via query parameters
curl "http://localhost:3767/approval?status=success"
```

### Failure Requests

```bash
# POST request specifying failure
curl -X POST "http://localhost:3767/approval" \
  -H "Content-Type: application/json" \
  -d '{"status": "failure", "reason": "insufficient permissions"}'

# GET request specifying failure via query parameters
curl "http://localhost:3767/approval?status=failure"
```

## Use Cases

### 1. Manual Approval Workflow

```yaml
# Test scenario: Order requires manual approval
tasks:
  - name: "Order approval test"
    flow:
      - aiAction: "Fill order information"
      - aiAction: "Submit order"
      - aiAssert: "Order status shows 'Pending Approval'"
      
      # Wait for manual approval
      - waitForRequest:
          endpoint: "/order-approval"
          timeout: 300000  # 5 minute timeout
          expectedStatus: "success"
        name: "approval_result"
      
      - aiAssert: "Order status shows 'Approved'"
```

### 2. External System Integration

```yaml
# Test scenario: Wait for external payment system callback
tasks:
  - name: "Payment callback test"
    flow:
      - aiAction: "Click pay button"
      - aiAssert: "Redirect to payment page"
      
      # Wait for payment system callback
      - waitForRequest:
          endpoint: "/payment-callback"
          timeout: 60000
          expectedStatus: "any"  # Accept success or failure
        name: "payment_result"
      
      # Continue different flows based on payment result
      - aiAssert: "Payment status displays correctly"
```

### 3. Test Data Preparation

```yaml
# Test scenario: Wait for test data preparation completion
tasks:
  - name: "Data dependency test"
    flow:
      # Wait for external script to prepare test data
      - waitForRequest:
          endpoint: "/data-ready"
          timeout: 120000
          expectedStatus: "success"
        name: "data_prep_result"
      
      - aiAction: "Start test workflow"
```

## Advanced Usage

### 1. Using Result Data

```yaml
flow:
  - waitForRequest:
      endpoint: "/user-info"
      expectedStatus: "success"
    name: "user_data"
  
  # Use returned data
  - aiInput: 
      locate: "Username input field"
      value: "${user_data.data.username}"
```

### 2. Error Handling

```yaml
flow:
  - waitForRequest:
      endpoint: "/approval"
      timeout: 30000
      expectedStatus: "success"
    name: "approval"
    onError: "continue"  # Continue execution on failure
  
  - aiAssert: "Display timeout message"
```

## Security Considerations

1. **Port Security**: Only listens on local port (127.0.0.1) by default
2. **CORS Settings**: Supports cross-origin requests for external system calls
3. **Request Validation**: Recommend adding authentication in production environments
4. **Timeout Protection**: Avoids infinite waiting that could cause resource occupation

## Troubleshooting

### Common Issues

1. **Port Already in Use**: 
   - Check if port is occupied by other processes
   - Use a different port number

2. **Timeout Errors**:
   - Check if external system is sending requests correctly
   - Increase timeout duration
   - Check network connection

3. **Status Mismatch**:
   - Confirm external system sends correct status values
   - Use "any" status for debugging

### Debugging Methods

1. **Enable Verbose Logging**:
```bash
MIDSCENE_DEBUG=1 npm run test
```

2. **Check Server Status**:
```bash
curl -v http://localhost:3767/health
```

3. **Monitor Requests**:
```typescript
import { getRequestWaiter } from '@midscene/core';

const waiter = getRequestWaiter();
waiter.on('request', (event) => {
  console.log('Request received:', event);
});
```

## API参考

### WaitForRequestOptions

```typescript
interface WaitForRequestOptions {
  endpoint: string;              // 监听的端点路径
  timeout?: number;              // 超时时间(毫秒)，默认30000
  expectedStatus?: 'success' | 'failure' | 'any';  // 期望状态，默认'any'
  port?: number;                 // 监听端口，默认3767
}
```

### RequestResult

```typescript
interface RequestResult {
  status: 'success' | 'failure';  // 请求状态
  data?: any;                     // 请求数据
  timestamp: number;              // 时间戳
}
```
