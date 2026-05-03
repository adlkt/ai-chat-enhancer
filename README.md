# AI Chat Enhancer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 简介

**AI Chat Enhancer** 是一款浏览器扩展，为 ChatGPT 和 DeepSeek 网页版聊天界面提供增强体验。当前功能聚焦于 **ChatGPT 对话阅读大纲**——在对话右侧显示消息列表，点击即可跳转到任意用户问题，极大提升长对话的浏览效率。

> 基于 [WXT](https://wxt.dev) + React 19 + TypeScript 构建。

---

## 功能特性

### ✅ ChatGPT — 对话大纲

- **刻度导轨（Tick rail）** — 右侧边缘的细长指示条，一眼看出滚动位置
- **悬停展开面板** — 鼠标靠近右侧边缘即可展开完整的消息列表
- **点击跳转** — 点击大纲中的任意用户消息，自动滚动到对应位置
- **滚动同步高亮** — 滚动对话时，当前消息自动高亮
- **一键开关** — 通过扩展弹窗即可开启或关闭大纲面板
- **Shadow DOM 隔离** — 注入的 UI 组件与 ChatGPT 页面样式完全隔离，不冲突

### 🚧 DeepSeek（开发中）

- 基于分组的会话管理基础设施已就位
- UI 集成尚未实现

---

## 安装

### 从源码构建

```bash
git clone https://github.com/adlkt/ai-chat-enhancer.git
cd ai-chat-enhancer
pnpm install
pnpm build
```

构建产物在 `.output/` 目录。在浏览器中加载解压后的扩展：

1. 打开 `chrome://extensions`
2. 启用 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `.output/chrome-mv3/` 目录

### 从商店安装

> 即将上线 — 尚未发布到 Chrome Web Store 或 Firefox Add-ons。

---

## 开发

```bash
pnpm dev          # Chromium（热重载）
pnpm dev:firefox  # Firefox（热重载）
```

扩展的内容脚本运行在 `chatgpt.com/*` 和 `chat.deepseek.com/*`。打开 ChatGPT，即可在页面右侧看到大纲面板。

### 构建与打包

```bash
pnpm build              # Chromium 生产构建
pnpm build:firefox      # Firefox 生产构建
pnpm zip                # 生成 Chrome 发布包
pnpm zip:firefox        # 生成 Firefox 发布包
pnpm compile            # 类型检查（不输出文件）
```

---

## 项目结构

```
src/
├── entrypoints/
│   ├── background.ts          # Service Worker — 初始化存储
│   ├── chatgpt.content.ts     # ChatGPT 内容脚本入口
│   ├── deepseek.content.ts    # DeepSeek 内容脚本入口
│   └── popup/                 # 扩展弹窗 (React)
├── lib/
│   ├── chatgpt.ts             # ChatGPT 大纲核心逻辑
│   ├── deepseek.ts            # DeepSeek 集成（占位）
│   ├── runtime.ts             # DOM 工具（防抖、Observer、URL 监听）
│   ├── storage.ts             # browser.storage.local 封装
│   ├── types.ts               # 共享类型定义
│   └── ui.ts                  # Shadow DOM 面板 + 样式
├── public/                    # 扩展图标
└── wxt.config.ts              # WXT 配置
```

---

## 技术栈

| 层级 | 工具 |
|---|---|
| 扩展框架 | [WXT](https://wxt.dev) |
| UI | React 19 |
| 语言 | TypeScript |
| 样式 | CSS (Shadow DOM) |
| 存储 | WebExtensions Storage API |

---

## 许可证

MIT

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
pnpm zip                # Create release ZIP for Chrome
pnpm zip:firefox        # Create release ZIP for Firefox
pnpm compile            # Type-check without emitting
```

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
