import { runNotificationDispatcher } from "../utils/notification-dispatcher.js";

export default defineTask({
  async run({ payload: _payload, context: _context }) {
    const result = await runNotificationDispatcher();
    console.info("Notification dispatcher result:", result);
    return { result };
  },
});
