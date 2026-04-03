import type { HarnessStructuredLogRecord } from "@agent-harness/contracts";
import { harnessStructuredLogLine } from "./harnessStructuredLog.js";
import type { CloudWatchLogSink } from "./cloudWatchLogSink.js";

export interface LoggerLike {
  info: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
}

/**
 * Emit structured record to pino-like logger and optional CloudWatch sink.
 */
export async function emitHarnessLog(
  logger: LoggerLike,
  record: HarnessStructuredLogRecord,
  cwSink: CloudWatchLogSink | null,
): Promise<void> {
  logger.info(record as Record<string, unknown>, record.msg);
  if (cwSink) {
    try {
      await cwSink.emitJsonLine(harnessStructuredLogLine(record));
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        "[harness] CloudWatch sink failed",
      );
    }
  }
}
