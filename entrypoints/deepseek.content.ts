import { bootstrapDeepSeekExperience } from '@/lib/deepseek';

export default defineContentScript({
  matches: ['https://chat.deepseek.com/*'],
  runAt: 'document_idle',
  main() {
    bootstrapDeepSeekExperience();
  },
});
