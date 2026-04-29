import { runNotificationDispatcher } from '../../utils/notification-dispatcher.js';

export default defineEventHandler(async (_event) => {
  return await runNotificationDispatcher();
});
