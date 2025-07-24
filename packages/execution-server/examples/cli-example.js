#!/usr/bin/env node

/**
 * 简单的命令行示例工具
 * 演示如何使用 Midscene 执行服务器 API
 */

const { MidsceneExecutionClient } = require('@midscene/execution-server');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
使用方法: node cli-example.js <command> [options]

命令:
  devices           - 列出连接的设备
  calculator        - 运行计算器测试
  browser [query]   - 运行浏览器搜索测试
  status <id>       - 查看执行状态
  cancel <id>       - 取消执行

示例:
  node cli-example.js devices
  node cli-example.js calculator
  node cli-example.js browser "Midscene automation"
  node cli-example.js status abc-123-def
    `);
        return;
    }

    const client = new MidsceneExecutionClient('http://localhost:3001');

    try {
        switch (command) {
            case 'devices':
                await listDevices(client);
                break;
            case 'calculator':
                await runCalculatorTest(client);
                break;
            case 'browser':
                await runBrowserTest(client, args[1] || 'Midscene');
                break;
            case 'status':
                await getStatus(client, args[1]);
                break;
            case 'cancel':
                await cancelExecution(client, args[1]);
                break;
            default:
                console.error(`未知命令: ${command}`);
                process.exit(1);
        }
    } catch (error) {
        console.error('错误:', error.message);
        process.exit(1);
    }
}

async function listDevices(client) {
    console.log('🔍 获取连接的设备...');
    const devices = await client.getDevices();

    if (devices.length === 0) {
        console.log('❌ 没有找到连接的 Android 设备');
        console.log('请确保设备已连接并启用 USB 调试');
        return;
    }

    console.log(`✅ 找到 ${devices.length} 个设备:`);
    devices.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.udid} (${device.state})`);
    });
}

async function runCalculatorTest(client) {
    console.log('🧮 开始计算器测试...');

    const devices = await client.getDevices();
    if (devices.length === 0) {
        throw new Error('没有找到连接的设备');
    }

    const steps = [
        { ai: "打开计算器应用" },
        { aiTap: "数字 9" },
        { aiTap: "乘号按钮" },
        { aiTap: "数字 7" },
        { aiTap: "等号按钮" },
        { aiQuery: "string, 计算结果" },
        { sleep: 2000 },
        { ai: "清除计算器" }
    ];

    const executionId = await client.startExecution({
        deviceId: devices[0].udid,
        steps,
        config: {
            aiActionContext: "如果出现权限弹窗，点击允许",
            generateReport: true
        }
    });

    console.log(`📋 执行 ID: ${executionId}`);
    console.log('⏳ 等待执行完成...');

    const result = await client.waitForCompletion(executionId, {
        onProgress: (status) => {
            console.log(`   进度: ${status.progress.percentage}% - ${status.progress.currentStep}`);
        }
    });

    if (result.status === 'completed') {
        console.log('✅ 测试完成!');

        const queryResult = result.results?.find(r => r.type === 'aiQuery');
        if (queryResult?.data) {
            console.log(`🎯 计算结果: ${queryResult.data}`);
        }

        if (result.reportPath) {
            console.log(`📊 报告: ${result.reportPath}`);
        }
    } else {
        console.log(`❌ 测试失败: ${result.error}`);
    }
}

async function runBrowserTest(client, query) {
    console.log(`🌐 开始浏览器搜索测试 (搜索: "${query}")...`);

    const devices = await client.getDevices();
    if (devices.length === 0) {
        throw new Error('没有找到连接的设备');
    }

    const steps = [
        { ai: "打开浏览器应用" },
        { aiTap: "地址栏" },
        { aiInput: "google.com", locate: "地址栏" },
        { aiKeyboardPress: "Enter" },
        { sleep: 3000 },
        { aiTap: "搜索框" },
        { aiInput: query, locate: "搜索框" },
        { aiTap: "搜索按钮" },
        { sleep: 3000 },
        { aiQuery: "string[], 获取前3个搜索结果标题" }
    ];

    const executionId = await client.startExecution({
        deviceId: devices[0].udid,
        steps,
        config: {
            aiActionContext: "接受权限并关闭弹窗",
            generateReport: true
        }
    });

    console.log(`📋 执行 ID: ${executionId}`);
    console.log('⏳ 等待执行完成 (这可能需要几分钟)...');

    const result = await client.waitForCompletion(executionId, {
        timeout: 180000, // 3 分钟
        onProgress: (status) => {
            console.log(`   进度: ${status.progress.percentage}% - ${status.progress.currentStep}`);
        }
    });

    if (result.status === 'completed') {
        console.log('✅ 搜索测试完成!');

        const queryResult = result.results?.find(r => r.type === 'aiQuery');
        if (queryResult?.data) {
            console.log('🎯 搜索结果:');
            queryResult.data.forEach((title, index) => {
                console.log(`   ${index + 1}. ${title}`);
            });
        }
    } else {
        console.log(`❌ 搜索测试失败: ${result.error}`);
    }
}

async function getStatus(client, executionId) {
    if (!executionId) {
        throw new Error('请提供执行 ID');
    }

    console.log(`📊 获取执行状态: ${executionId}`);
    const status = await client.getExecutionStatus(executionId);

    console.log(`状态: ${status.status}`);
    console.log(`进度: ${status.progress.percentage}% (${status.progress.current}/${status.progress.total})`);

    if (status.progress.currentStep) {
        console.log(`当前步骤: ${status.progress.currentStep}`);
    }

    if (status.device) {
        console.log(`设备: ${status.device.udid}`);
    }

    if (status.error) {
        console.log(`错误: ${status.error}`);
    }

    if (status.reportPath) {
        console.log(`报告: ${status.reportPath}`);
    }
}

async function cancelExecution(client, executionId) {
    if (!executionId) {
        throw new Error('请提供执行 ID');
    }

    console.log(`🛑 取消执行: ${executionId}`);
    const cancelled = await client.cancelExecution(executionId);

    if (cancelled) {
        console.log('✅ 执行已取消');
    } else {
        console.log('❌ 无法取消执行 (可能已完成或不存在)');
    }
}

// 启动程序
main();
