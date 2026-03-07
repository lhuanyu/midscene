import type { TUserPrompt } from '@/ai-model';
import { generateHashId } from '@midscene/shared/utils';

export function normalizePromptForMemory(
  prompt: TUserPrompt | undefined,
): string | undefined {
  if (!prompt) {
    return undefined;
  }

  if (typeof prompt === 'string') {
    const normalized = prompt.trim();
    return normalized || undefined;
  }

  // Skip multimodal prompt for auto memory to avoid accidental collisions.
  if (prompt.images?.length) {
    return undefined;
  }

  const plainPrompt = prompt.prompt?.trim();
  return plainPrompt || undefined;
}

function memoryIdentity(normalizedPrompt: string): string {
  return generateHashId(undefined, normalizedPrompt);
}

export function buildMemoryCachePrompt(
  prompt: TUserPrompt | undefined,
  options?: {
    duplicateIndex?: number;
  },
): string | undefined {
  const normalizedPrompt = normalizePromptForMemory(prompt);
  if (!normalizedPrompt) {
    return undefined;
  }
  const index =
    options?.duplicateIndex && options.duplicateIndex > 0
      ? `#${options.duplicateIndex}`
      : '';
  return `memory://${memoryIdentity(normalizedPrompt)}${index}`;
}

export function buildMemoryCachePrefixByPrompt(
  prompt: TUserPrompt,
): string | undefined {
  const normalizedPrompt = normalizePromptForMemory(prompt);
  if (!normalizedPrompt) {
    return undefined;
  }
  return `memory://${memoryIdentity(normalizedPrompt)}`;
}
