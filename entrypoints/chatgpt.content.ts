import { bootstrapChatGptExperience } from '@/lib/chatgpt';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  async main() {
    await bootstrapChatGptExperience();
  },
});
