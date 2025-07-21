# 等待外部请求功能 (waitForRequest)

## 功能概述

`waitForRequest` 功能允许 Midscene 测试流程在执行过程中暂停，等待外部系统发送HTTP请求来决定是否继续下一步骤。这对于需要人工干预、外部系统确认或复杂集成测试场景非常有用。

## 设计原理

1. **HTTP服务器监听**: 在指定端口启动HTTP服务器，监听外部请求
2. **端点匹配**: 根据配置的端点路径匹配incoming请求
3. **状态检查**: 支持检查请求的成功/失败状态
4. **超时处理**: 支持配置超时时间，避免无限等待
5. **结果传递**: 可以将外部请求的数据传递到后续步骤

## 配置格式

### YAML 配置

```yaml
tasks:
  - name: "等待外部系统确认"
    flow:
      - waitForRequest:
          endpoint: "/approval"           # 必需：监听的端点路径
          timeout: 30000                 # 可选：超时时间(毫秒)，默认30秒
          expectedStatus: "success"      # 可选：期望状态 success|failure|any，默认any
          port: 3767                     # 可选：监听端口，默认3767
        name: "approval_result"          # 可选：结果存储名称
      
      - aiAction: "点击提交按钮"           # 收到确认后继续执行
```

### JavaScript API

```typescript
import { waitForExternalRequest } from '@midscene/core';

// 基本用法
const result = await waitForExternalRequest({
  endpoint: '/approval',
  timeout: 30000,
  expectedStatus: 'success'
});

console.log('收到外部请求:', result);
// { status: 'success', data: {...}, timestamp: 1672531200000 }
```

## 外部系统调用方式

外部系统可以通过HTTP请求触发等待的流程继续：

### 成功请求

```bash
# GET 请求 (默认为成功)
curl "http://localhost:3767/approval"

# POST 请求明确指定成功
curl -X POST "http://localhost:3767/approval" \
  -H "Content-Type: application/json" \
  -d '{"status": "success", "data": {"approved_by": "admin"}}'

# GET 请求通过查询参数指定状态
curl "http://localhost:3767/approval?status=success"
```

### 失败请求

```bash
# POST 请求指定失败
curl -X POST "http://localhost:3767/approval" \
  -H "Content-Type: application/json" \
  -d '{"status": "failure", "reason": "insufficient permissions"}'

# GET 请求通过查询参数指定失败
curl "http://localhost:3767/approval?status=failure"
```

## 使用场景

### 1. 人工审批流程

```yaml
# 测试场景：订单需要人工审批
tasks:
  - name: "订单审批测试"
    flow:
      - aiAction: "填写订单信息"
      - aiAction: "提交订单"
      - aiAssert: "订单状态为'等待审批'"
      
      # 等待人工审批
      - waitForRequest:
          endpoint: "/order-approval"
          timeout: 300000  # 5分钟超时
          expectedStatus: "success"
        name: "approval_result"
      
      - aiAssert: "订单状态为'已审批'"
```

### 2. 外部系统集成

```yaml
# 测试场景：等待外部支付系统回调
tasks:
  - name: "支付回调测试"
    flow:
      - aiAction: "点击支付按钮"
      - aiAssert: "跳转到支付页面"
      
      # 等待支付系统回调
      - waitForRequest:
          endpoint: "/payment-callback"
          timeout: 60000
          expectedStatus: "any"  # 接受成功或失败
        name: "payment_result"
      
      # 根据支付结果继续不同的流程
      - aiAssert: "支付状态显示正确"
```

### 3. 测试数据准备

```yaml
# 测试场景：等待测试数据准备完成
tasks:
  - name: "数据依赖测试"
    flow:
      # 等待外部脚本准备测试数据
      - waitForRequest:
          endpoint: "/data-ready"
          timeout: 120000
          expectedStatus: "success"
        name: "data_prep_result"
      
      - aiAction: "开始测试流程"
```

## 高级用法

### 1. 结果数据使用

```yaml
flow:
  - waitForRequest:
      endpoint: "/user-info"
      expectedStatus: "success"
    name: "user_data"
  
  # 使用返回的数据
  - aiInput: 
      locate: "用户名输入框"
      value: "${user_data.data.username}"
```

### 2. 错误处理

```yaml
flow:
  - waitForRequest:
      endpoint: "/approval"
      timeout: 30000
      expectedStatus: "success"
    name: "approval"
    onError: "continue"  # 失败时继续执行
  
  - aiAssert: "显示超时提示"
```

## 安全考虑

1. **端口安全**: 默认只监听本地端口(127.0.0.1)
2. **CORS设置**: 支持跨域请求以便外部系统调用
3. **请求验证**: 建议在生产环境添加身份验证
4. **超时保护**: 避免无限等待造成资源占用

## 故障排除

### 常见问题

1. **端口被占用**: 
   - 检查端口是否被其他进程占用
   - 使用不同的端口号

2. **超时错误**:
   - 检查外部系统是否正确发送请求
   - 增加超时时间
   - 检查网络连接

3. **状态不匹配**:
   - 确认外部系统发送的状态值正确
   - 使用 "any" 状态来调试

### 调试方法

1. **启用详细日志**:
```bash
MIDSCENE_DEBUG=1 npm run test
```

2. **检查服务器状态**:
```bash
curl -v http://localhost:3767/health
```

3. **监控请求**:
```typescript
import { getRequestWaiter } from '@midscene/core';

const waiter = getRequestWaiter();
waiter.on('request', (event) => {
  console.log('收到请求:', event);
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
