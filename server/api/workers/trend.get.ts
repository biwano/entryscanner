import { runTrendWorker } from '../../utils/workers';

export default defineEventHandler(async (event) => {
  return await runTrendWorker();
});
