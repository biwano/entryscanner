import { runTrendWorker } from "../../utils/trend-worker.js";

export default defineEventHandler(async (event) => {
  return await runTrendWorker();
});
