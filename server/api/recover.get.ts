import { runRecoverWorker } from "../utils/recover-worker.js";

export default defineEventHandler(async (_event) => {
  return await runRecoverWorker();
});
