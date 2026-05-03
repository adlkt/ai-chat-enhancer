import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Chat Enhancer',
    description: 'Adds navigation and organization features to ChatGPT and DeepSeek web apps.',
    permissions: ['storage'],
    action: {
      default_title: 'AI Chat Enhancer',
    },
  },
  webExt: {
    disabled: true
  }
});
