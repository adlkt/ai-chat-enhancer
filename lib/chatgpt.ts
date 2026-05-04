import type { ChatMessageOutlineItem } from '@/lib/types';
import {
  createDebouncedTask,
  createVisibleElementTracker,
  isChatGptConversationPage,
  observeDocumentMutations,
  observeUrlChanges,
} from '@/lib/runtime';
import { getExtensionState } from '@/lib/storage';
import { mountPanelRoot, unmountPanelRoot } from '@/lib/ui';

const PANEL_ID = 'chatgpt-outline';
const STORAGE_KEY = 'aiChatEnhancerState';
const PANEL_Z_INDEX = '1000';
const TOP_LAYER_CACHE_TTL_MS = 120;
const TOP_LAYER_SELECTOR = [
  '#modal-image-gen-lightbox',
  'dialog[open]',
  '[aria-modal="true"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(',');

interface OutlineState {
  items: ChatMessageOutlineItem[];
  activeId: string | null;
}

let currentState: OutlineState = {
  items: [],
  activeId: null,
};

let visibilityTracker: ReturnType<typeof createVisibleElementTracker> | null = null;
let cleanupPanelEvents: (() => void) | null = null;
let outlineOpen = false;
let topLayerCacheCheckedAt = 0;
let topLayerCacheResult = false;

function queryMessageElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-message-author-role]'),
  ).filter((element) => !element.closest('#ai-chat-enhancer-host'));
}

function getRoleFromElement(element: HTMLElement): ChatMessageOutlineItem['role'] {
  const role = element.getAttribute('data-message-author-role');
  if (role === 'user' || role === 'assistant' || role === 'system') {
    return role;
  }

  return 'assistant';
}

function summarizeText(text: string) {
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/展开收起/g, '')
    .trim();
  return normalized.slice(0, 72) || 'New question';
}

function extractMessageText(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll(
      [
        'button',
        '[role="button"]',
        '[aria-label]',
        'svg',
        '[data-testid*="copy"]',
        '[data-testid*="edit"]',
      ].join(','),
    )
    .forEach((node) => node.remove());

  return clone.textContent ?? '';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildOutlineItems(): { items: ChatMessageOutlineItem[]; userElements: HTMLElement[] } {
  const userElements: HTMLElement[] = [];
  const items: ChatMessageOutlineItem[] = [];

  queryMessageElements().forEach((element, index) => {
    const role = getRoleFromElement(element);
    if (role !== 'user') return;

    const id = element.dataset.aceOutlineId || `ace-user-message-${items.length + 1}`;
    element.dataset.aceOutlineId = id;
    element.id = id;
    userElements.push(element);

    items.push({
      id,
      role,
      title: summarizeText(extractMessageText(element)),
    });
  });

  return { items, userElements };
}

function scrollToMessage(messageId: string) {
  const element =
    document.querySelector<HTMLElement>(`[data-ace-outline-id="${CSS.escape(messageId)}"]`) ??
    document.getElementById(messageId);
  if (!element) return;

  const previousScrollMargin = element.style.scrollMarginTop;
  element.style.scrollMarginTop = '96px';
  element.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });

  window.setTimeout(() => {
    element.style.scrollMarginTop = previousScrollMargin;
  }, 700);
}

function isTextTruncated(title: HTMLElement) {
  return title.scrollWidth > title.clientWidth + 1;
}

function isVisibleTopLayerElement(element: Element) {
  if (element.closest('#ai-chat-enhancer-host')) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom <= 0 || rect.right <= 0) return false;
  if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  return true;
}

function rectCoversViewportCenter(rect: DOMRect) {
  return (
    rect.left <= window.innerWidth * 0.25 &&
    rect.right >= window.innerWidth * 0.75 &&
    rect.top <= window.innerHeight * 0.25 &&
    rect.bottom >= window.innerHeight * 0.75
  );
}

function isLikelyBlockingOverlay(element: Element) {
  if (!isVisibleTopLayerElement(element)) return false;

  const style = window.getComputedStyle(element);
  if (style.position !== 'fixed' && style.position !== 'absolute') return false;

  const rect = element.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  const elementArea = Math.min(rect.width, window.innerWidth) * Math.min(rect.height, window.innerHeight);
  const coversLargeArea = elementArea >= viewportArea * 0.35;

  return coversLargeArea && rectCoversViewportCenter(rect);
}

function isPageTopLayerActive() {
  const now = window.performance.now();
  if (now - topLayerCacheCheckedAt < TOP_LAYER_CACHE_TTL_MS) {
    return topLayerCacheResult;
  }

  topLayerCacheCheckedAt = now;
  topLayerCacheResult =
    Array.from(document.querySelectorAll(TOP_LAYER_SELECTOR)).some(isVisibleTopLayerElement) ||
    Array.from(document.body.querySelectorAll('*')).some(isLikelyBlockingOverlay);

  return topLayerCacheResult;
}

