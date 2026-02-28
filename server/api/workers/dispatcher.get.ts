import { runNotificationDispatcher } from '../../utils/workers';

export default defineEventHandler(async (event) => {
  return await runNotificationDispatcher();
});
