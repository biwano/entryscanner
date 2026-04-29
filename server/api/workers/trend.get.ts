import { runTrendWorker } from "../../utils/trend-worker.js";

export default defineEventHandler(async (_event) => {
  return await runTrendWorker();
});
