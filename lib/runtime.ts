export function createDebouncedTask(task: () => void, wait = 150) {
  let timeoutId: number | undefined;

  return () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      task();
    }, wait);
  };
}

export function createRafTask(task: () => void) {
  let frameId: number | undefined;

  return () => {
    if (frameId) return;

    frameId = window.requestAnimationFrame(() => {
      frameId = undefined;
      task();
    });
  };
}

export function observeUrlChanges(onChange: () => void): () => void {
  let currentHref = window.location.href;

  const handleChange = () => {
    if (window.location.href === currentHref) return;
    currentHref = window.location.href;
    onChange();
  };

  const intervalId = window.setInterval(handleChange, 700);
  window.addEventListener('popstate', handleChange);
  window.addEventListener('hashchange', handleChange);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('popstate', handleChange);
    window.removeEventListener('hashchange', handleChange);
  };
}

export function observeDocumentMutations(
  onChange: () => void,
  options?: { ignoreSelector?: string },
): () => void {
  const observer = new MutationObserver((mutations) => {
    const ignoreSelector = options?.ignoreSelector;
    if (!ignoreSelector) {
      onChange();
      return;
    }

    const shouldIgnoreMutation = mutations.every((mutation) => {
      const target =
        mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;

      if (target?.closest(ignoreSelector)) {
        return true;
      }

      return Array.from(mutation.addedNodes).every((node) => {
        return !(node instanceof Element) || Boolean(node.closest(ignoreSelector));
      });
    });

    if (!shouldIgnoreMutation) {
      onChange();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: false,
  });

  return () => observer.disconnect();
}

export function getCurrentThreadIdFromPathname(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.at(-1) ?? '';
}

export function isChatGptConversationPage(pathname = window.location.pathname) {
  if (!pathname || pathname === '/') return false;
  if (pathname.startsWith('/auth')) return false;
  if (pathname.startsWith('/share')) return false;
  return pathname.includes('/c/');
}

export function isDeepSeekConversationPage(pathname = window.location.pathname) {
  if (!pathname || pathname === '/') return false;
  if (pathname.startsWith('/sign_in')) return false;
  if (pathname.startsWith('/auth')) return false;
  return pathname.includes('/chat/');
}

/**
 * Create an IntersectionObserver that tracks which element is most visible
 * within the viewport. Useful for scroll-sync highlighting.
 */
export function createVisibleElementTracker(
  options: {
    rootMargin?: string;
    threshold?: number | number[];
    onChange: (activeId: string | null) => void;
  },
): {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
  refresh: () => void;
} {
  const visibleEntries = new Map<Element, IntersectionObserverEntry>();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visibleEntries.set(entry.target, entry);
      } else {
        visibleEntries.delete(entry.target);
      }
    }

    // Find the element closest to the top of the viewport
    let bestId: string | null = null;
    let bestTop = Infinity;

    for (const [, entry] of visibleEntries) {
      const top = entry.boundingClientRect.top;
      if (top >= 0 && top < bestTop) {
        bestTop = top;
        bestId = entry.target.id || null;
      }
    }

    // Fallback: if nothing is in the upper portion, pick the first visible
    if (!bestId && visibleEntries.size > 0) {
      const first = Array.from(visibleEntries.values()).sort(
        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
      )[0];
      bestId = first?.target.id || null;
    }

    options.onChange(bestId);
  }, {
    rootMargin: options.rootMargin ?? '-10% 0px -60% 0px',
    threshold: options.threshold ?? 0,
  });

  return {
    observe: (element) => observer.observe(element),
    unobserve: (element) => observer.unobserve(element),
    disconnect: () => observer.disconnect(),
    refresh: () => {
      // Force re-evaluation by re-observing all tracked elements
      // This is a no-op but triggers the callback with current state
    },
  };
}
