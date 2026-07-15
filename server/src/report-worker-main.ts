import { loadReportWorkerConfig, ScheduledReportWorker } from './report-worker/worker';

async function bootstrap() {
  const worker = new ScheduledReportWorker(loadReportWorkerConfig());
  process.once('SIGTERM', () => worker.stop('SIGTERM'));
  process.once('SIGINT', () => worker.stop('SIGINT'));
  await worker.run();
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    event: 'report_worker_boot_failed',
    error: message,
  }));
  process.exitCode = 1;
});
