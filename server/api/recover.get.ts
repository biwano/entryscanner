import { runRecoverWorker } from "../utils/recover-worker.js";

export default defineEventHandler(async (event) => {
  return await runRecoverWorker();
});
