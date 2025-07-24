# Midscene 执行服务器 API 使用文档

本文档详细说明了如何使用 `@midscene/execution-server` 包来实现远程 Android 自动化执行。

## 📋 目录

1. [快速开始](#快速开始)
2. [API 参考](#api-参考)
3. [客户端 SDK](#客户端-sdk)
4. [WebSocket 实时更新](#websocket-实时更新)
5. [集成示例](#集成示例)
6. [错误处理](#错误处理)
7. [部署指南](#部署指南)

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装执行服务器包
npm install @midscene/execution-server

# 或者使用 pnpm
pnpm add @midscene/execution-server
```

### 2. 启动执行服务器

#### 方式一：使用命令行工具（推荐）

```bash
# 默认配置启动
npx midscene-server

# 自定义配置
npx midscene-server --port 8080 --max-concurrent 10 --log-level debug

# 查看所有选项
npx midscene-server --help
```

#### 方式二：编程方式启动

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
  
  console.log('服务器已启动在端口 3001');
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

startServer();
```

### 3. 连接 Android 设备

确保已连接 Android 设备并启用 ADB 调试：

```bash
# 检查连接的设备
adb devices

# 预期输出：
# List of devices attached
# device_id    device
```

### 4. 开始使用

#### REST API 调用

```bash
# 检查服务器健康状态
curl http://localhost:3001/health

# 获取连接的设备
curl http://localhost:3001/api/devices

# 开始执行自动化步骤
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {"ai": "打开计算器应用"},
      {"aiTap": "数字 2"},
      {"aiTap": "加号按钮"},
      {"aiTap": "数字 3"},
      {"aiTap": "等号按钮"}
    ],
    "config": {
      "aiActionContext": "如果出现权限弹窗，请点击允许",
      "generateReport": true
    }
  }'
```

#### 使用客户端 SDK

```typescript
import { MidsceneExecutionClient } from '@midscene/execution-server';

async function runAutomation() {
  const client = new MidsceneExecutionClient('http://localhost:3001');
  
  // 获取设备列表
  const devices = await client.getDevices();
  console.log('连接的设备:', devices);
  
  // 执行自动化脚本
  const executionId = await client.startExecution({
    deviceId: devices[0]?.udid,
    steps: [
      { ai: "打开计算器应用" },
      { aiTap: "数字 5" },
      { aiTap: "乘号按钮" },
      { aiTap: "数字 3" },
      { aiTap: "等号按钮" },
      { aiQuery: "string, 计算结果" }
    ],
    config: {
      aiActionContext: "关闭任何弹出的对话框",
      generateReport: true
    }
  });
  
  // 等待执行完成
  const result = await client.waitForCompletion(executionId, {
    onProgress: (status) => {
      console.log(`进度: ${status.progress.percentage}%`);
    }
  });
  
  console.log('执行结果:', result);
}

runAutomation();
```

## 📚 API 参考

### REST API 端点

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| `GET` | `/health` | 服务器健康检查 | - | `{status, version, uptime}` |
| `GET` | `/api/devices` | 获取连接的 Android 设备 | - | `DeviceInfo[]` |
| `POST` | `/api/execute` | 开始执行自动化步骤 | `ExecutionRequest` | `{executionId}` |
| `GET` | `/api/execute/:id/status` | 获取执行状态 | - | `ExecutionStatus` |
| `POST` | `/api/execute/:id/cancel` | 取消执行 | - | `{cancelled: boolean}` |
| `GET` | `/api/executions` | 获取所有执行记录 | - | `ExecutionStatus[]` |
| `GET` | `/api/stats` | 获取服务器统计信息 | - | `ServerStats` |

### 核心数据类型

#### ExecutionRequest

```typescript
interface ExecutionRequest {
  deviceId?: string;                    // 目标设备 ID（可选）
  steps: MidsceneYamlFlowItem[];       // 自动化步骤
  config?: ExecutionConfig;            // 执行配置
}
```

#### ExecutionConfig

```typescript
interface ExecutionConfig {
  aiActionContext?: string;            // AI 上下文提示
  timeout?: number;                    // 执行超时时间（毫秒）
  generateReport?: boolean;            // 是否生成报告
  continueOnError?: boolean;           // 步骤失败时是否继续
}
```

#### ExecutionStatus

```typescript
interface ExecutionStatus {
  id: string;                          // 执行 ID
  status: ExecutionStatusType;         // 当前状态
  progress: ExecutionProgress;         // 进度信息
  results?: ExecutionStepResult[];     // 步骤结果
  error?: string;                      // 错误信息
  reportPath?: string;                 // 报告文件路径
  startTime: Date;                     // 开始时间
  endTime?: Date;                      // 结束时间
  device?: DeviceInfo;                 // 设备信息
}
```

### 支持的步骤类型

```typescript
// 自动规划操作
{ ai: "自然语言描述的操作" }

// 即时操作
{ aiTap: "元素描述", deepThink?: boolean }
{ aiInput: "要输入的文本", locate: "输入框描述", deepThink?: boolean }
{ aiKeyboardPress: "Enter", locate?: "元素描述", deepThink?: boolean }
{ aiScroll: { direction: "down", scrollType: "once" }, locate?: "元素描述" }

// 数据提取
{ aiQuery: "数据描述和格式", name?: "结果名称" }
{ aiAssert: "要验证的条件" }

// 工具
{ sleep: 3000 }  // 等待毫秒数
```

## 🖥️ 客户端 SDK

### 基本用法

```typescript
import { MidsceneExecutionClient } from '@midscene/execution-server';

const client = new MidsceneExecutionClient('http://localhost:3001');

// 检查服务器连接
const health = await client.checkHealth();

// 获取设备
const devices = await client.getDevices();

// 开始执行
const executionId = await client.startExecution({
  steps: [{ ai: "打开设置" }]
});

// 获取状态
const status = await client.getExecutionStatus(executionId);

// 取消执行
await client.cancelExecution(executionId);

// 等待完成
const result = await client.waitForCompletion(executionId);
```

### 高级用法

```typescript
// 一键执行并等待
const result = await client.executeAndWait({
  steps: [
    { ai: "打开浏览器" },
    { aiTap: "地址栏" },
    { aiInput: "google.com", locate: "地址栏" }
  ]
}, {
  timeout: 120000,
  onProgress: (status) => {
    console.log(`当前步骤: ${status.progress.currentStep}`);
  }
});
```

## 🔌 WebSocket 实时更新

### 连接 WebSocket

```typescript
const client = new MidsceneExecutionClient('http://localhost:3001');

// 连接 WebSocket
await client.connectWebSocket();

// 监听事件
client.on('status_update', (message) => {
  console.log('状态更新:', message.payload);
});

client.on('step_completed', (message) => {
  console.log('步骤完成:', message.payload);
});

// 订阅特定执行的更新
client.subscribeToExecution(executionId);

// 断开连接
client.disconnectWebSocket();
```

### WebSocket 消息格式

```typescript
interface WebSocketMessage {
  type: 'status_update' | 'step_completed' | 'execution_completed' | 'error';
  executionId: string;
  payload: any;
}
```

## 🎯 集成示例

### Node.js Express 中间件

```typescript
import express from 'express';
import { MidsceneExecutionClient } from '@midscene/execution-server';

const app = express();
const client = new MidsceneExecutionClient('http://localhost:3001');

app.post('/automation/calculator', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    const result = await client.executeAndWait({
      deviceId,
      steps: [
        { ai: "打开计算器" },
        { aiTap: "数字 7" },
        { aiTap: "加号" },
        { aiTap: "数字 8" },
        { aiTap: "等号" }
      ]
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(4000);
```

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { MidsceneExecutionClient } from '@midscene/execution-server';

function useRemoteExecution(serverUrl = 'http://localhost:3001') {
  const [client] = useState(() => new MidsceneExecutionClient(serverUrl));
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    // 加载设备
    client.getDevices().then(setDevices);
    
    // 连接 WebSocket
    client.connectWebSocket().then(() => {
      client.on('status_update', (msg) => setStatus(msg.payload));
    });
    
    return () => client.disconnectWebSocket();
  }, [client]);
  
  const execute = async (steps) => {
    const executionId = await client.startExecution({
      deviceId: devices[0]?.udid,
      steps
    });
    client.subscribeToExecution(executionId);
    return executionId;
  };
  
  return { client, devices, status, execute };
}

// 使用
function AutomationComponent() {
  const { devices, status, execute } = useRemoteExecution();
  
  const runTest = () => {
    execute([
      { ai: "打开相机应用" },
      { aiTap: "拍照按钮" }
    ]);
  };
  
  return (
    <div>
      <p>设备: {devices.length}</p>
      <p>状态: {status?.status}</p>
      <button onClick={runTest}>运行测试</button>
    </div>
  );
}
```

### Python 客户端

```python
import requests
import json
import time

class MidsceneClient:
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url.rstrip('/')
    
    def get_devices(self):
        response = requests.get(f"{self.base_url}/api/devices")
        return response.json()["data"]
    
    def start_execution(self, steps, device_id=None, config=None):
        payload = {
            "steps": steps,
            "deviceId": device_id,
            "config": config or {}
        }
        response = requests.post(
            f"{self.base_url}/api/execute",
            json=payload
        )
        return response.json()["data"]["executionId"]
    
    def get_status(self, execution_id):
        response = requests.get(
            f"{self.base_url}/api/execute/{execution_id}/status"
        )
        return response.json()["data"]
    
    def wait_for_completion(self, execution_id, timeout=300):
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_status(execution_id)
            if status["status"] in ["completed", "failed", "cancelled"]:
                return status
            time.sleep(2)
        raise TimeoutError("Execution timeout")

# 使用示例
client = MidsceneClient()
devices = client.get_devices()

if devices:
    execution_id = client.start_execution([
        {"ai": "打开设置应用"},
        {"aiTap": "WiFi 设置"}
    ], device_id=devices[0]["udid"])
    
    result = client.wait_for_completion(execution_id)
    print(f"执行结果: {result['status']}")
```

## ⚠️ 错误处理

### 常见错误类型

```typescript
try {
  const result = await client.executeAndWait({
    steps: [{ ai: "无效操作" }]
  });
} catch (error) {
  if (error.message.includes('Device not found')) {
    console.error('设备未找到，请连接 Android 设备');
  } else if (error.message.includes('timeout')) {
    console.error('执行超时');
  } else if (error.message.includes('steps array is required')) {
    console.error('步骤数组不能为空');
  } else if (error.message.includes('Maximum concurrent executions')) {
    console.error('达到最大并发执行限制');
  } else {
    console.error('执行失败:', error.message);
  }
}
```

### 重试机制

```typescript
async function executeWithRetry(client, request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.executeAndWait(request);
    } catch (error) {
      console.warn(`执行失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 🚀 部署指南

### Docker 部署

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

```bash
# 构建镜像
docker build -t midscene-server .

# 运行容器
docker run -d \
  --name midscene-server \
  -p 3001:3001 \
  -v /dev/bus/usb:/dev/bus/usb \
  --privileged \
  midscene-server
```

### PM2 部署

```json
{
  "name": "midscene-server",
  "script": "./bin/server.js",
  "args": ["--port", "3001", "--log-level", "info"],
  "instances": 1,
  "exec_mode": "fork",
  "env": {
    "NODE_ENV": "production"
  },
  "log_file": "./logs/combined.log",
  "out_file": "./logs/out.log",
  "error_file": "./logs/error.log"
}
```

```bash
# 启动服务
pm2 start ecosystem.json

# 查看状态
pm2 status

# 查看日志
pm2 logs midscene-server
```

### 系统服务（systemd）

```ini
[Unit]
Description=Midscene Execution Server
After=network.target

[Service]
Type=simple
User=midscene
WorkingDirectory=/opt/midscene-server
ExecStart=/usr/bin/node bin/server.js --port 3001
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# 安装服务
sudo cp midscene-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable midscene-server
sudo systemctl start midscene-server
```

## 📊 监控和维护

### 健康检查

```bash
# 检查服务器状态
curl http://localhost:3001/health

# 获取统计信息
curl http://localhost:3001/api/stats
```

### 日志管理

```typescript
// 配置日志级别
const server = new MidsceneExecutionServer({
  logLevel: 'debug' // debug, info, warn, error
});
```

### 清理旧执行记录

```bash
# 清理 24 小时前的执行记录
curl -X POST http://localhost:3001/api/executions/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAge": 86400000}'
```

## 🔧 配置参考

### 服务器配置

```typescript
interface ServerConfig {
  port: number;                        // 服务器端口（默认：3001）
  enableCors: boolean;                 // 启用 CORS（默认：true）
  enableWebSocket: boolean;            // 启用 WebSocket（默认：true）
  maxConcurrentExecutions: number;     // 最大并发执行数（默认：5）
  defaultTimeout: number;              // 默认超时时间（默认：300000ms）
  logLevel: 'debug' | 'info' | 'warn' | 'error';  // 日志级别（默认：info）
}
```

### 环境变量

```bash
# 设置端口
export MIDSCENE_SERVER_PORT=8080

# 设置日志级别
export MIDSCENE_LOG_LEVEL=debug

# 设置最大并发数
export MIDSCENE_MAX_CONCURRENT=10
```

---

这个完整的文档覆盖了从基础使用到高级集成的所有方面。如果你需要任何特定部分的更多详细信息，请告诉我！
