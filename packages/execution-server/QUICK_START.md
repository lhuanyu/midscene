# 🚀 Midscene 执行服务器快速开始

一个简单的指南，让你在 5 分钟内开始使用 Midscene 远程执行功能。

## 前提条件

1. **Node.js 18+** 已安装
2. **Android 设备** 通过 USB 连接并启用开发者选项中的 USB 调试
3. **ADB** 已安装并可用

## 1️⃣ 验证设备连接

```bash
# 检查设备是否正确连接
adb devices

# 应该看到类似输出：
# List of devices attached
# AB1C123456    device
```

## 2️⃣ 安装并启动服务器

```bash
# 全局安装（推荐用于快速测试）
npm install -g @midscene/execution-server

# 启动服务器
midscene-server

# 或者本地安装
npx @midscene/execution-server
```

服务器启动后，你会看到：

```
Midscene Execution Server running on port 3001
Health check: http://localhost:3001/health
API base URL: http://localhost:3001/api
WebSocket URL: ws://localhost:3001
```

## 3️⃣ 测试基本功能

### 方式一：使用 curl

```bash
# 检查服务器状态
curl http://localhost:3001/health

# 获取连接的设备
curl http://localhost:3001/api/devices

# 运行一个简单的测试
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {"ai": "打开计算器应用"},
      {"aiTap": "数字 2"},
      {"aiTap": "加号按钮"},
      {"aiTap": "数字 3"},
      {"aiTap": "等号按钮"}
    ]
  }'

# 会返回类似：{"success": true, "data": {"executionId": "uuid-here"}}

# 检查执行状态（替换为你的执行ID）
curl http://localhost:3001/api/execute/你的执行ID/status
```

### 方式二：使用 Node.js

创建文件 `test.js`：

```javascript
const { MidsceneExecutionClient } = require('@midscene/execution-server');

async function quickTest() {
  const client = new MidsceneExecutionClient('http://localhost:3001');
  
  // 获取设备
  const devices = await client.getDevices();
  console.log('连接的设备:', devices.length);
  
  if (devices.length === 0) {
    console.log('请连接 Android 设备');
    return;
  }
  
  // 运行简单测试
  console.log('开始测试...');
  const result = await client.executeAndWait({
    steps: [
      { ai: "打开设置应用" },
      { sleep: 2000 },
      { ai: "返回主屏幕" }
    ]
  }, {
    onProgress: (status) => {
      console.log(`进度: ${status.progress.percentage}%`);
    }
  });
  
  console.log('测试完成:', result.status);
}

quickTest().catch(console.error);
```

运行测试：

```bash
node test.js
```

## 4️⃣ 常用测试场景

### 计算器测试

```javascript
const steps = [
  { ai: "打开计算器应用" },
  { aiTap: "数字 5" },
  { aiTap: "乘号按钮" },
  { aiTap: "数字 3" },
  { aiTap: "等号按钮" },
  { aiQuery: "string, 显示的计算结果" }
];
```

### 浏览器搜索测试

```javascript
const steps = [
  { ai: "打开浏览器" },
  { aiTap: "地址栏" },
  { aiInput: "google.com", locate: "地址栏" },
  { aiKeyboardPress: "Enter" },
  { sleep: 3000 },
  { aiInput: "Midscene", locate: "搜索框" },
  { aiTap: "搜索按钮" }
];
```

### 设置应用测试

```javascript
const steps = [
  { ai: "打开设置应用" },
  { aiTap: "WiFi 设置" },
  { aiQuery: "boolean, WiFi 是否已开启" },
  { ai: "返回设置主页面" }
];
```

## 5️⃣ 实时监控

### 使用 WebSocket

```javascript
const client = new MidsceneExecutionClient('http://localhost:3001');

// 连接 WebSocket
await client.connectWebSocket();

// 监听事件
client.on('status_update', (message) => {
  console.log('状态更新:', message.payload.status);
});

client.on('step_completed', (message) => {
  console.log('步骤完成:', message.payload.type);
});

// 开始执行并订阅更新
const executionId = await client.startExecution({ steps: [...] });
client.subscribeToExecution(executionId);
```

### 浏览器中查看

访问：http://localhost:3001/api/stats 查看服务器统计信息

## 🎯 完整示例

```javascript
const { MidsceneExecutionClient } = require('@midscene/execution-server');

async function completeExample() {
  const client = new MidsceneExecutionClient();
  
  try {
    // 1. 检查连接
    const health = await client.checkHealth();
    console.log('✅ 服务器正常:', health.status);
    
    // 2. 获取设备
    const devices = await client.getDevices();
    console.log(`📱 找到 ${devices.length} 个设备`);
    
    if (devices.length === 0) {
      throw new Error('没有连接的设备');
    }
    
    // 3. 连接 WebSocket
    await client.connectWebSocket();
    client.on('status_update', (msg) => {
      const s = msg.payload;
      console.log(`📊 ${s.status} (${s.progress.percentage}%)`);
    });
    
    // 4. 执行自动化脚本
    const executionId = await client.startExecution({
      deviceId: devices[0].udid,
      steps: [
        { ai: "打开计算器" },
        { aiTap: "数字 6" },
        { aiTap: "加号" },
        { aiTap: "数字 4" },
        { aiTap: "等号" },
        { aiQuery: "string, 计算结果" }
      ],
      config: {
        generateReport: true,
        aiActionContext: "关闭任何弹窗"
      }
    });
    
    // 5. 订阅更新
    client.subscribeToExecution(executionId);
    
    // 6. 等待完成
    const result = await client.waitForCompletion(executionId);
    
    // 7. 处理结果
    if (result.status === 'completed') {
      console.log('🎉 执行成功!');
      const queryResult = result.results?.find(r => r.type === 'aiQuery');
      if (queryResult) {
        console.log('📊 结果:', queryResult.data);
      }
    } else {
      console.log('❌ 执行失败:', result.error);
    }
    
  } catch (error) {
    console.error('💥 错误:', error.message);
  } finally {
    client.disconnectWebSocket();
  }
}

completeExample();
```

## 🔧 命令行选项

```bash
# 自定义端口
midscene-server --port 8080

# 调试模式
midscene-server --log-level debug

# 限制并发执行数
midscene-server --max-concurrent 3

# 禁用 WebSocket
midscene-server --no-websocket

# 查看所有选项
midscene-server --help
```

## 🛠️ 故障排除

### 常见问题

**问题：设备未找到**
```bash
# 检查 ADB 连接
adb devices
adb kill-server
adb start-server
```

**问题：服务器无法启动**
```bash
# 检查端口是否被占用
lsof -i :3001
# 或使用不同端口
midscene-server --port 3002
```

**问题：执行失败**
- 确保设备屏幕已解锁
- 检查应用是否已安装
- 查看执行日志了解具体错误

### 获取帮助

- 查看完整文档：[USAGE.md](./USAGE.md)
- 查看示例代码：[examples/](./examples/)
- 检查执行日志：`midscene-server --log-level debug`

---

🎉 **恭喜！** 你现在已经成功设置了 Midscene 远程执行环境，可以开始自动化 Android 应用了！
