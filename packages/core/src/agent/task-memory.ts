import { isDeepStrictEqual } from 'node:util';
import type { TUserPrompt } from '@/ai-model';
import { getDebug } from '@midscene/shared/logger';
import type { LocateCache, MatchCacheResult } from './task-cache';

const debug = getDebug('memory');

export class TaskMemory {
  private memories: LocateCache[] = [];

  matchLocateMemory(
    prompt: TUserPrompt,
  ): MatchCacheResult<LocateCache> | undefined {
    const memory = this.memories.find((item) =>
      isDeepStrictEqual(item.prompt, prompt),
    );
    if (!memory) {
      debug('no memory found, prompt: %s', prompt);
      return undefined;
    }

    debug('memory found, prompt: %s', prompt);
    return {
      cacheContent: memory,
      updateFn: (cb: (cache: LocateCache) => void) => {
        cb(memory);
      },
    };
  }

  appendMemory(memory: LocateCache) {
    debug('will append memory', memory);
    this.memories.push(memory);
  }

  updateOrAppendMemoryRecord(
    newRecord: LocateCache,
    cachedRecord?: MatchCacheResult<LocateCache>,
  ) {
    if (cachedRecord) {
      cachedRecord.updateFn((cache) => {
        cache.cache = newRecord.cache;
        if ('xpaths' in cache) {
          cache.xpaths = undefined;
        }
      });
      return;
    }

    const existingRecord = this.matchLocateMemory(newRecord.prompt);
    if (existingRecord) {
      this.updateOrAppendMemoryRecord(newRecord, existingRecord);
      return;
    }

    this.appendMemory(newRecord);
  }

  removeLocateMemory(prompt: TUserPrompt): number {
    return this.removeLocateMemoriesBy((item) =>
      isDeepStrictEqual(item.prompt, prompt),
    );
  }

  removeLocateMemoriesByPrefix(prefix: string): number {
    const normalizedPrefix = prefix.trim();
    if (!normalizedPrefix) {
      return 0;
    }

    return this.removeLocateMemoriesBy(
      (item) =>
        typeof item.prompt === 'string' &&
        item.prompt.startsWith(normalizedPrefix),
    );
  }

  removeAllLocateMemories(): number {
    return this.removeLocateMemoriesBy(() => true);
  }

  private removeLocateMemoriesBy(
    predicate: (item: LocateCache) => boolean,
  ): number {
    const originalLength = this.memories.length;
    this.memories = this.memories.filter((item) => !predicate(item));
    const removed = originalLength - this.memories.length;
    if (removed > 0) {
      debug('removed %d memory record(s)', removed);
    }
    return removed;
  }
}
