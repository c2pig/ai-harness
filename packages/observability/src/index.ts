export {
  buildHarnessStructuredRecord,
  harnessStructuredLogLine,
  type BuildHarnessRecordInput,
} from "./harnessStructuredLog.js";
export {
  CloudWatchLogSink,
  type CloudWatchLogSinkOptions,
} from "./cloudWatchLogSink.js";
export { emitHarnessLog, type LoggerLike } from "./dualEmit.js";
