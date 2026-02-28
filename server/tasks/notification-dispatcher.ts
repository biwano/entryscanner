import { runNotificationDispatcher } from "../utils/notification-dispatcher";

export default defineTask({
  async run({ payload, context }) {
    const result = await runNotificationDispatcher();
    console.log("Notification dispatcher result:", result);
    return { result };
  },
});
