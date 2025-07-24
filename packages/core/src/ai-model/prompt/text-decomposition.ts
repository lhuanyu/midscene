import { AIActionType, callAiFn } from '../common';

export interface TextDecompositionResponse {
  steps: Array<{
    type: 'ai' | 'aiTap' | 'aiInput' | 'aiAssert' | 'aiQuery' | 'sleep';
    description: string;
    params?: Record<string, any>;
  }>;
  reasoning?: string;
}

/**
 * System prompt for text decomposition
 */
const SYSTEM_PROMPT = `You are an expert in test automation. Your task is to decompose a natural language test case into structured automation steps.

Available step types:
- ai: General automation action (e.g., "click button", "navigate to page")
- aiTap: Click/tap on specific element
- aiInput: Input text into fields  
- aiAssert: Verify/assert conditions
- aiQuery: Extract data from page
- sleep: Wait for specified time

Rules:
1. Break down complex instructions into simple, atomic steps
2. Use specific step types when appropriate
3. For aiInput, include both the text to input and target element
4. For aiTap/aiInput, be specific about element descriptions
5. Add sleep steps when waiting is needed
6. Provide clear, actionable descriptions

Return format:
{
  "steps": [
    {
      "type": "ai|aiTap|aiInput|aiAssert|aiQuery|sleep",
      "description": "Clear description of what to do",
      "params": {"key": "value"} // optional additional parameters
    }
  ],
  "reasoning": "Brief explanation of the decomposition strategy"
}`;

/**
 * 纯文本测试用例分解功能
 * 不依赖图片，只使用文本描述来分解测试步骤
 */
export async function decomposeTestCaseByText(
  instruction: string
): Promise<TextDecompositionResponse> {
  const userPrompt = `Please decompose this test case into automation steps:

"${instruction}"

Focus on creating practical, executable steps that can be run by an automation framework.`;

  try {
    const { content } = await callAiFn<TextDecompositionResponse>(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      AIActionType.EXTRACT_DATA // 使用数据提取类型，因为我们要提取结构化数据
    );

    return content;
  } catch (error) {
    console.error('Text decomposition failed:', error);
    throw new Error(`Failed to decompose test case: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
