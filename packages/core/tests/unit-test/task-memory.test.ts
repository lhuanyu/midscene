import { TaskExecutor, TaskMemory } from '@/agent';
import { ScreenshotItem } from '@/screenshot-item';
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
});
