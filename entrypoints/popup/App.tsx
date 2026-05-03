import { useEffect, useState } from 'react';
import { getExtensionState, resetExtensionState, toggleChatGptPanelEnabled } from '@/lib/storage';
import type { ExtensionStorageState } from '@/lib/types';
import './App.css';

function App() {
  const [state, setState] = useState<ExtensionStorageState | null>(null);

  useEffect(() => {
    void getExtensionState().then(setState);
  }, []);

  const refresh = async () => {
    const next = await getExtensionState();
    setState(next);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AI 聊天增强器</p>
          <h1>ChatGPT 大纲</h1>
        </div>
        <span className={state?.chatgpt.panelEnabled ? 'status is-on' : 'status'}>
          {state ? (state.chatgpt.panelEnabled ? '已开启' : '已关闭') : '加载中'}
        </span>
      </header>

      <p className="intro">在 ChatGPT 右侧显示阅读大纲，点击可跳到对应问题。</p>

      <button
        className="primary-button"
        disabled={!state}
        onClick={async () => {
          await toggleChatGptPanelEnabled();
          await refresh();
        }}
      >
        {state?.chatgpt.panelEnabled ? '关闭大纲' : '开启大纲'}
      </button>

      <a className="secondary-button" href="https://chatgpt.com/" target="_blank" rel="noreferrer">
        打开 ChatGPT
      </a>

      <button
        className="text-button"
        disabled={!state}
        onClick={async () => {
          await resetExtensionState();
          await refresh();
        }}
      >
        重置设置
      </button>
    </main>
  );
}

export default App;
