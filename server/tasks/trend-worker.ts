import { runTrendWorker } from '../utils/workers';

export default defineTask({
  async run({ payload, context }) {
    const result = await runTrendWorker();
    return { result };
  }
});
