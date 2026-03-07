import { runTrendWorker } from "../../utils/trend-worker";

export default defineEventHandler(async (event) => {
  return await runTrendWorker();
});
