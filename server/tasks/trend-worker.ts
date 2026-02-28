import { runTrendWorker } from "../utils/trend-worker";

export default defineTask({
  async run({ payload, context }) {
    const result = await runTrendWorker();
    console.log("Trend worker result:", result);
    return { result };
  },
});
