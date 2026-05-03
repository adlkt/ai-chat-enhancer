export type SiteId = 'chatgpt' | 'deepseek';

export interface DeepSeekGroup {
  id: string;
  name: string;
}

export interface DeepSeekStorageState {
  groups: DeepSeekGroup[];
  threadGroupMap: Record<string, string | undefined>;
}

export interface ChatGptStorageState {
  panelEnabled: boolean;
}

export interface ExtensionStorageState {
  deepseek: DeepSeekStorageState;
  chatgpt: ChatGptStorageState;
}

export interface ChatMessageOutlineItem {
  id: string;
  title: string;
  role: 'user' | 'assistant' | 'system';
}

export interface DeepSeekThreadSummary {
  id: string;
  title: string;
  href: string;
  groupId?: string;
}
