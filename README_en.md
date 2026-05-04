# AI Chat Enhancer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Language:** [中文](README.md) | **English**

---

## Overview

**AI Chat Enhancer** is a browser extension that enhances the ChatGPT and DeepSeek web chat experience. Currently features a **conversation outline sidebar** for ChatGPT — navigate long threads by jumping between user messages with a single click.

> Built with [WXT](https://wxt.dev) + React 19 + TypeScript.

---

## Features

### ✅ ChatGPT — Conversation Outline

- **Tick rail** — a thin indicator strip on the right edge shows the scroll position at a glance
- **Hover-to-open panel** — move the cursor near the right edge to reveal the full message list
- **Click to jump** — any user message in the outline scrolls the conversation to that point
- **Scroll-sync highlighting** — the active message is highlighted as you scroll
- **Toggle on/off** — enable or disable the panel from the extension popup
- **Shadow DOM isolation** — the injected UI is scoped and won't clash with ChatGPT's styles

### 🚧 DeepSeek (WIP)

- Infrastructure for group-based thread management is in place
- UI integration is not yet implemented

---

## Installation

### From source

```bash
git clone https://github.com/adlkt/ai-chat-enhancer.git
cd ai-chat-enhancer
pnpm install
pnpm build
```

The built extension will be in the `.output/` directory. Load the unpacked extension in your browser:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder

### From stores

> Coming soon — not yet published to the Chrome Web Store or Firefox Add-ons.

---

## Development

```bash
pnpm dev          # Chromium (hot reload)
pnpm dev:firefox  # Firefox (hot reload)
```

The extension's content script runs on `chatgpt.com/*` and `chat.deepseek.com/*`. Open ChatGPT in your browser to see the outline panel appear on the right side.

### Build & package

```bash
pnpm build              # Chromium production build
pnpm build:firefox      # Firefox production build
pnpm zip                # Create the recommended Chrome release ZIP
pnpm zip:firefox        # Create release ZIP for Firefox
pnpm crx                # Create a Chrome CRX package; Chrome stable usually blocks external installs
pnpm compile            # Type-check without emitting
```

For normal Chrome stable installation, download `.output/ai-chat-enhancer-0.0.0-chrome.zip`, unzip it, open `chrome://extensions`, enable Developer mode, then choose "Load unpacked". Chrome stable usually rejects locally packed `.crx` files with `CRX_REQUIRED_PROOF_MISSING`.

`pnpm crx` writes `.output/ai-chat-enhancer-0.0.0-chrome.crx`. The first run creates the packing key at `.output/crx-key.pem`; reuse the same key for future releases, otherwise the extension ID will change. This CRX is mainly for Chromium-compatible environments that allow external CRX installation.

---

## Project structure

```
src/
├── entrypoints/
│   ├── background.ts          # Service worker — initializes storage
│   ├── chatgpt.content.ts     # ChatGPT content script entry
│   ├── deepseek.content.ts    # DeepSeek content script entry
│   └── popup/                 # Extension popup (React)
├── lib/
│   ├── chatgpt.ts             # Core ChatGPT outline logic
│   ├── deepseek.ts            # DeepSeek integration (stub)
│   ├── runtime.ts             # DOM utilities (debounce, Observer, URL watcher)
│   ├── storage.ts             # browser.storage.local wrapper
│   ├── types.ts               # Shared type definitions
│   └── ui.ts                  # Shadow DOM panel + styles
├── public/                    # Extension icons
└── wxt.config.ts              # WXT configuration
```

---

## Tech stack

| Layer | Tool |
|---|---|
| Extension framework | [WXT](https://wxt.dev) |
| UI | React 19 |
| Language | TypeScript |
| Styling | CSS (Shadow DOM) |
| Storage | WebExtensions Storage API |

---

## License

MIT
