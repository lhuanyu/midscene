import { SettingOutlined } from '@ant-design/icons';
import { Input, Modal, Tooltip, Tabs, Form, Select, Switch, Button, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useEnvConfig } from './store/store';

// 定义环境变量字段配置
const ENV_FIELDS = {
  common: [
    { key: 'OPENAI_API_KEY', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
    { key: 'OPENAI_BASE_URL', label: 'Base URL', type: 'input', placeholder: 'https://api.openai.com/v1' },
    {
      key: 'MIDSCENE_MODEL_NAME', label: 'Model Name', type: 'select', placeholder: 'gpt-4o',
      options: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-2024-11-20', label: 'GPT-4o (2024-11-20)' },
        { value: 'gpt-4o-2024-08-06', label: 'GPT-4o (2024-08-06)' },
        { value: 'qwen/qwen2.5-vl-72b-instruct', label: 'Qwen2.5-VL-72B' },
        { value: 'qwen-vl-max-latest', label: 'Qwen-VL-Max (Aliyun)' },
        { value: 'gemini-2.5-pro-preview-05-06', label: 'Gemini-2.5-Pro' },
        { value: 'claude-3-opus-20240229', label: 'Claude-3-Opus' },
        { value: 'doubao-1.5-thinking-vision-pro', label: 'Doubao-1.5-Thinking-Vision-Pro' },
        { value: 'ui-tars-72b-sft', label: 'UI-TARS-72B' },
      ]
    },
  ],
  modelSpecific: [
    { key: 'MIDSCENE_USE_QWEN_VL', label: 'Use Qwen VL', type: 'switch', description: 'Enable Qwen 2.5 VL model adapter' },
    {
      key: 'MIDSCENE_USE_VLM_UI_TARS', label: 'UI-TARS Version', type: 'select', placeholder: 'Select version',
      options: [
        { value: '', label: 'Disabled' },
        { value: '1.0', label: 'UI-TARS 1.0' },
        { value: '1.5', label: 'UI-TARS 1.5' },
        { value: 'DOUBAO', label: 'Doubao (Volcengine)' },
      ]
    },
    { key: 'MIDSCENE_USE_GEMINI', label: 'Use Gemini', type: 'switch', description: 'Enable Gemini 2.5 Pro model adapter' },
    { key: 'MIDSCENE_USE_DOUBAO_VISION', label: 'Use Doubao Vision', type: 'switch', description: 'Enable Doubao vision model adapter' },
    { key: 'MIDSCENE_USE_ANTHROPIC_SDK', label: 'Use Anthropic SDK', type: 'switch', description: 'Use Anthropic SDK for Claude models' },
  ],
  azure: [
    { key: 'MIDSCENE_USE_AZURE_OPENAI', label: 'Use Azure OpenAI', type: 'switch', description: 'Enable Azure OpenAI Service' },
    { key: 'AZURE_OPENAI_ENDPOINT', label: 'Azure Endpoint', type: 'input', placeholder: 'https://your-resource.openai.azure.com/' },
    { key: 'AZURE_OPENAI_KEY', label: 'Azure API Key', type: 'password', placeholder: 'Your Azure API key' },
    { key: 'AZURE_OPENAI_API_VERSION', label: 'Azure API Version', type: 'input', placeholder: '2024-05-01-preview' },
    { key: 'AZURE_OPENAI_DEPLOYMENT', label: 'Azure Deployment', type: 'input', placeholder: 'gpt-4o' },
    { key: 'MIDSCENE_AZURE_OPENAI_SCOPE', label: 'Azure Scope', type: 'input', placeholder: 'https://cognitiveservices.azure.com/.default' },
  ],
  anthropic: [
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', type: 'password', placeholder: 'Your Anthropic API key' },
  ],
  advanced: [
    { key: 'OPENAI_USE_AZURE', label: 'Use Azure (Legacy)', type: 'switch', description: 'Legacy Azure OpenAI flag' },
    { key: 'MIDSCENE_OPENAI_INIT_CONFIG_JSON', label: 'OpenAI Init Config JSON', type: 'textarea', placeholder: '{"defaultHeaders":{"HTTP-Referer":"...","X-Title":"..."}}' },
    { key: 'MIDSCENE_OPENAI_HTTP_PROXY', label: 'HTTP Proxy', type: 'input', placeholder: 'http://127.0.0.1:8080' },
    { key: 'MIDSCENE_OPENAI_SOCKS_PROXY', label: 'SOCKS Proxy', type: 'input', placeholder: 'socks5://127.0.0.1:1080' },
    {
      key: 'MIDSCENE_PREFERRED_LANGUAGE', label: 'Preferred Language', type: 'select', placeholder: 'Auto',
      options: [
        { value: '', label: 'Auto' },
        { value: 'English', label: 'English' },
        { value: 'Chinese', label: 'Chinese' },
      ]
    },
    { key: 'OPENAI_MAX_TOKENS', label: 'Max Tokens', type: 'number', placeholder: '4096' },
  ],
  debug: [
    {
      key: 'DEBUG', label: 'Debug Mode', type: 'select', placeholder: 'None',
      options: [
        { value: '', label: 'None' },
        { value: 'midscene:ai:profile:stats', label: 'AI Profile Stats' },
        { value: 'midscene:ai:profile:detail', label: 'AI Profile Detail' },
        { value: 'midscene:ai:call', label: 'AI Call' },
        { value: 'midscene:android:adb', label: 'Android ADB' },
      ]
    },
  ],
};

