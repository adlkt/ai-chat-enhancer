import type {
  ChatGptStorageState,
  DeepSeekGroup,
  DeepSeekStorageState,
  ExtensionStorageState,
} from '@/lib/types';

const STORAGE_KEY = 'aiChatEnhancerState';

const DEFAULT_DEEPSEEK_STATE: DeepSeekStorageState = {
  groups: [],
  threadGroupMap: {},
};

const DEFAULT_CHATGPT_STATE: ChatGptStorageState = {
  panelEnabled: true,
};

const DEFAULT_STATE: ExtensionStorageState = {
  deepseek: DEFAULT_DEEPSEEK_STATE,
  chatgpt: DEFAULT_CHATGPT_STATE,
};

function mergeState(
  rawState: Partial<ExtensionStorageState> | undefined,
): ExtensionStorageState {
  return {
    deepseek: {
      ...DEFAULT_DEEPSEEK_STATE,
      ...rawState?.deepseek,
      groups: rawState?.deepseek?.groups ?? DEFAULT_DEEPSEEK_STATE.groups,
      threadGroupMap:
        rawState?.deepseek?.threadGroupMap ?? DEFAULT_DEEPSEEK_STATE.threadGroupMap,
    },
    chatgpt: {
      ...DEFAULT_CHATGPT_STATE,
      ...rawState?.chatgpt,
    },
  };
}

export async function getExtensionState(): Promise<ExtensionStorageState> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return mergeState(stored[STORAGE_KEY] as Partial<ExtensionStorageState> | undefined);
}

export async function setExtensionState(
  updater:
    | ExtensionStorageState
    | ((current: ExtensionStorageState) => ExtensionStorageState),
): Promise<ExtensionStorageState> {
  const current = await getExtensionState();
  const next = typeof updater === 'function' ? updater(current) : updater;
  const merged = mergeState(next);
  await browser.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

export async function ensureDefaultState(): Promise<void> {
  const current = await getExtensionState();
  await browser.storage.local.set({ [STORAGE_KEY]: current });
}

export async function getDeepSeekState(): Promise<DeepSeekStorageState> {
  const state = await getExtensionState();
  return state.deepseek;
}

export async function addDeepSeekGroup(name: string): Promise<DeepSeekGroup> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('Group name is required.');
  }

  const group: DeepSeekGroup = {
    id: crypto.randomUUID(),
    name: normalizedName,
  };

  await setExtensionState((current) => ({
    ...current,
    deepseek: {
      ...current.deepseek,
      groups: [...current.deepseek.groups, group],
    },
  }));

  return group;
}

export async function assignDeepSeekThreadToGroup(
  threadId: string,
  groupId?: string,
): Promise<void> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return;

  await setExtensionState((current) => {
    const nextMap = { ...current.deepseek.threadGroupMap };

    if (groupId) {
      nextMap[normalizedThreadId] = groupId;
    } else {
      delete nextMap[normalizedThreadId];
    }

    return {
      ...current,
      deepseek: {
        ...current.deepseek,
        threadGroupMap: nextMap,
      },
    };
  });
}

export async function toggleChatGptPanelEnabled(): Promise<boolean> {
  const next = await setExtensionState((current) => ({
    ...current,
    chatgpt: {
      ...current.chatgpt,
      panelEnabled: !current.chatgpt.panelEnabled,
    },
  }));

  return next.chatgpt.panelEnabled;
}

export async function resetExtensionState(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: DEFAULT_STATE });
}