function renderPanelContent(mountNode: HTMLDivElement, state: OutlineState) {
  const tickMarkup = state.items
    .map((item, index) => {
      const isActive = item.id === state.activeId || (!state.activeId && index === 0);

      return `
        <button
          type="button"
          class="ace-outline-tick"
          data-message-id="${item.id}"
          data-active="${isActive ? 'true' : 'false'}"
          aria-label="${escapeHtml(item.title)}"
        ></button>
      `;
    })
    .join('');

  const listMarkup = state.items
    .map((item, index) => {
      const isActive = item.id === state.activeId || (!state.activeId && index === 0);

      return `
        <button
          type="button"
          class="ace-outline-entry"
          data-message-id="${item.id}"
          data-active="${isActive ? 'true' : 'false'}"
          data-tooltip="${escapeHtml(item.title)}"
        >
          <span class="ace-outline-entry-title">${escapeHtml(item.title)}</span>
          <span class="ace-outline-entry-mark"></span>
        </button>
      `;
    })
    .join('');
  mountNode.innerHTML = `
    <nav
      class="ace-outline-rail"
      data-open="${outlineOpen ? 'true' : 'false'}"
      data-suspended="${isPageTopLayerActive() ? 'true' : 'false'}"
      aria-label="Conversation outline"
    >
      <div class="ace-outline-hit" aria-hidden="true"></div>
      <div class="ace-outline-ticks">
        ${tickMarkup}
      </div>
      <div class="ace-outline-list">
        ${listMarkup}
      </div>
      <div class="ace-outline-tooltip" hidden></div>
    </nav>
  `;

  cleanupPanelEvents?.();
  cleanupPanelEvents = null;

  const rail = mountNode.querySelector<HTMLElement>('.ace-outline-rail');
  const tooltip = mountNode.querySelector<HTMLDivElement>('.ace-outline-tooltip');
  const hitArea = mountNode.querySelector<HTMLElement>('.ace-outline-hit');
  const outlineList = mountNode.querySelector<HTMLElement>('.ace-outline-list');
  let closeTimer: number | undefined;
  const blurOutlineFocus = () => {
    const rootNode = mountNode.getRootNode();
    const activeElement = rootNode instanceof ShadowRoot
      ? rootNode.activeElement
      : document.activeElement;

    if (activeElement instanceof HTMLElement && rail?.contains(activeElement)) {
      activeElement.blur();
    }
  };
  const setOpen = (open: boolean) => {
    if (outlineOpen === open) {
      if (!open) {
        blurOutlineFocus();
        if (tooltip) tooltip.hidden = true;
      }
      return;
    }
    outlineOpen = open;
    if (rail) rail.dataset.open = open ? 'true' : 'false';
    if (!open) {
      blurOutlineFocus();
      if (tooltip) tooltip.hidden = true;
    }
  };

  let tooltipTimer: number | undefined;
  let hoveredMessageId: string | undefined;
  const cancelClose = () => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    setOpen(false);
  };
  const cancelTooltip = () => {
    if (tooltipTimer) {
      window.clearTimeout(tooltipTimer);
      tooltipTimer = undefined;
    }
  };
  const hideTooltip = () => {
    cancelTooltip();
    hoveredMessageId = undefined;
    if (tooltip) tooltip.hidden = true;
  };
  const updateSuspendedState = () => {
    const suspended = isPageTopLayerActive();
    if (rail) rail.dataset.suspended = suspended ? 'true' : 'false';

    if (suspended) {
      setOpen(false);
      hideTooltip();
    }

    return suspended;
  };

  const handleClick = (event: MouseEvent) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-message-id]')
      : null;
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    const messageId = target.dataset.messageId;
    if (messageId) scrollToMessage(messageId);
    if (event.detail > 0) target.blur();
  };

  const containsPoint = (rect: DOMRect, x: number, y: number, padding = 0) => {
    return (
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding
    );
  };

  const handleDocumentPointerMove = (event: PointerEvent) => {
    if (!rail || !hitArea || !outlineList) return;
    if (updateSuspendedState()) return;

    const x = event.clientX;
    const y = event.clientY;
    const inTrigger = containsPoint(hitArea.getBoundingClientRect(), x, y, 10);
    const inOpenPanel = outlineOpen && containsPoint(outlineList.getBoundingClientRect(), x, y, 12);

    if (inTrigger || inOpenPanel) {
      cancelClose();
      setOpen(true);
      return;
    }

    if (outlineOpen) {
      scheduleClose();
    }
  };

  mountNode.addEventListener('click', handleClick);
  document.addEventListener('pointermove', handleDocumentPointerMove, true);
  window.addEventListener('blur', hideTooltip);
  updateSuspendedState();

  mountNode.querySelectorAll<HTMLButtonElement>('[data-message-id]').forEach((button) => {
    button.addEventListener('mouseenter', () => {
      if (!tooltip) return;

      const text = button.dataset.tooltip;
      if (!text) return;

      cancelTooltip();
      hoveredMessageId = button.dataset.messageId;
      tooltip.hidden = true;

      tooltipTimer = window.setTimeout(() => {
        tooltipTimer = undefined;
        if (hoveredMessageId !== button.dataset.messageId) return;
        if (!button.matches(':hover')) return;

        const title = button.querySelector<HTMLElement>('.ace-outline-entry-title');
        if (!title || !isTextTruncated(title)) {
          tooltip.hidden = true;
          return;
        }

        const railRect = mountNode
          .querySelector<HTMLElement>('.ace-outline-rail')
          ?.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        if (!railRect) return;

        tooltip.textContent = text;
        tooltip.style.top = `${titleRect.top - railRect.top + titleRect.height / 2}px`;
        tooltip.hidden = false;
      }, 1000);
    });

    button.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  });

  cleanupPanelEvents = () => {
    cancelClose();
    hideTooltip();
    mountNode.removeEventListener('click', handleClick);
    document.removeEventListener('pointermove', handleDocumentPointerMove, true);
    window.removeEventListener('blur', hideTooltip);
  };
}

