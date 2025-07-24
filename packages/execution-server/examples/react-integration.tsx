/**
 * React integration example
 * 
 * This example shows how to integrate the execution server
 * with a React frontend application.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MidsceneExecutionClient, type ExecutionStatus, type DeviceInfo } from '@midscene/execution-server';

// Custom hook for managing execution client
function useExecutionClient(serverUrl = 'http://localhost:3001') {
    const [client] = useState(() => new MidsceneExecutionClient(serverUrl));
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Check server connection
        client.checkHealth()
            .then(() => setConnected(true))
            .catch(() => setConnected(false));

        // Setup WebSocket
        client.connectWebSocket()
            .then(() => console.log('WebSocket connected'))
            .catch((error) => console.error('WebSocket failed:', error));

        return () => {
            client.disconnectWebSocket();
        };
    }, [client]);

    return { client, connected };
}

// Main component
export function RemoteExecutionPanel() {
    const { client, connected } = useExecutionClient();
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Load devices on mount
    useEffect(() => {
        if (connected) {
            loadDevices();
        }
    }, [connected]);

    // Setup WebSocket listeners
    useEffect(() => {
        const handleStatusUpdate = (message: any) => {
            setExecutionStatus(message.payload);
            addLog(`Status: ${message.payload.status} (${message.payload.progress.percentage}%)`);
        };

        const handleStepCompleted = (message: any) => {
            const step = message.payload;
            addLog(`Step ${step.stepIndex + 1} completed: ${step.type}`);
        };

        client.on('status_update', handleStatusUpdate);
        client.on('step_completed', handleStepCompleted);

        return () => {
            client.off('status_update', handleStatusUpdate);
            client.off('step_completed', handleStepCompleted);
        };
    }, [client]);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${message}`]);
    }, []);

    const loadDevices = async () => {
        try {
            const deviceList = await client.getDevices();
            setDevices(deviceList);
            if (deviceList.length > 0 && !selectedDevice) {
                setSelectedDevice(deviceList[0].udid);
            }
            addLog(`Found ${deviceList.length} device(s)`);
        } catch (error) {
            addLog(`Failed to load devices: ${error.message}`);
        }
    };

    const executeCalculatorTest = async () => {
        if (!selectedDevice) {
            addLog('Please select a device first');
            return;
        }

        setIsRunning(true);
        addLog('Starting calculator test execution...');

        try {
            const steps = [
                { ai: "open calculator app" },
                { aiTap: "number 5" },
                { aiTap: "multiply button" },
                { aiTap: "number 3" },
                { aiTap: "equals button" },
                { aiQuery: "string, the calculation result" },
                { sleep: 1000 },
                { ai: "clear the calculator" }
            ];

            const executionId = await client.startExecution({
                deviceId: selectedDevice,
                steps,
                config: {
                    aiActionContext: "Close any popup dialogs that appear",
                    generateReport: true,
                    continueOnError: false
                }
            });

            addLog(`Execution started: ${executionId}`);
            client.subscribeToExecution(executionId);

            const result = await client.waitForCompletion(executionId, {
                timeout: 120000,
            });

            if (result.status === 'completed') {
                addLog('✅ Execution completed successfully!');
                if (result.reportPath) {
                    addLog(`Report: ${result.reportPath}`);
                }
            } else {
                addLog(`❌ Execution ${result.status}: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            addLog(`💥 Execution failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const executeBrowserTest = async () => {
        if (!selectedDevice) {
            addLog('Please select a device first');
            return;
        }

        setIsRunning(true);
        addLog('Starting browser test execution...');

        try {
            const steps = [
                { ai: "open chrome browser" },
                { aiTap: "address bar" },
                { aiInput: "google.com", locate: "address bar" },
                { aiKeyboardPress: "Enter" },
                { sleep: 3000 },
                { aiTap: "search box" },
                { aiInput: "Midscene automation", locate: "search box" },
                { aiTap: "search button" },
                { sleep: 2000 },
                { aiQuery: "string[], get first 3 search result titles" }
            ];

            const executionId = await client.startExecution({
                deviceId: selectedDevice,
                steps,
                config: {
                    aiActionContext: "Accept any permissions and close popup dialogs",
                    generateReport: true,
                    continueOnError: false
                }
            });

            addLog(`Execution started: ${executionId}`);
            client.subscribeToExecution(executionId);

            const result = await client.waitForCompletion(executionId, {
                timeout: 180000, // 3 minutes for browser test
            });

            if (result.status === 'completed') {
                addLog('✅ Execution completed successfully!');
                const queryResult = result.results?.find(r => r.type === 'aiQuery');
                if (queryResult?.data) {
                    addLog(`Search results: ${JSON.stringify(queryResult.data)}`);
                }
            } else {
                addLog(`❌ Execution ${result.status}: ${result.error || 'Unknown error'}`);
            }

        } catch (error) {
            addLog(`💥 Execution failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const cancelExecution = async () => {
        if (executionStatus?.id && executionStatus.status === 'running') {
            try {
                await client.cancelExecution(executionStatus.id);
                addLog('Execution cancelled');
            } catch (error) {
                addLog(`Failed to cancel: ${error.message}`);
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h2>🚀 Midscene Remote Execution</h2>

            {/* Connection Status */}
            <div style={{ marginBottom: '20px' }}>
                <p>Server Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
            </div>

            {/* Device Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label>
                    📱 Select Device:
                    <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        disabled={devices.length === 0}
                        style={{ marginLeft: '10px', padding: '5px' }}
                    >
                        <option value="">Select a device...</option>
                        {devices.map(device => (
                            <option key={device.udid} value={device.udid}>
                                {device.udid} ({device.state})
                            </option>
                        ))}
                    </select>
                    <button onClick={loadDevices} style={{ marginLeft: '10px', padding: '5px 10px' }}>
                        🔄 Refresh
                    </button>
                </label>
            </div>

            {/* Action Buttons */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={executeCalculatorTest}
                    disabled={!selectedDevice || isRunning}
                    style={{
                        marginRight: '10px',
                        padding: '10px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: !selectedDevice || isRunning ? 'not-allowed' : 'pointer',
                        opacity: !selectedDevice || isRunning ? 0.6 : 1
                    }}
                >
                    🧮 Calculator Test
                </button>

                <button
                    onClick={executeBrowserTest}
                    disabled={!selectedDevice || isRunning}
                    style={{
                        marginRight: '10px',
                        padding: '10px 15px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: !selectedDevice || isRunning ? 'not-allowed' : 'pointer',
                        opacity: !selectedDevice || isRunning ? 0.6 : 1
                    }}
                >
                    🌐 Browser Test
                </button>

                {isRunning && (
                    <button
                        onClick={cancelExecution}
                        style={{
                            padding: '10px 15px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🛑 Cancel
                    </button>
                )}
            </div>

            {/* Execution Status */}
            {executionStatus && (
                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                }}>
                    <h3>Execution Status</h3>
                    <p><strong>ID:</strong> {executionStatus.id}</p>
                    <p><strong>Status:</strong> {executionStatus.status}</p>
                    <p><strong>Progress:</strong> {executionStatus.progress.percentage}% ({executionStatus.progress.current}/{executionStatus.progress.total})</p>
                    {executionStatus.progress.currentStep && (
                        <p><strong>Current Step:</strong> {executionStatus.progress.currentStep}</p>
                    )}
                    {executionStatus.device && (
                        <p><strong>Device:</strong> {executionStatus.device.udid}</p>
                    )}
                    {executionStatus.error && (
                        <p style={{ color: 'red' }}><strong>Error:</strong> {executionStatus.error}</p>
                    )}
                </div>
            )}

            {/* Logs */}
            <div>
                <h3>📝 Execution Logs</h3>
                <div style={{
                    height: '300px',
                    overflow: 'auto',
                    backgroundColor: '#000',
                    color: '#00ff00',
                    padding: '10px',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '12px',
                    border: '1px solid #ccc'
                }}>
                    {logs.map((log, index) => (
                        <div key={index}>{log}</div>
                    ))}
                    {logs.length === 0 && (
                        <div style={{ color: '#666' }}>Waiting for execution logs...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Usage example
export default function App() {
    return (
        <div>
            <RemoteExecutionPanel />
        </div>
    );
}
