// 本地定义类型，避免导入问题
interface TextDecompositionStep {
  type: 'ai' | 'aiTap' | 'aiInput' | 'aiAssert' | 'aiQuery' | 'sleep';
  description: string;
  params?: Record<string, any>;
}

interface TextDecompositionResponse {
  steps: TextDecompositionStep[];
  reasoning?: string;
}

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

/**
 * 将文本分解结果转换为 StepData 格式（用于 StepManager）
 */
export function convertDecompositionToStepData(decomposition: TextDecompositionResponse): StepData[] {
  return decomposition.steps.map((step: TextDecompositionStep, index: number) => {
    const stepId = `decomposed_${Date.now()}_${index}`;

    switch (step.type) {
      case 'ai':
        return {
          id: stepId,
          type: 'aiAction',
          prompt: step.description
        };
      case 'aiTap':
        return {
          id: stepId,
          type: 'aiTap',
          prompt: step.description
        };
      case 'aiInput':
        return {
          id: stepId,
          type: 'aiInput',
          value: step.params?.text || step.description,
          locate: step.params?.target || '输入框'
        };
      case 'aiAssert':
        return {
          id: stepId,
          type: 'aiAssert',
          prompt: step.description
        };
      case 'aiQuery':
        return {
          id: stepId,
          type: 'aiQuery',
          prompt: step.description,
          name: step.params?.name || `query_${index + 1}`
        };
      case 'sleep':
        const timeMatch = step.description.match(/(\d+)/);
        return {
          id: stepId,
          type: 'sleep',
          timeout: timeMatch ? parseInt(timeMatch[1]) : 1000
        };
      default:
        return {
          id: stepId,
          type: 'aiAction',
          prompt: step.description
        };
    }
  });
}

/**
 * 将文本分解结果转换为 MidsceneYamlFlowItem 格式
 */
export function convertDecompositionToYamlFlowItems(decomposition: TextDecompositionResponse) {
  return decomposition.steps.map((step: TextDecompositionStep, index: number) => {
    const flowItem: any = {};
    
    switch (step.type) {
      case 'ai':
        flowItem.ai = step.description;
        break;
      case 'aiTap':
        flowItem.aiTap = step.description;
        break;
      case 'aiInput':
        if (step.params?.text && step.params?.target) {
          flowItem.aiInput = step.params.text;
          flowItem.locate = step.params.target;
        } else {
          // 尝试从描述中解析
          flowItem.aiInput = step.description;
        }
        break;
      case 'aiAssert':
        flowItem.aiAssert = step.description;
        break;
      case 'aiQuery':
        flowItem.aiQuery = step.description;
        if (step.params?.name) {
          flowItem.name = step.params.name;
        }
        break;
      case 'sleep':
        const timeMatch = step.description.match(/(\d+)/);
        flowItem.sleep = timeMatch ? parseInt(timeMatch[1]) : 1000;
        break;
      default:
        flowItem.ai = step.description;
    }

    return {
      id: `step-${index + 1}`,
      data: flowItem,
      type: 'step'
    };
  });
}