function updateActiveItem(activeId: string | null) {
  currentState.activeId = activeId;

  const globalHost = document.getElementById('ai-chat-enhancer-host');
  const panelHost = globalHost?.querySelector(`[data-panel-id="${PANEL_ID}"]`);
  const shadowRoot = panelHost?.shadowRoot;
  if (!shadowRoot) return;

  shadowRoot.querySelectorAll<HTMLElement>('[data-message-id]').forEach((item) => {
    item.dataset.active = item.dataset.messageId === activeId ? 'true' : 'false';
  });

}

function unmountOutlinePanel() {
  cleanupPanelEvents?.();
  cleanupPanelEvents = null;
  visibilityTracker?.disconnect();
  visibilityTracker = null;
  outlineOpen = false;
  unmountPanelRoot(PANEL_ID);
}

function setupVisibilityTracking(userElements: HTMLElement[]) {
  visibilityTracker?.disconnect();
  visibilityTracker = null;

  if (!userElements.length) return;

  visibilityTracker = createVisibleElementTracker({
    rootMargin: '-18% 0px -62% 0px',
    onChange: (activeId) => {
      if (activeId && activeId !== currentState.activeId) {
        updateActiveItem(activeId);
      }
    },
  });

  userElements.forEach((element) => {
    if (element.id) visibilityTracker?.observe(element);
  });
}

async function renderChatGptPanel() {
  if (!isChatGptConversationPage()) {
    unmountOutlinePanel();
    return;
  }

  const state = await getExtensionState();
  if (!state.chatgpt.panelEnabled) {
    unmountOutlinePanel();
    return;
  }

  const { items, userElements } = buildOutlineItems();
  if (!items.length) {
    unmountOutlinePanel();
    return;
  }

  const { panelHost, mountNode } = mountPanelRoot(PANEL_ID);
  panelHost.style.position = 'fixed';
  panelHost.style.inset = '0';
  panelHost.style.zIndex = PANEL_Z_INDEX;
  panelHost.style.pointerEvents = 'none';

  currentState = {
    items,
    activeId: currentState.activeId && items.some((item) => item.id === currentState.activeId)
      ? currentState.activeId
      : items[0]?.id ?? null,
  };

  renderPanelContent(mountNode, currentState);
  setupVisibilityTracking(userElements);
}

export async function bootstrapChatGptExperience() {
  const rerender = createDebouncedTask(() => {
    void renderChatGptPanel();
  }, 150);

  const handleStorageChange = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'local' && STORAGE_KEY in changes) {
      void renderChatGptPanel();
    }
  };

  const stopMutationObserver = observeDocumentMutations(rerender, {
    ignoreSelector: '#ai-chat-enhancer-host',
  });
  const stopUrlObserver = observeUrlChanges(rerender);
  browser.storage.onChanged.addListener(handleStorageChange);

  void renderChatGptPanel();

  return () => {
    stopMutationObserver();
    stopUrlObserver();
    browser.storage.onChanged.removeListener(handleStorageChange);
    unmountOutlinePanel();
  };
}
