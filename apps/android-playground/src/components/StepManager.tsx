import { DeleteOutlined, PlayCircleOutlined, PlusOutlined, StopOutlined, DownloadOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import { Button, List, Select, Input, Typography, Badge, message, Upload, Drawer, Checkbox } from 'antd';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { MidsceneYamlFlowItem } from '@midscene/core';
import * as yaml from 'js-yaml';

const { TextArea } = Input;
const { Text } = Typography;

interface StepData {
    id: string;
    type: 'aiAction' | 'aiQuery' | 'aiAssert' | 'aiTap' | 'aiInput' | 'aiKeyboardPress' | 'aiScroll' | 'sleep';
    prompt?: string;
    value?: string; // for aiInput
    locate?: string; // for specific actions
    timeout?: number; // for sleep
    name?: string; // for aiQuery
    deepThink?: boolean; // for precise element location
}

interface StepManagerProps {
    onExecuteSteps: (steps: MidsceneYamlFlowItem[]) => Promise<void>;
    isRunning: boolean;
    onStop: () => void;
    initialSteps?: StepData[];
    onStepsChange?: (steps: StepData[]) => void;
}

export const StepManager: React.FC<StepManagerProps> = ({
    onExecuteSteps,
    isRunning,
    onStop,
    initialSteps = [],
    onStepsChange,
}) => {
    const [steps, setSteps] = useState<StepData[]>(initialSteps);
    const [currentStepType, setCurrentStepType] = useState<StepData['type']>('aiAction');
    const [currentPrompt, setCurrentPrompt] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [currentLocate, setCurrentLocate] = useState('');
    const [currentTimeout, setCurrentTimeout] = useState(3000);
    const [currentName, setCurrentName] = useState('');
    const [currentDeepThink, setCurrentDeepThink] = useState(false);

    // 抽屉状态
    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<StepData | null>(null);

    // 快速添加状态
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [quickStepType, setQuickStepType] = useState<StepData['type']>('aiAction');
    const [quickPrompt, setQuickPrompt] = useState('');

    // 滚动容器的引用
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Sync with initial steps when component mounts or initialSteps change
    useEffect(() => {
        if (initialSteps.length > 0) {
            setSteps(initialSteps);
        }
    }, [initialSteps]);

    // Notify parent when steps change
    useEffect(() => {
        if (onStepsChange) {
            onStepsChange(steps);
        }
    }, [steps, onStepsChange]);

    const stepTypeOptions = [
        { label: 'AI Action (自动规划)', value: 'aiAction' },
        { label: 'AI Tap (点击)', value: 'aiTap' },
        { label: 'AI Input (输入)', value: 'aiInput' },
        { label: 'AI Query (查询)', value: 'aiQuery' },
        { label: 'AI Assert (断言)', value: 'aiAssert' },
        { label: 'AI Keyboard Press (按键)', value: 'aiKeyboardPress' },
        { label: 'AI Scroll (滚动)', value: 'aiScroll' },
        { label: 'Sleep (等待)', value: 'sleep' },
    ];

    const addStep = useCallback(() => {
        if (!currentPrompt.trim() && currentStepType !== 'sleep') return;
        if (currentStepType === 'sleep' && !currentTimeout) return;

        const newStep: StepData = {
            id: editingStep ? editingStep.id : `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: currentStepType,
            prompt: currentPrompt.trim() || undefined,
            value: currentValue.trim() || undefined,
            locate: currentLocate.trim() || undefined,
            timeout: currentStepType === 'sleep' ? currentTimeout : undefined,
            name: currentName.trim() || undefined,
            deepThink: currentDeepThink || undefined,
        };

        if (editingStep) {
            // 编辑模式
            setSteps(prev => prev.map(step => step.id === editingStep.id ? newStep : step));
            setEditDrawerOpen(false);
            setEditingStep(null);
        } else {
            // 添加模式
            setSteps(prev => [...prev, newStep]);
            setAddDrawerOpen(false);
        }

        // Reset form
        setCurrentPrompt('');
        setCurrentValue('');
        setCurrentLocate('');
        setCurrentName('');
        setCurrentDeepThink(false);

        // 添加步骤后，延迟滚动到底部
        setTimeout(() => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                console.log('Scrolling to bottom:', {
                    scrollHeight: container.scrollHeight,
                    clientHeight: container.clientHeight,
                    scrollTop: container.scrollTop
                });
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 200); // 增加延迟，确保DOM更新完成
    }, [currentStepType, currentPrompt, currentValue, currentLocate, currentTimeout, currentName, editingStep]);

    const removeStep = useCallback((stepId: string) => {
        setSteps(prev => prev.filter(step => step.id !== stepId));
    }, []);

    const removeAllSteps = useCallback(() => {
        if (steps.length === 0) return;

        const confirmed = window.confirm(`确定要删除所有 ${steps.length} 个步骤吗？此操作不可撤销。`);
        if (confirmed) {
            setSteps([]);
            message.success('已清空所有步骤');
        }
    }, [steps.length]);

    // 抽屉相关方法
    const openAddDrawer = useCallback(() => {
        // 重置表单
        setCurrentStepType('aiAction');
        setCurrentPrompt('');
        setCurrentValue('');
        setCurrentLocate('');
        setCurrentTimeout(3000);
        setCurrentName('');
        setCurrentDeepThink(false);
        setAddDrawerOpen(true);
    }, []);

    const closeAddDrawer = useCallback(() => {
        setAddDrawerOpen(false);
    }, []);

    const openEditDrawer = useCallback((step: StepData) => {
        setEditingStep(step);
        setCurrentStepType(step.type);
        setCurrentPrompt(step.prompt || '');
        setCurrentValue(step.value || '');
        setCurrentLocate(step.locate || '');
        setCurrentTimeout(step.timeout || 3000);
        setCurrentName(step.name || '');
        setCurrentDeepThink(step.deepThink || false);
        setEditDrawerOpen(true);
    }, []);

    const closeEditDrawer = useCallback(() => {
        setEditDrawerOpen(false);
        setEditingStep(null);
    }, []);

    // 快速添加相关方法
    const toggleQuickAdd = useCallback(() => {
        setQuickAddVisible(prev => !prev);
        if (!quickAddVisible) {
            // 重置快速添加表单
            setQuickStepType('aiAction');
            setQuickPrompt('');
        }
    }, [quickAddVisible]);

    const quickAddStep = useCallback(() => {
        if (!quickPrompt.trim()) return;

        const newStep: StepData = {
            id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: quickStepType,
        };

        // 根据步骤类型设置不同的字段
        if (quickStepType === 'sleep') {
            // sleep 类型使用 timeout 字段，输入应该是数字
            const timeout = parseInt(quickPrompt.trim());
            if (isNaN(timeout) || timeout <= 0) {
                message.error('等待时间必须是大于0的数字（毫秒）');
                return;
            }
            newStep.timeout = timeout;
        } else {
            // 其他类型使用 prompt 字段
            newStep.prompt = quickPrompt.trim();
        }

        setSteps(prev => [...prev, newStep]);

        // Reset quick form
        setQuickPrompt('');
        setQuickAddVisible(false);

        // 滚动到底部
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 200);
    }, [quickStepType, quickPrompt]);

    // 根据步骤类型生成 placeholder 提示
    const getQuickAddPlaceholder = (stepType: StepData['type']): string => {
        switch (stepType) {
            case 'aiAction':
                return '描述要执行的操作，如：点击登录按钮';
            case 'aiTap':
                return '描述要点击的元素，如：搜索按钮';
            case 'aiQuery':
                return '描述要查询的内容和格式，如：string[], 获取商品名称列表';
            case 'aiAssert':
                return '描述要断言的条件，如：页面显示登录成功';
            case 'sleep':
                return '输入等待时间（毫秒），如：3000';
            default:
                return '输入描述或指令...';
        }
    };

    // YAML Export function
    const exportToYaml = useCallback(() => {
        if (steps.length === 0) {
            message.warning('没有步骤可以导出');
            return;
        }

        // Convert steps to YAML flow format
        const yamlFlowItems: MidsceneYamlFlowItem[] = steps.map(step => {
            switch (step.type) {
                case 'aiAction':
                    return { ai: step.prompt! };
                case 'aiTap':
                    return {
                        aiTap: step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiInput':
                    return {
                        aiInput: step.value!,
                        locate: step.locate || step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiQuery':
                    return {
                        aiQuery: step.prompt!,
                        ...(step.name && { name: step.name })
                    };
                case 'aiAssert':
                    return { aiAssert: step.prompt! };
                case 'aiKeyboardPress':
                    return {
                        aiKeyboardPress: step.value!,
                        locate: step.locate || step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiScroll':
                    return {
                        aiScroll: {
                            direction: 'down', // default
                            scrollType: 'once'
                        },
                        locate: step.locate || step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'sleep':
                    return { sleep: step.timeout! };
                default:
                    return { ai: step.prompt! };
            }
        });

        const yamlContent = {
            android: {
                deviceId: 'your-device-id'
            },
            tasks: [
                {
                    name: 'Exported Steps',
                    flow: yamlFlowItems
                }
            ]
        };

        const yamlString = yaml.dump(yamlContent, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
        const blob = new Blob([yamlString], { type: 'application/x-yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `midscene-steps-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('步骤已导出为YAML文件');
    }, [steps]);

    // YAML Import function
    const importFromYaml = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let yamlData: any;

                // Try to parse as YAML first, then fallback to JSON
                try {
                    yamlData = yaml.load(content);
                } catch (yamlError) {
                    // Fallback to JSON parsing
                    try {
                        yamlData = JSON.parse(content);
                    } catch (jsonError) {
                        throw new Error('文件格式错误，请确保是有效的YAML或JSON文件');
                    }
                }

                // Extract flow items from the YAML structure
                let flowItems: MidsceneYamlFlowItem[] = [];

                if (yamlData.tasks && Array.isArray(yamlData.tasks)) {
                    // Extract flow from the first task
                    const firstTask = yamlData.tasks[0];
                    if (firstTask && firstTask.flow && Array.isArray(firstTask.flow)) {
                        flowItems = firstTask.flow;
                    }
                } else if (Array.isArray(yamlData)) {
                    // Direct array of flow items
                    flowItems = yamlData;
                }

                // Convert YAML flow items to StepData
                const importedSteps: StepData[] = flowItems.map((item, index) => {
                    const id = `imported_${Date.now()}_${index}`;

                    if ('ai' in item) {
                        return {
                            id,
                            type: 'aiAction',
                            prompt: item.ai
                        };
                    } else if ('aiTap' in item) {
                        return {
                            id,
                            type: 'aiTap',
                            prompt: item.aiTap,
                            deepThink: item.deepThink || false
                        };
                    } else if ('aiInput' in item) {
                        return {
                            id,
                            type: 'aiInput',
                            value: item.aiInput,
                            locate: item.locate,
                            prompt: item.locate,
                            deepThink: item.deepThink || false
                        };
                    } else if ('aiQuery' in item) {
                        return {
                            id,
                            type: 'aiQuery',
                            prompt: item.aiQuery,
                            name: item.name
                        };
                    } else if ('aiAssert' in item) {
                        return {
                            id,
                            type: 'aiAssert',
                            prompt: item.aiAssert
                        };
                    } else if ('aiKeyboardPress' in item) {
                        return {
                            id,
                            type: 'aiKeyboardPress',
                            value: item.aiKeyboardPress,
                            locate: item.locate,
                            prompt: item.locate,
                            deepThink: item.deepThink || false
                        };
                    } else if ('aiScroll' in item) {
                        return {
                            id,
                            type: 'aiScroll',
                            locate: item.locate,
                            prompt: item.locate,
                            deepThink: item.deepThink || false
                        };
                    } else if ('sleep' in item) {
                        return {
                            id,
                            type: 'sleep',
                            timeout: typeof item.sleep === 'number' ? item.sleep : 3000
                        };
                    } else {
                        // Fallback to aiAction
                        return {
                            id,
                            type: 'aiAction',
                            prompt: JSON.stringify(item)
                        };
                    }
                });

                setSteps(prev => [...prev, ...importedSteps]);
                message.success(`成功导入 ${importedSteps.length} 个步骤`);

                // 导入步骤后，延迟滚动到底部
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                            top: scrollContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 200); // 增加延迟，确保DOM更新完成
            } catch (error) {
                console.error('导入文件解析错误:', error);
                message.error(error instanceof Error ? error.message : '文件格式错误，请确保是有效的YAML或JSON文件');
            }
        };
        reader.readAsText(file);
        return false; // Prevent default upload behavior
    }, []); const executeSteps = useCallback(async () => {
        if (steps.length === 0) return;

        // Convert StepData to MidsceneYamlFlowItem format
        const yamlFlowItems: MidsceneYamlFlowItem[] = steps.map(step => {
            switch (step.type) {
                case 'aiAction':
                    return { ai: step.prompt! };
                case 'aiTap':
                    return {
                        aiTap: step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiInput':
                    return {
                        aiInput: step.value!,
                        locate: step.locate || step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiQuery':
                    return {
                        aiQuery: step.prompt!,
                        ...(step.name && { name: step.name })
                    };
                case 'aiAssert':
                    return { aiAssert: step.prompt! };
                case 'aiKeyboardPress':
                    return {
                        aiKeyboardPress: step.value!,
                        locate: step.locate || step.prompt!,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'aiScroll':
                    return {
                        aiScroll: {
                            direction: 'down', // default
                            scrollType: 'once',
                        },
                        locate: step.locate || step.prompt,
                        ...(step.deepThink && { deepThink: step.deepThink })
                    };
                case 'sleep':
                    return { sleep: step.timeout! };
                default:
                    return { ai: step.prompt! };
            }
        });

        await onExecuteSteps(yamlFlowItems);
    }, [steps, onExecuteSteps]);

    const getStepDescription = (step: StepData): string => {
        const deepThinkSuffix = step.deepThink ? ' (Deep Think)' : '';
        switch (step.type) {
            case 'aiAction':
                return `执行操作: ${step.prompt}${deepThinkSuffix}`;
            case 'aiTap':
                return `点击: ${step.prompt}${deepThinkSuffix}`;
            case 'aiInput':
                return `输入 "${step.value}" 到 ${step.locate || step.prompt}${deepThinkSuffix}`;
            case 'aiQuery':
                return `查询: ${step.prompt}${step.name ? ` (保存为 ${step.name})` : ''}${deepThinkSuffix}`;
            case 'aiAssert':
                return `断言: ${step.prompt}${deepThinkSuffix}`;
            case 'aiKeyboardPress':
                return `按键 "${step.value}" 在 ${step.locate || step.prompt}${deepThinkSuffix}`;
            case 'aiScroll':
                return `滚动: ${step.locate || step.prompt || '页面'}${deepThinkSuffix}`;
            case 'sleep':
                return `等待 ${step.timeout}ms`;
            default:
                return step.prompt || '未知操作';
        }
    };

    const getStepTypeColor = (type: StepData['type']): string => {
        const colors = {
            aiAction: '#2B83FF',
            aiTap: '#52c41a',
            aiInput: '#faad14',
            aiQuery: '#722ed1',
            aiAssert: '#f5222d',
            aiKeyboardPress: '#fa8c16',
            aiScroll: '#13c2c2',
            sleep: '#8c8c8c',
        };
        return colors[type] || '#2B83FF';
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '0',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            {/* 顶部操作栏 */}
            <div style={{
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openAddDrawer}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 500
                        }}
                    >
                        详细添加
                    </Button>

                    <Button
                        type="dashed"
                        onClick={toggleQuickAdd}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 500
                        }}
                    >
                        {quickAddVisible ? '收起快速添加' : '快速添加'}
                    </Button>

                    {steps.length > 0 && (
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={executeSteps}
                            disabled={isRunning}
                            style={{
                                borderRadius: '8px',
                                fontWeight: 500,
                                background: '#52c41a',
                                borderColor: '#52c41a'
                            }}
                        >
                            执行所有步骤 ({steps.length})
                        </Button>
                    )}

                    {isRunning && (
                        <Button
                            type="primary"
                            danger
                            icon={<StopOutlined />}
                            onClick={onStop}
                            style={{
                                borderRadius: '8px',
                                fontWeight: 500
                            }}
                        >
                            停止执行
                        </Button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <Upload
                            beforeUpload={importFromYaml}
                            showUploadList={false}
                            accept=".json,.yaml,.yml"
                        >
                            <Button
                                icon={<UploadOutlined />}
                                style={{ borderRadius: '8px' }}
                            >
                                导入
                            </Button>
                        </Upload>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={exportToYaml}
                            disabled={steps.length === 0}
                            style={{ borderRadius: '8px' }}
                        >
                            导出
                        </Button>
                        {steps.length > 0 && (
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={removeAllSteps}
                                style={{ borderRadius: '8px' }}
                                title="清空所有步骤"
                            >
                                清空
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 快速添加表单 */}
            {quickAddVisible && (
                <div style={{
                    padding: '16px 0',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#f8f9fa'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <Select
                            value={quickStepType}
                            onChange={setQuickStepType}
                            style={{ width: 120 }}
                            size="middle"
                        >
                            <Select.Option value="aiAction">Action</Select.Option>
                            <Select.Option value="aiQuery">Query</Select.Option>
                            <Select.Option value="aiAssert">Assert</Select.Option>
                            <Select.Option value="aiTap">Tap</Select.Option>
                            <Select.Option value="sleep">Sleep</Select.Option>
                        </Select>
                        <Input
                            placeholder={getQuickAddPlaceholder(quickStepType)}
                            value={quickPrompt}
                            onChange={(e) => setQuickPrompt(e.target.value)}
                            onPressEnter={quickAddStep}
                            style={{ flex: 1, minWidth: 250 }}
                            size="middle"
                        />
                        <Button
                            type="primary"
                            onClick={quickAddStep}
                            disabled={!quickPrompt.trim()}
                            style={{
                                borderRadius: '8px',
                                fontWeight: 500
                            }}
                        >
                            添加
                        </Button>
                    </div>
                </div>
            )}

            {/* 步骤列表区域 */}
            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    minHeight: 0,
                    padding: '16px 0'
                }}>
                <div style={{
                    marginBottom: '16px',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>步骤列表</span>
                    <Badge count={steps.length} showZero color="#2B83FF" />
                </div>

                {steps.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        background: '#fafafa',
                        borderRadius: '12px',
                        border: '1px dashed #d9d9d9',
                        margin: '20px 0'
                    }}>
                        <Text type="secondary" style={{ fontSize: '16px', marginBottom: '12px' }}>
                            还没有添加任何步骤
                        </Text>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openAddDrawer}
                            style={{ borderRadius: '8px' }}
                        >
                            添加第一个步骤
                        </Button>
                    </div>
                ) : (
                    <List
                        size="small"
                        dataSource={steps}
                        renderItem={(step, index) => (
                            <List.Item
                                actions={[
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() => openEditDrawer(step)}
                                        size="small"
                                        style={{
                                            borderRadius: '6px',
                                            color: '#1890ff'
                                        }}
                                        title="编辑步骤"
                                    />,
                                    <Button
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeStep(step.id)}
                                        size="small"
                                        danger
                                        style={{
                                            borderRadius: '6px'
                                        }}
                                        title="删除步骤"
                                    />
                                ]}
                                style={{
                                    marginBottom: '8px',
                                    background: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #f0f0f0',
                                    padding: '12px 16px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <Badge
                                        count={index + 1}
                                        color={getStepTypeColor(step.type)}
                                        size="small"
                                        style={{
                                            fontSize: '12px',
                                            minWidth: '24px',
                                            height: '24px',
                                            lineHeight: '24px'
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <Text style={{
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                wordBreak: 'break-word'
                                            }}>
                                                {getStepDescription(step)}
                                            </Text>
                                            {step.deepThink && (
                                                <span style={{
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    letterSpacing: '0.5px',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                    boxShadow: '0 1px 3px rgba(102, 126, 234, 0.3)',
                                                    minWidth: '60px',
                                                    textAlign: 'center'
                                                }}>
                                                    🧠 DEEP
                                                </span>
                                            )}
                                        </div>
                                        <Text type="secondary" style={{
                                            fontSize: '12px',
                                            display: 'block'
                                        }}>
                                            {stepTypeOptions.find(opt => opt.value === step.type)?.label}
                                        </Text>
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
            </div>

            {/* 添加步骤抽屉 */}
            <Drawer
                title="添加步骤"
                placement="right"
                width={480}
                open={addDrawerOpen}
                onClose={closeAddDrawer}
                maskClosable={false}
                extra={
                    <Button onClick={closeAddDrawer} style={{ borderRadius: '6px' }}>
                        取消
                    </Button>
                }
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    height: '100%'
                }}>
                    <Select
                        style={{ width: '100%' }}
                        value={currentStepType}
                        onChange={setCurrentStepType}
                        options={stepTypeOptions}
                        size="large"
                    />

                    {currentStepType !== 'sleep' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                {currentStepType === 'aiInput'
                                    ? "目标元素描述"
                                    : currentStepType === 'aiQuery'
                                        ? "查询内容和格式"
                                        : currentStepType === 'aiAssert'
                                            ? "断言条件"
                                            : "操作描述"}
                            </Text>
                            <TextArea
                                placeholder={
                                    currentStepType === 'aiInput'
                                        ? "描述要输入的目标元素..."
                                        : currentStepType === 'aiQuery'
                                            ? "描述要查询的内容和返回格式..."
                                            : currentStepType === 'aiAssert'
                                                ? "描述要断言的条件..."
                                                : "描述要执行的操作..."
                                }
                                value={currentPrompt}
                                onChange={e => setCurrentPrompt(e.target.value)}
                                rows={4}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(currentStepType === 'aiInput' || currentStepType === 'aiKeyboardPress') && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                {currentStepType === 'aiInput' ? "输入内容" : "按键"}
                            </Text>
                            <Input
                                placeholder={
                                    currentStepType === 'aiInput'
                                        ? "要输入的文本内容"
                                        : "要按的键 (如: Enter, Tab, Escape)"
                                }
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(['aiInput', 'aiKeyboardPress', 'aiScroll'].includes(currentStepType)) && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                目标元素 (可选)
                            </Text>
                            <Input
                                placeholder="目标元素的详细描述"
                                value={currentLocate}
                                onChange={e => setCurrentLocate(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {currentStepType === 'aiQuery' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                结果变量名 (可选)
                            </Text>
                            <Input
                                placeholder="保存查询结果的变量名"
                                value={currentName}
                                onChange={e => setCurrentName(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(['aiTap', 'aiInput', 'aiKeyboardPress', 'aiScroll'].includes(currentStepType)) && (
                        <div>
                            <Checkbox
                                checked={currentDeepThink}
                                onChange={(e) => setCurrentDeepThink(e.target.checked)}
                                style={{ fontSize: '14px' }}
                            >
                                启用 Deep Think (精确定位)
                            </Checkbox>
                            <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: '#666',
                                lineHeight: '1.4'
                            }}>
                                Deep Think 模式通过两次 AI 调用提高元素定位精度，适用于复杂界面或小图标识别
                            </div>
                        </div>
                    )}

                    {currentStepType === 'sleep' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                等待时间
                            </Text>
                            <Input
                                type="number"
                                placeholder="等待时间 (毫秒)"
                                value={currentTimeout}
                                onChange={e => setCurrentTimeout(Number(e.target.value))}
                                addonAfter="ms"
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={addStep}
                            disabled={
                                (currentStepType !== 'sleep' && !currentPrompt.trim()) ||
                                (currentStepType === 'sleep' && !currentTimeout) ||
                                (['aiInput', 'aiKeyboardPress'].includes(currentStepType) && !currentValue.trim())
                            }
                            size="large"
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                height: '44px',
                                fontSize: '16px',
                                fontWeight: 500
                            }}
                        >
                            添加步骤
                        </Button>
                    </div>
                </div>
            </Drawer>

            {/* 编辑步骤抽屉 */}
            <Drawer
                title="编辑步骤"
                placement="right"
                width={480}
                open={editDrawerOpen}
                onClose={closeEditDrawer}
                maskClosable={false}
                extra={
                    <Button onClick={closeEditDrawer} style={{ borderRadius: '6px' }}>
                        取消
                    </Button>
                }
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    height: '100%'
                }}>
                    <Select
                        style={{ width: '100%' }}
                        value={currentStepType}
                        onChange={setCurrentStepType}
                        options={stepTypeOptions}
                        size="large"
                    />

                    {currentStepType !== 'sleep' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                {currentStepType === 'aiInput'
                                    ? "目标元素描述"
                                    : currentStepType === 'aiQuery'
                                        ? "查询内容和格式"
                                        : currentStepType === 'aiAssert'
                                            ? "断言条件"
                                            : "操作描述"}
                            </Text>
                            <TextArea
                                placeholder={
                                    currentStepType === 'aiInput'
                                        ? "描述要输入的目标元素..."
                                        : currentStepType === 'aiQuery'
                                            ? "描述要查询的内容和返回格式..."
                                            : currentStepType === 'aiAssert'
                                                ? "描述要断言的条件..."
                                                : "描述要执行的操作..."
                                }
                                value={currentPrompt}
                                onChange={e => setCurrentPrompt(e.target.value)}
                                rows={4}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(currentStepType === 'aiInput' || currentStepType === 'aiKeyboardPress') && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                {currentStepType === 'aiInput' ? "输入内容" : "按键"}
                            </Text>
                            <Input
                                placeholder={
                                    currentStepType === 'aiInput'
                                        ? "要输入的文本内容"
                                        : "要按的键 (如: Enter, Tab, Escape)"
                                }
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(['aiInput', 'aiKeyboardPress', 'aiScroll'].includes(currentStepType)) && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                目标元素 (可选)
                            </Text>
                            <Input
                                placeholder="目标元素的详细描述"
                                value={currentLocate}
                                onChange={e => setCurrentLocate(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {currentStepType === 'aiQuery' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                结果变量名 (可选)
                            </Text>
                            <Input
                                placeholder="保存查询结果的变量名"
                                value={currentName}
                                onChange={e => setCurrentName(e.target.value)}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    {(['aiTap', 'aiInput', 'aiKeyboardPress', 'aiScroll'].includes(currentStepType)) && (
                        <div>
                            <Checkbox
                                checked={currentDeepThink}
                                onChange={(e) => setCurrentDeepThink(e.target.checked)}
                                style={{ fontSize: '14px' }}
                            >
                                启用 Deep Think (精确定位)
                            </Checkbox>
                            <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: '#666',
                                lineHeight: '1.4'
                            }}>
                                Deep Think 模式通过两次 AI 调用提高元素定位精度，适用于复杂界面或小图标识别
                            </div>
                        </div>
                    )}

                    {currentStepType === 'sleep' && (
                        <div>
                            <Text style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                等待时间
                            </Text>
                            <Input
                                type="number"
                                placeholder="等待时间 (毫秒)"
                                value={currentTimeout}
                                onChange={e => setCurrentTimeout(Number(e.target.value))}
                                addonAfter="ms"
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={addStep}
                            disabled={
                                (currentStepType !== 'sleep' && !currentPrompt.trim()) ||
                                (currentStepType === 'sleep' && !currentTimeout) ||
                                (['aiInput', 'aiKeyboardPress'].includes(currentStepType) && !currentValue.trim())
                            }
                            size="large"
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                height: '44px',
                                fontSize: '16px',
                                fontWeight: 500
                            }}
                        >
                            保存修改
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default StepManager;
