import { runNotificationDispatcher } from '../../utils/notification-dispatcher.js';

export default defineEventHandler(async (event) => {
  return await runNotificationDispatcher();
});
