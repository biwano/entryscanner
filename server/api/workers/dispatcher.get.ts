import { runNotificationDispatcher } from '../../utils/notification-dispatcher';

export default defineEventHandler(async (event) => {
  return await runNotificationDispatcher();
});