export function EnvConfig({
  showTooltipWhenEmpty = true,
  showModelName = true,
  tooltipPlacement = 'bottom',
  mode = 'icon',
}: {
  showTooltipWhenEmpty?: boolean;
  showModelName?: boolean;
  tooltipPlacement?: 'bottom' | 'top';
  mode?: 'icon' | 'text';
}) {
  const { config, configString, loadConfig, syncFromStorage } = useEnvConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempConfigString, setTempConfigString] = useState(configString);
  const [activeTab, setActiveTab] = useState('form');
  const [form] = Form.useForm();
  const midsceneModelName = config.MIDSCENE_MODEL_NAME;
  const componentRef = useRef<HTMLDivElement>(null);

  // 将配置对象转换为表单值
  const configToFormValues = (config: Record<string, string>) => {
    const formValues: Record<string, any> = {};
    Object.keys(config).forEach(key => {
      const value = config[key];
      // 处理switch类型的字段
      if (['MIDSCENE_USE_QWEN_VL', 'MIDSCENE_USE_GEMINI', 'MIDSCENE_USE_DOUBAO_VISION',
        'MIDSCENE_USE_ANTHROPIC_SDK', 'MIDSCENE_USE_AZURE_OPENAI', 'OPENAI_USE_AZURE'].includes(key)) {
        formValues[key] = value === '1' || value === 'true';
      } else {
        formValues[key] = value || undefined;
      }
    });
    return formValues;
  };

  // 将表单值转换为配置对象
  const formValuesToConfig = (values: Record<string, any>) => {
    const config: Record<string, string> = {};
    Object.keys(values).forEach(key => {
      const value = values[key];
      if (value !== undefined && value !== null && value !== '') {
        // 处理switch类型的字段
        if (typeof value === 'boolean') {
          config[key] = value ? '1' : '';
        } else {
          config[key] = String(value);
        }
      }
    });
    return config;
  };

  // 将配置对象转换为配置字符串
  const configToString = (config: Record<string, string>) => {
    return Object.entries(config)
      .filter(([, value]) => value && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  };

  const showModal = (e: React.MouseEvent) => {
    // every time open modal, sync from localStorage
    syncFromStorage();

    setIsModalOpen(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleOk = () => {
    if (activeTab === 'form') {
      // 从表单获取数据
      form.validateFields().then(values => {
        const newConfig = formValuesToConfig(values);
        const newConfigString = configToString(newConfig);
        setTempConfigString(newConfigString);
        loadConfig(newConfigString);
        setIsModalOpen(false);
      }).catch(err => {
        console.error('Form validation failed:', err);
      });
    } else {
      // 从文本获取数据
      loadConfig(tempConfigString);
      setIsModalOpen(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'form') {
      // 切换到表单时，同步数据到表单
      const formValues = configToFormValues(config);
      form.setFieldsValue(formValues);
    } else {
      // 切换到文本时，同步表单数据到文本
      if (activeTab === 'form') {
        const values = form.getFieldsValue();
        const newConfig = formValuesToConfig(values);
        const newConfigString = configToString(newConfig);
        setTempConfigString(newConfigString);
      }
    }
  };

  const handleResetForm = () => {
    form.resetFields();
  };

  const renderFormField = (field: any) => {
    const { key, label, type, required, placeholder, options, description } = field;

    switch (type) {
      case 'password':
        return (
          <Form.Item
            name={key}
            label={label}
            rules={required ? [{ required: true, message: `请输入${label}` }] : []}
            extra={description}
          >
            <Input.Password placeholder={placeholder} />
          </Form.Item>
        );
      case 'textarea':
        return (
          <Form.Item
            name={key}
            label={label}
            rules={required ? [{ required: true, message: `请输入${label}` }] : []}
            extra={description}
          >
            <Input.TextArea rows={3} placeholder={placeholder} />
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item
            name={key}
            label={label}
            rules={required ? [{ required: true, message: `请输入${label}` }] : []}
            extra={description}
          >
            <Input type="number" placeholder={placeholder} />
          </Form.Item>
        );
      case 'select':
        return (
          <Form.Item
            name={key}
            label={label}
            rules={required ? [{ required: true, message: `请选择${label}` }] : []}
            extra={description}
          >
            <Select
              placeholder={placeholder}
              allowClear
              options={options}
            />
          </Form.Item>
        );
      case 'switch':
        return (
          <Form.Item
            name={key}
            label={label}
            valuePropName="checked"
            extra={description}
          >
            <Switch />
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            name={key}
            label={label}
            rules={required ? [{ required: true, message: `请输入${label}` }] : []}
            extra={description}
          >
            <Input placeholder={placeholder} />
          </Form.Item>
        );
    }
  };

  // when modal is open, use the latest config string
  useEffect(() => {
    if (isModalOpen) {
      setTempConfigString(configString);
      if (activeTab === 'form') {
        const formValues = configToFormValues(config);
        form.setFieldsValue(formValues);
      }
    }
  }, [isModalOpen, configString, config, activeTab, form]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        alignItems: 'center',
        height: '100%',
        minHeight: '32px',
      }}
      ref={componentRef}
    >
      {showModelName ? midsceneModelName : null}
      <Tooltip
        title="Please set up your environment variables before using."
        placement={tooltipPlacement}
        align={{ offset: [-10, 5] }}
        getPopupContainer={() => componentRef.current as HTMLElement}
        open={
          // undefined for default behavior of tooltip, hover for show
          // close tooltip when modal is open
          isModalOpen
            ? false
            : showTooltipWhenEmpty
              ? Object.keys(config).length === 0
              : undefined
        }
      >
        {mode === 'icon' ? (
          <SettingOutlined onClick={showModal} />
        ) : (
          <span
            onClick={showModal}
            style={{ color: '#006AFF', cursor: 'pointer' }}
          >
            set up
          </span>
        )}
      </Tooltip>
      <Modal
        title="Model Env Config"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Save"
        width={800}
        style={{ marginTop: '5%' }}
        destroyOnClose={true}
        maskClosable={true}
        centered={true}
      >
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <Tabs.TabPane tab="表单配置" key="form">
            <Form
              form={form}
              layout="vertical"
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Button onClick={handleResetForm}>重置表单</Button>
                </Space>
              </div>

              <h4>基础配置</h4>
              {ENV_FIELDS.common.map(field => renderFormField(field))}

              <h4>模型特定配置</h4>
              {ENV_FIELDS.modelSpecific.map(field => renderFormField(field))}

              <h4>Azure OpenAI 配置</h4>
              {ENV_FIELDS.azure.map(field => renderFormField(field))}

              <h4>Anthropic 配置</h4>
              {ENV_FIELDS.anthropic.map(field => renderFormField(field))}

              <h4>高级配置</h4>
              {ENV_FIELDS.advanced.map(field => renderFormField(field))}

              <h4>调试配置</h4>
              {ENV_FIELDS.debug.map(field => renderFormField(field))}
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="环境变量文本" key="text">
            <Input.TextArea
              rows={15}
              placeholder={
                'OPENAI_API_KEY=sk-...\nMIDSCENE_MODEL_NAME=gpt-4o-2024-08-06\n...'
              }
              value={tempConfigString}
              onChange={(e) => setTempConfigString(e.target.value)}
              style={{ whiteSpace: 'nowrap', wordWrap: 'break-word' }}
            />
            <div style={{ marginTop: 12 }}>
              <p>The format is KEY=VALUE and separated by new lines.</p>
              <p>
                These data will be saved <strong>locally in your browser</strong>.
              </p>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </div>
  );
}
