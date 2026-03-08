import { Agent, TaskExecutor, TaskMemory } from '@/agent';
import { ScreenshotItem } from '@/screenshot-item';
import {
  MIDSCENE_MODEL_API_KEY,
  MIDSCENE_MODEL_BASE_URL,
  MIDSCENE_MODEL_FAMILY,
  MIDSCENE_MODEL_NAME,
} from '@midscene/shared/env';
import { describe, expect, it, vi } from 'vitest';

const validBase64Image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('TaskMemory', () => {
  it('updates and clears memory records independently from task cache', () => {
    const taskMemory = new TaskMemory();

    taskMemory.updateOrAppendMemoryRecord({
      type: 'locate',
      prompt: 'memory://button',
      cache: { xpaths: ['//button[1]'] },
    });
    taskMemory.updateOrAppendMemoryRecord({
      type: 'locate',
      prompt: 'memory://button',
      cache: { xpaths: ['//button[2]'] },
    });
    taskMemory.updateOrAppendMemoryRecord({
      type: 'locate',
      prompt: 'memory://field#1',
      cache: { xpaths: ['//input[1]'] },
    });

    expect(
      taskMemory.matchLocateMemory('memory://button')?.cacheContent.cache,
    ).toEqual({
      xpaths: ['//button[2]'],
    });
    expect(taskMemory.removeLocateMemoriesByPrefix('memory://')).toBe(2);
    expect(taskMemory.matchLocateMemory('memory://button')).toBeUndefined();
  });

  it('reuses stored memory without requiring persistent cache configuration', async () => {
    const taskMemory = new TaskMemory();
    const cachedRect = { left: 90, top: 90, width: 20, height: 20 };
    const cacheFeature = { xpaths: ['//button[1]'], rect: cachedRect };

    const mockInterface = {
      interfaceType: 'android',
      actionSpace: vi.fn().mockReturnValue([]),
      rectMatchesCacheFeature: vi.fn().mockResolvedValue(cachedRect),
      cacheFeatureForPoint: vi.fn().mockResolvedValue(cacheFeature),
    } as any;

    const mockService = {
      contextRetrieverFn: vi.fn().mockResolvedValue({
        screenshot: ScreenshotItem.create(validBase64Image, Date.now()),
        shotSize: { width: 200, height: 200 },
        shrunkShotToLogicalRatio: 1,
      }),
      locate: vi.fn().mockResolvedValue({
        element: {
          id: 'element-id',
          center: [100, 100],
          rect: cachedRect,
          xpaths: [],
          attributes: {},
        },
      }),
    } as any;

    const taskExecutor = new TaskExecutor(mockInterface, mockService, {
      taskMemory,
      actionSpace: mockInterface.actionSpace(),
    });

    const plan = {
      type: 'Locate',
      param: {
        prompt: 'button',
        memory: 'memory://button',
        useMemory: true,
      },
      thought: '',
    } as any;

    await taskExecutor.runPlans('locate button', [plan], {} as any, {} as any);
    await taskExecutor.runPlans(
      'locate button again',
      [plan],
      {} as any,
      {} as any,
    );

    expect(mockService.locate).toHaveBeenCalledTimes(1);
    expect(mockInterface.rectMatchesCacheFeature).toHaveBeenCalledTimes(1);
    expect(
      taskMemory.matchLocateMemory('memory://button')?.cacheContent.cache,
    ).toEqual(cacheFeature);
  });

  it('records locate memory but does not reuse it unless useMemory is enabled', async () => {
    const taskMemory = new TaskMemory();
    const cachedRect = { left: 90, top: 90, width: 20, height: 20 };
    const cacheFeature = { xpaths: ['//button[1]'], rect: cachedRect };

    const mockInterface = {
      interfaceType: 'android',
      actionSpace: vi.fn().mockReturnValue([]),
      rectMatchesCacheFeature: vi.fn().mockResolvedValue(cachedRect),
      cacheFeatureForPoint: vi.fn().mockResolvedValue(cacheFeature),
    } as any;

    const mockService = {
      contextRetrieverFn: vi.fn().mockResolvedValue({
        screenshot: ScreenshotItem.create(validBase64Image, Date.now()),
        shotSize: { width: 200, height: 200 },
        shrunkShotToLogicalRatio: 1,
      }),
      locate: vi.fn().mockResolvedValue({
        element: {
          id: 'element-id',
          center: [100, 100],
          rect: cachedRect,
          xpaths: [],
          attributes: {},
        },
      }),
    } as any;

    const taskExecutor = new TaskExecutor(mockInterface, mockService, {
      taskMemory,
      actionSpace: mockInterface.actionSpace(),
    });

    const plan = {
      type: 'Locate',
      param: {
        prompt: 'button',
        memory: 'memory://button',
        useMemory: false,
      },
      thought: '',
    } as any;

    await taskExecutor.runPlans('locate button', [plan], {} as any, {} as any);
    await taskExecutor.runPlans(
      'locate button again',
      [plan],
      {} as any,
      {} as any,
    );

    expect(mockService.locate).toHaveBeenCalledTimes(2);
    expect(mockInterface.rectMatchesCacheFeature).not.toHaveBeenCalled();
    expect(
      taskMemory.matchLocateMemory('memory://button')?.cacheContent.cache,
    ).toEqual(cacheFeature);
  });

  it('defaults aiLocate auto memory to manual reuse', () => {
    const testModelConfig = {
      [MIDSCENE_MODEL_NAME]: 'qwen2.5-vl-max',
      [MIDSCENE_MODEL_API_KEY]: 'test-key',
      [MIDSCENE_MODEL_BASE_URL]: 'https://api.sample.com/v1',
      [MIDSCENE_MODEL_FAMILY]: 'qwen2.5-vl' as const,
    };

    const agent = new Agent(
      {
        interfaceType: 'puppeteer',
        actionSpace: () => [],
      } as any,
      {
        modelConfig: testModelConfig,
      },
    );

    const locateOptions = (agent as any).withAutoMemoryForLocate('button');

    expect(locateOptions.useMemory).toBe(false);
    expect(locateOptions.memory).toBeTruthy();
  });
});
