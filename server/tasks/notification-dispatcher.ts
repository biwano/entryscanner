import { runNotificationDispatcher } from '../utils/workers';

export default defineTask({
  async run({ payload, context }) {
    const result = await runNotificationDispatcher();
    return { result };
  }
});
