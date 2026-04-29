import { runTrendWorker } from "../utils/trend-worker.js";

export default defineTask({
  async run({ payload: _payload, context: _context }) {
    const result = await runTrendWorker();
    console.log("Trend worker result:", result);
    return { result };
  },
});
