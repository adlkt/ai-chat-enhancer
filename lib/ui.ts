const PANEL_HOST_ID = 'ai-chat-enhancer-host';

function ensureGlobalHost(): HTMLDivElement {
  let host = document.getElementById(PANEL_HOST_ID) as HTMLDivElement | null;

  if (!host) {
    host = document.createElement('div');
    host.id = PANEL_HOST_ID;
    document.documentElement.appendChild(host);
  }

  return host;
}

export function mountPanelRoot(panelId: string) {
  const globalHost = ensureGlobalHost();
  let panelHost = globalHost.querySelector<HTMLDivElement>(`[data-panel-id="${panelId}"]`);

  if (!panelHost) {
    panelHost = document.createElement('div');
    panelHost.dataset.panelId = panelId;
    globalHost.appendChild(panelHost);
  }

  const shadowRoot = panelHost.shadowRoot ?? panelHost.attachShadow({ mode: 'open' });

  let styleTag = shadowRoot.querySelector<HTMLStyleElement>('style[data-base-style="true"]');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.dataset.baseStyle = 'true';
    styleTag.textContent = `
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      button, input, select { font: inherit; }

      .ace-outline-rail {
        --ace-accent: #4d6bfe;
        --ace-text: rgba(31, 35, 41, 0.64);
        --ace-strong: rgba(31, 35, 41, 0.94);
        --ace-muted: rgba(31, 35, 41, 0.24);
        --ace-outline-edge-gap: 18px;
        --ace-outline-trigger-width: 16px;
        --ace-outline-mark-width: 22px;
        --ace-outline-list-width: min(286px, calc(100vw - 48px));
        --ace-outline-panel-max-height: min(38vh, 340px);
        --ace-outline-track-height: 18px;
        position: absolute;
        top: 112px;
        right: var(--ace-outline-edge-gap);
        bottom: 132px;
        width: var(--ace-outline-list-width);
        pointer-events: none;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ace-text);
      }

      .ace-outline-ticks {
        position: absolute;
        top: 50%;
        right: 0;
        width: 36px;
        height: min(var(--ace-outline-track-height), var(--ace-outline-panel-max-height));
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-start;
        gap: 8px;
        overflow: hidden;
        transform: translateY(-50%);
        pointer-events: auto;
      }

      .ace-outline-hit {
        position: absolute;
        top: 50%;
        right: calc(-1 * var(--ace-outline-edge-gap));
        width: var(--ace-outline-trigger-width);
        height: min(var(--ace-outline-track-height), var(--ace-outline-panel-max-height));
        transform: translateY(-50%);
        pointer-events: none;
      }

      .ace-outline-rail[data-suspended="true"] {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .ace-outline-tick {
        appearance: none;
        position: relative;
        flex: 0 0 18px;
        width: 34px;
        height: 18px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: transparent;
        cursor: pointer;
      }

      .ace-outline-tick::before {
        content: "";
        position: absolute;
        top: 50%;
        right: 4px;
        width: var(--ace-outline-mark-width);
        height: 3px;
        border-radius: 999px;
        transform: translateY(-50%);
        background: rgba(31, 35, 41, 0.22);
      }

      .ace-outline-tick:hover,
      .ace-outline-tick[data-active="true"] {
        opacity: 1;
      }

      .ace-outline-tick:hover::before {
        background: var(--ace-strong);
      }

      .ace-outline-tick[data-active="true"]::before {
        background: var(--ace-accent);
      }

      .ace-outline-ticks::after {
        display: none;
      }

      .ace-outline-list {
        position: absolute;
        top: 50%;
        right: 0;
        width: var(--ace-outline-list-width);
        max-height: var(--ace-outline-panel-max-height);
        transform: translateY(-50%);
        opacity: 0;
        pointer-events: none;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 12px 8px 12px 16px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(31, 35, 41, 0.08);
        box-shadow: 0 14px 36px rgba(15, 23, 42, 0.11);
        backdrop-filter: blur(14px) saturate(1.06);
        scrollbar-width: thin;
        scrollbar-color: rgba(31, 35, 41, 0.16) transparent;
      }

      .ace-outline-rail[data-open="true"] .ace-outline-list,
      .ace-outline-list:focus-within {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(-50%);
      }

      .ace-outline-entry {
        appearance: none;
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 24px;
        gap: 8px;
        align-items: center;
        min-height: 34px;
        padding: 4px 0 4px 8px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--ace-text);
        cursor: pointer;
        text-align: right;
        position: relative;
      }

      .ace-outline-entry:hover {
        background: transparent;
        color: var(--ace-strong);
      }

      .ace-outline-entry[data-active="true"] {
        color: var(--ace-accent);
        font-weight: 650;
      }

      .ace-outline-entry-title {
        display: block;
        overflow: hidden;
        color: inherit;
        font-size: 13px;
        line-height: 1.5;
        text-overflow: ellipsis;
        white-space: nowrap;
        word-break: normal;
      }

      .ace-outline-entry-mark {
        justify-self: end;
        width: var(--ace-outline-mark-width);
        height: 3px;
        border-radius: 999px;
        background: rgba(31, 35, 41, 0.22);
      }

      .ace-outline-entry:hover .ace-outline-entry-mark {
        background: var(--ace-strong);
      }

      .ace-outline-entry[data-active="true"] .ace-outline-entry-mark {
        background: var(--ace-accent);
      }

      .ace-outline-tooltip {
        position: absolute;
        right: calc(var(--ace-outline-list-width) + var(--ace-outline-edge-gap) - 34px);
        width: max-content;
        max-width: min(320px, 38vw);
        transform: translateY(-50%);
        padding: 7px 11px;
        border-radius: 9px;
        background: rgba(44, 44, 47, 0.96);
        color: rgba(255, 255, 255, 0.94);
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
        font-size: 12px;
        line-height: 1.45;
        font-weight: 400;
        white-space: normal;
        pointer-events: none;
      }

      .ace-card,
      .ace-surface {
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(15, 23, 42, 0.1);
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(20px);
      }

      .ace-title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
      }

      .ace-caption {
        margin: 0;
        color: #6b7280;
        font-size: 11px;
        line-height: 1.45;
      }

      .ace-button {
        appearance: none;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.7);
        color: #0f172a;
        border-radius: 8px;
        padding: 6px 8px;
        cursor: pointer;
      }

      .ace-input,
      .ace-select {
        width: 100%;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.78);
        color: #0f172a;
        padding: 6px 8px;
      }

      .ace-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.06);
        color: #4b5563;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
      }

      @media (prefers-color-scheme: dark) {
        .ace-outline-rail {
          --ace-accent: #8ab4ff;
          --ace-text: rgba(245, 245, 245, 0.58);
          --ace-strong: rgba(255, 255, 255, 0.94);
          --ace-muted: rgba(245, 245, 245, 0.28);
        }

        .ace-outline-tick::before {
          background: rgba(245, 245, 245, 0.28);
        }

        .ace-outline-list {
          background: rgba(34, 34, 36, 0.96);
          border-color: rgba(255, 255, 255, 0.09);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.36);
        }

        .ace-outline-entry:hover {
          color: rgba(255, 255, 255, 0.94);
          background: transparent;
        }

        .ace-outline-entry-mark {
          background: rgba(245, 245, 245, 0.28);
        }

        .ace-card,
        .ace-surface {
          color: #e5e7eb;
          background: rgba(23, 23, 23, 0.9);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .ace-caption {
          color: #9ca3af;
        }

        .ace-button,
        .ace-input,
        .ace-select {
          background: rgba(36, 36, 36, 0.9);
          color: #e5e7eb;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .ace-badge {
          background: rgba(255, 255, 255, 0.08);
          color: #d1d5db;
        }
      }
    `;
    shadowRoot.appendChild(styleTag);
  }

  let mountNode = shadowRoot.querySelector<HTMLDivElement>('[data-mount-node="true"]');
  if (!mountNode) {
    mountNode = document.createElement('div');
    mountNode.dataset.mountNode = 'true';
    shadowRoot.appendChild(mountNode);
  }

  return { panelHost, shadowRoot, mountNode };
}

export function getExtensionHost() {
  return document.getElementById(PANEL_HOST_ID);
}

export function unmountPanelRoot(panelId: string) {
  const globalHost = getExtensionHost();
  if (!globalHost) return;

  const panelHost = globalHost.querySelector(`[data-panel-id="${panelId}"]`);
  panelHost?.remove();

  if (!globalHost.childElementCount) {
    globalHost.remove();
  }
}
