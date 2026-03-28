import { runStatsWorker } from "../utils/stats-worker.js";

export default defineEventHandler(async () => {
  return await runStatsWorker();
});
