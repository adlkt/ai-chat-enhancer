import { ensureDefaultState } from '@/lib/storage';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void ensureDefaultState();
  });

  browser.runtime.onStartup.addListener(() => {
    void ensureDefaultState();
  });
});
